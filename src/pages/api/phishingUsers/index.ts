import type { APIRoute } from "astro";
import { app } from "@/firebase/server";
import { getFirestore } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { PhishingUserSchema } from "@/lib/typesValidator";

const db = getFirestore(app);
const phishingUsersRef = db.collection("phishingUsers");

export const POST: APIRoute = async ({ request }) => {
  try {
    // Validar cabecera JSON
    if (request.headers.get("content-type") !== "application/json") {
      return new Response(JSON.stringify({ error: "Requiere application/json" }), { status: 400 });
    }

    const usersBatch: [{ name: string, email: string }] = await request.json();

    // Validar estructura de datos
    if (!Array.isArray(usersBatch)) {
      return new Response(JSON.stringify({ error: "Formato de request inválido" }), { status: 400 });
    }

    const validUsers = usersBatch.filter(user =>
      typeof user === 'object' &&
      user.name &&
      user.email &&
      typeof user.name === 'string' &&
      typeof user.email === 'string'
    );

    if (validUsers.length === 0) {
      return new Response(JSON.stringify({ error: "No valid users found in the batch" }), { status: 400 });
    }

    const batch = db.batch();
    const createdUsers: string[] = [];

    for (const userInput of usersBatch) {
      const userId = uuidv4();

      // Proporcionar valores por defecto para status y metadata
      const newUser = PhishingUserSchema.parse({
        id: userId,
        name: userInput.name.trim(),
        email: userInput.email.trim(),
        status: {
          emailSended: false,
          emailOpened: false,
          linkClicked: false,
          formSubmitted: false,
          emailOpenedAt: null,
          firstClickAt: null,
          lastClickAt: null
        },
        metadata: {
          ip: "unknown",
          userAgent: "unknown",
          geolocation: {
            lat: 0,
            lon: 0,
            city: "unknown",
            country: "unknown"
          },
          device: {
            os: "unknown",
            browser: "unknown",
            screenResolution: "unknown"
          },
          referralSource: "unknown"
        }
      });

      const userRef = phishingUsersRef.doc(userId);
      batch.create(userRef, newUser);
      createdUsers.push(userId);
    }

    await batch.commit();

    return new Response(JSON.stringify({
      success: true,
      created: createdUsers.length,
      ids: createdUsers
    }), { status: 201 });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { userIds } = await request.json();

    // Validación básica
    if (!userIds && userIds !== undefined) {
      return new Response(JSON.stringify({ error: "Datos inválidos" }), {
        status: 400,
      });
    }

    let deleteResult;

    if (userIds && Array.isArray(userIds)) {
      // Eliminar usuarios seleccionados
      const batch = db.batch();
      const usersToDelete = await phishingUsersRef.where('id', 'in', userIds).get();

      if (usersToDelete.empty) {
        return new Response(JSON.stringify({ error: "Usuarios no encontrados" }), {
          status: 404,
        });
      }

      usersToDelete.forEach(doc => {
        batch.delete(doc.ref);
      });

      deleteResult = await batch.commit();
    } else {
      // Eliminar todos los usuarios
      const allUsers = await phishingUsersRef.get();

      if (allUsers.empty) {
        return new Response(JSON.stringify({ error: "No hay usuarios para eliminar" }), {
          status: 404,
        });
      }

      const batch = db.batch();
      allUsers.forEach(doc => {
        batch.delete(doc.ref);
      });

      deleteResult = await batch.commit();
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: deleteResult.length,
      }),
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error en DELETE:", error);
    return new Response(
      JSON.stringify({
        error: "Error en el servidor al eliminar usuarios",
        details: error.message,
      }),
      { status: 500 }
    );
  }
};