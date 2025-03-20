import { app } from "@/firebase/server";
import type { APIRoute } from "astro";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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

    if (status === "clicked") {
      await userRef.update({
        clickCount: FieldValue.increment(1),
      });
    }

    // Actualizar solo los campos específicos sin afectar otros campos
    const updateData: Record<string, any> = {};

    if (status === "submit") {
      updateData["status.formSubmitted"] = true;
    } else if (status === "clicked") {
      updateData["status.linkClicked"] = true;
    } else if (status === "opened") {
      updateData["status.emailOpened"] = true;
    } else if (status === "sent") {
      updateData["status.emailSended"] = true;
    }

    if (Object.keys(updateData).length > 0) {
      await userRef.update(updateData);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error en servidor" }), {
      status: 500,
    });
  }
};
