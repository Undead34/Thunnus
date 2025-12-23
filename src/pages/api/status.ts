import { app } from "@/firebase/server";
import type { APIRoute } from "astro";
import { getFirestore } from "firebase-admin/firestore";
import { getTrackingMetadata, logTrackingEvent, type EventType } from "@/lib/tracking";

const db = getFirestore(app);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const {
      client_id,
      status,
    }: { client_id: string; status: "submit" | "clicked" | "opened" | "sent" } =
      await request.json();

    // Map legacy status strings to EventType
    const statusMap: Record<string, EventType> = {
      "submit": "SUBMIT",
      "clicked": "CLICKED",
      "opened": "OPENED",
      "sent": "SENT"
    };

    const eventType = statusMap[status];

    if (!eventType) {
      return new Response(JSON.stringify({ error: "Invalid status" }), { status: 400 });
    }

    // Verify user exists first
    const userRef = db.collection("phishingUsers").doc(client_id);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
      });
    }

    const metadata = await getTrackingMetadata(request.headers, clientAddress);
    await logTrackingEvent(db, client_id, eventType, metadata);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error en servidor" }), {
      status: 500,
    });
  }
};
