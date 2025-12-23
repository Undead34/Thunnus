import type { APIRoute } from "astro";
import { app } from "@/firebase/server";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(app);
const settingsRef = db.collection("settings");

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { clientId, tenantId, refreshToken } = data;

        // Basic validation (optional, can be more strict)
        // We allow empty strings if user wants to clear them, or maybe we assume they are sending valid updates.

        await settingsRef.doc("ms-graph").set({
            clientId,
            tenantId,
            refreshToken, // Optional: might be sensitive, but needed for the seeding logic
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error) {
        console.error("Error saving Microsoft settings:", error);
        return new Response(
            JSON.stringify({ error: "Server error" }),
            { status: 500 }
        );
    }
};

export const GET: APIRoute = async () => {
    try {
        const doc = await settingsRef.doc("ms-graph").get();
        if (!doc.exists) {
            return new Response(JSON.stringify({}), { status: 200 });
        }
        return new Response(JSON.stringify(doc.data()), { status: 200 });
    } catch (error) {
        console.error("Error fetching Microsoft settings:", error);
        return new Response(
            JSON.stringify({ error: "Server error" }),
            { status: 500 }
        );
    }
};
