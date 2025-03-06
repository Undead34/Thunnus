import type { APIRoute } from "astro";
import { app } from "@/firebase/server";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(app);

export const POST: APIRoute = async ({ request }) => {
    try {
        let data = await request.json()

        await db.collection("emailJobs").add({
            userIds: ["uid1", "uid2", "uid3"],
            subject: "¡Oferta especial!",
            htmlTemplate: "<p>Hola {{name}}, tu código es: <strong>{{code}}</strong></p>",
            status: "pending"
        });

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Error en servidor" }),
            { status: 500 }
        );
    }
};
