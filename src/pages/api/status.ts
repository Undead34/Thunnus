import { app } from "@/firebase/server";
import type { APIRoute } from "astro";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore(app);

export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      client_id,
      status,
    }: { client_id: string; status: "submit" | "clicked" | "opened" | "sent" } =
      await request.json();

    const userRef = db.collection("phishingUsers").doc(client_id);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
      });
    }

    await userRef.set(
      {
        status: {
          formSubmitted: status === "submit",
          linkClicked: status === "clicked",
          emailOpened: status === "opened",
          emailSended: status === "sent",
        },
      },
      { merge: true }
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error en servidor" }), {
      status: 500,
    });
  }
};
