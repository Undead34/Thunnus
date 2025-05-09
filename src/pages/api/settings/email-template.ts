import { getFirestore } from "firebase-admin/firestore";
import { type APIRoute } from "astro";
import { app } from "@/firebase/server";

export const POST: APIRoute = async ({ request }) => {
    const data = await request.json();
    const templateId = data?.selected;

    if (!templateId) {
        return new Response(
            JSON.stringify({ error: "ID de plantilla requerido" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    try {
        const db = getFirestore(app);
        const settingsRef = db.collection("settings").doc("email-template");
        await settingsRef.set({ value: templateId }, { merge: true });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error guardando plantilla:", error);
        return new Response(
            JSON.stringify({ error: "Error interno del servidor" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
};