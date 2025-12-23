import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { app } from "@/firebase/server";
import type { APIRoute } from "astro";

const db = getFirestore(app);

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { userIds, tags, action } = data; // action: "add" | "remove" | "set"

        if (!userIds || !Array.isArray(userIds) || !tags || !Array.isArray(tags)) {
            return new Response(JSON.stringify({ error: "Invalid data" }), {
                status: 400,
            });
        }

        const batch = db.batch();
        const usersRef = db.collection("phishingUsers");

        userIds.forEach((id: string) => {
            const docRef = usersRef.doc(id);
            if (action === "remove") {
                batch.update(docRef, {
                    tags: FieldValue.arrayRemove(...tags),
                });
            } else {
                // "add" is default
                batch.update(docRef, {
                    tags: FieldValue.arrayUnion(...tags),
                });
            }
        });

        await batch.commit();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
        });
    }
};
