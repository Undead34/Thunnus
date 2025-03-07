import type { APIRoute } from "astro";
import { experimental_AstroContainer } from "astro/container";

import { getFirestore } from "firebase-admin/firestore";

import { sendEmail } from "@/lib/email";
import { app } from "@/firebase/server";

import EmailTemplate from "@/emails/EmailTemplate.astro";

import type { PhishingUser, SMTP } from "@/types";


const db = getFirestore(app);

export const POST: APIRoute = async ({ request }) => {
    try {
        // 1. Obtener usuarios desde Firebase
        const phishingUsersSnapshot = await db.collection("phishingUsers").get();
        const users: PhishingUser[] = phishingUsersSnapshot.docs.map(doc => doc.data() as PhishingUser);

        // 2. Obtener configuración SMTP
        const smtpDoc = await db.collection("settings").doc("smtp").get();
        const smtp = smtpDoc.data() as SMTP;

        const container = await experimental_AstroContainer.create();

        // 3. Enviar correos en segundo plano
        users.map(async (user) => {
            try {
                let name = user.email;
                const htmlContent = await container.renderToString(EmailTemplate, { props: { name, customData: "Hiii" } });

                // Enviar correo
                sendEmail({
                    to: user.email,
                    subject: "¡Tu asunto aquí!",
                    html: htmlContent,
                    smtp: smtp
                }).then((result) => {
                    console.log(result);
                }).catch((err) => {
                    console.error(err);
                });

                console.log(`Correo enviado a: ${user.email}`);
            } catch (error) {
                console.error(`Error enviando a ${user.email}:`, error);
            }
        });

        // 4. Retornar respuesta inmediata (no esperar a que terminen)
        return new Response(JSON.stringify({
            success: true,
            message: "Procesando envío masivo en segundo plano"
        }), { status: 202 });
    } catch (error: any) {
        return new Response(JSON.stringify({
            error: "Error al procesar la solicitud",
            details: error.message
        }), { status: 500 });
    }
};
