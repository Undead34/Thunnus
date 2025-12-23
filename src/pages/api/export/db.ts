import type { APIRoute } from "astro";
import { app } from "@/firebase/server";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(app);

export const GET: APIRoute = async ({ request }) => {
    try {
        const url = new URL(request.url);
        const collectionsParam = url.searchParams.get("collections");

        if (!collectionsParam) {
            return new Response(
                JSON.stringify({ error: "No collections specified" }),
                { status: 400 }
            );
        }

        const collections = collectionsParam.split(",");
        const allowedCollections = ["phishingUsers", "events", "batches", "settings"];
        const exportData: Record<string, any[]> = {};

        for (const col of collections) {
            if (!allowedCollections.includes(col.trim())) continue;

            const snapshot = await db.collection(col.trim()).get();
            exportData[col.trim()] = snapshot.docs.map(doc => ({
                _id: doc.id,
                ...doc.data()
            }));
        }

        return new Response(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="thunnus-export-${new Date().toISOString()}.json"`
            }
        });

    } catch (error) {
        console.error("Export error:", error);
        return new Response(
            JSON.stringify({ error: "Server error during export" }),
            { status: 500 }
        );
    }
};
