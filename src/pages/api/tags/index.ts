import { getFirestore } from "firebase-admin/firestore";
import { app } from "@/firebase/server";
import type { APIRoute } from "astro";
import type { PhishingUser } from "@/types";

const db = getFirestore(app);

export const GET: APIRoute = async () => {
    try {
        const snapshot = await db.collection("phishingUsers").select("tags").get();
        const tagsSet = new Set<string>();

        snapshot.docs.forEach((doc) => {
            const data = doc.data() as Pick<PhishingUser, "tags">;
            if (data.tags && Array.isArray(data.tags)) {
                data.tags.forEach((tag) => tagsSet.add(tag));
            }
        });

        return new Response(JSON.stringify(Array.from(tagsSet)), { status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
        });
    }
};
