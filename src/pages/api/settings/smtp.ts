import type { APIRoute } from "astro";
import { app } from "@/firebase/server";
import { getFirestore } from "firebase-admin/firestore";
import type { SMTP } from "@/types";

const db = getFirestore(app);
const settingsRef = db.collection("settings");

// Función para validar los campos del SMTP
function validateSMTP(data: Partial<SMTP>): data is SMTP {
    return (
        typeof data.host === "string" && data.host.trim() !== "" &&
        typeof data.port === "number" && data.port > 0 &&
        typeof data.secure === "boolean" &&
        typeof data.auth?.user === "string" && data.auth.user.trim() !== "" &&
        typeof data.auth?.pass === "string" && data.auth.pass.trim() !== ""
    );
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const data: Partial<SMTP> = await request.json();
        
        // Validar que los campos no estén vacíos
        if (!validateSMTP(data)) {
            return new Response(
                JSON.stringify({ error: "Faltan campos obligatorios o son inválidos" }),
                { status: 400 }
            );
        }

        const smtpRef = settingsRef.doc("smtp");
        await smtpRef.set(data, { merge: true });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Error en servidor" }),
            { status: 500 }
        );
    }
};

export const GET: APIRoute = async () => {
    try {
        const smtpRef = settingsRef.doc("smtp");
        const smtpDoc = await smtpRef.get();

        if (!smtpDoc.exists) {
            return new Response(
                JSON.stringify({ error: "Configuración SMTP no encontrada" }),
                { status: 404 }
            );
        }

        const smtpData = smtpDoc.data() as SMTP;

        // Validar que los campos no estén vacíos antes de devolverlos
        if (!validateSMTP(smtpData)) {
            return new Response(
                JSON.stringify({ error: "Configuración SMTP incompleta o inválida" }),
                { status: 400 }
            );
        }

        return new Response(JSON.stringify(smtpData), { status: 200 });

    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Error en servidor" }),
            { status: 500 }
        );
    }
};