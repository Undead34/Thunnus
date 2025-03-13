import type { APIRoute } from "astro";

import { experimental_AstroContainer } from "astro/container";
import { getFirestore } from "firebase-admin/firestore";
import { app } from "@/firebase/server";

import { sendEmail } from "@/lib/email";
import { createBatch, updateBatchProgress } from "@/lib/batches";
import EmailTemplate from "@/emails/EmailTemplate.astro";

import type { PhishingUser, SMTP } from "@/types";

const db = getFirestore(app);
const CONCURRENCY_LIMIT = 5; // Emails en paralelo

async function sendMail(user: PhishingUser, container: experimental_AstroContainer, smtp: SMTP, batchId: string) {
    try {
        const htmlContent = await container.renderToString(EmailTemplate, {
            props: { name: user.email, customData: "Hiii" }
        });

        await sendEmail({
            to: user.email,
            subject: "¡Tu asunto aquí!",
            html: htmlContent,
            smtp: smtp
        });

        await db.collection("phishingUsers").doc(user.id).update({
            "status.emailSended": true
        });

        await updateBatchProgress(batchId, true);
    } catch (error: any) {
        await db.collection("phishingUsers").doc(user.id).update({
            "status.emailSended": false,
            "status.emailError": error.message
        });

        await updateBatchProgress(batchId, false, {
            userId: user.id,
            message: error.message
        });
    }
}

export const POST: APIRoute = async ({ request }) => {
    try {
        // 1. Obtener parámetros
        const { userIds } = await request.json();

        // 2. Obtener usuarios
        let usersQuery;
        if (userIds?.length > 0) {
            usersQuery = await db.collection("phishingUsers")
                .where("id", "in", userIds)
                .get();
        } else {
            usersQuery = await db.collection("phishingUsers").get();
        }

        const users = usersQuery.docs.map(doc => doc.data() as PhishingUser);
        if (users.length === 0) throw new Error("No users found");

        // 3. Crear lote
        const batchId = await createBatch(users.map(u => u.id));

        // 4. Obtener configuración SMTP
        const smtpDoc = await db.collection("settings").doc("smtp").get();
        const smtp = smtpDoc.data() as SMTP;
        const container = await experimental_AstroContainer.create();

        // 5. Procesar en background con límite de concurrencia
        (async () => {
            const queue = [...users];

            // Actualizar estado del lote
            await db.collection("batches").doc(batchId).update({
                status: "processing"
            });

            // Procesar en chunks
            while (queue.length > 0) {
                const chunk = queue.splice(0, CONCURRENCY_LIMIT);
                await Promise.all(
                    chunk.map(user =>
                        sendMail(user, container, smtp, batchId)
                    )
                );
            }

            // Marcar lote como completado
            await db.collection("batches").doc(batchId).update({
                status: "completed"
            });
        })();

        return new Response(JSON.stringify({
            batchId,
            message: "Batch processing started",
            _links: {
                status: `/api/batches/${batchId}`
            }
        }), { status: 202 });

    } catch (error: any) {
        return new Response(JSON.stringify({
            error: "Error processing request",
            details: error.message
        }), { status: 500 });
    }
};