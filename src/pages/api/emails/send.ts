import type { APIRoute } from "astro";
import { experimental_AstroContainer } from "astro/container";
import { getFirestore } from "firebase-admin/firestore";
import { app } from "@/firebase/server";
import { sendEmail } from "@/lib/email";
import { createBatch, updateBatchProgress } from "@/lib/batches";
import EmailTemplate from "@/emails/EmailTemplate.astro";
import type { PhishingUser, SMTP } from "@/types";

const db = getFirestore(app);
const CONCURRENCY_LIMIT = 5;

async function sendMail(
  user: PhishingUser,
  container: experimental_AstroContainer,
  smtp: SMTP,
  batchId: string,
  url: URL
) {
  try {
    const link = new URL("", url.origin);
    link.searchParams.append("client_id", user.id);

    const htmlContent = await container.renderToString(EmailTemplate, {
      props: {
        name: user.email,
        link: link.toString(),
        trackingPixelUrl: url.origin + "/tracking-pixel.png?client_id=" + user.id,
      },
    });

    await sendEmail({
      to: user.email,
      subject: "¡Tu asunto aquí!",
      html: htmlContent,
      smtp: smtp,
    });

    await db.collection("phishingUsers").doc(user.id).update({
      "status.emailSended": true,
    });

    await updateBatchProgress(batchId, true);
  } catch (error: any) {
    await db.collection("phishingUsers").doc(user.id).update({
      "status.emailSended": false,
      "status.emailError": error.message,
    });

    await updateBatchProgress(batchId, false, {
      userId: user.id,
      message: error.message,
    });
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    // 1. Validar y parsear el cuerpo de la solicitud
    const data = await request.json();

    // Validar que el cuerpo sea un objeto
    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({
          error:
            "Formato inválido: se requiere un objeto con { userIds?: string[] }",
        }),
        { status: 400 }
      );
    }

    // Validar que userIds sea un array de strings (si está presente)
    if (data.userIds && !Array.isArray(data.userIds)) {
      return new Response(
        JSON.stringify({
          error: "Formato inválido: userIds debe ser un array de strings",
        }),
        { status: 400 }
      );
    }

    // Validar que los IDs sean strings (si userIds está presente)
    if (
      data.userIds &&
      data.userIds.some((id: any) => typeof id !== "string")
    ) {
      return new Response(
        JSON.stringify({
          error: "Formato inválido: todos los userIds deben ser strings",
        }),
        { status: 400 }
      );
    }

    const { userIds } = data;

    // 2. Obtener usuarios
    let usersQuery;
    if (userIds && userIds.length > 0) {
      // Validar máximo de IDs para la consulta (Firestore limita a 10 en consultas "in")
      if (userIds.length > 10) {
        return new Response(
          JSON.stringify({
            error: "Máximo 10 userIds permitidos en una sola solicitud",
          }),
          { status: 400 }
        );
      }

      usersQuery = await db
        .collection("phishingUsers")
        .where("id", "in", userIds)
        .get();
    } else {
      // Si no hay userIds, obtener todos los usuarios
      usersQuery = await db.collection("phishingUsers").get();
    }

    const users = usersQuery.docs.map((doc) => doc.data() as PhishingUser);
    if (users.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se encontraron usuarios",
        }),
        { status: 404 }
      );
    }

    // 3. Crear lote
    const batchId = await createBatch(users.map((u) => u.id));

    // 4. Obtener configuración SMTP
    const smtpDoc = await db.collection("settings").doc("smtp").get();
    if (!smtpDoc.exists) {
      return new Response(
        JSON.stringify({
          error: "Configuración SMTP no encontrada",
        }),
        { status: 500 }
      );
    }
    const smtp = smtpDoc.data() as SMTP;

    // 5. Procesar en background con límite de concurrencia
    const container = await experimental_AstroContainer.create();
    (async () => {
      try {
        const queue = [...users];

        // Actualizar estado del lote
        await db.collection("batches").doc(batchId).update({
          status: "processing",
        });

        // Procesar en chunks
        while (queue.length > 0) {
          const chunk = queue.splice(0, CONCURRENCY_LIMIT);
          await Promise.all(
            chunk.map((user) => sendMail(user, container, smtp, batchId, url))
          );
        }

        // Marcar lote como completado
        await db.collection("batches").doc(batchId).update({
          status: "completed",
        });
      } catch (error) {
        console.error("Error en procesamiento en segundo plano:", error);
        await db
          .collection("batches")
          .doc(batchId)
          .update({
            status: "failed",
            error: error instanceof Error ? error.message : "Error desconocido",
          });
      }
    })();

    return new Response(
      JSON.stringify({
        batchId,
        message: "Procesamiento de lote iniciado",
        _links: {
          status: `/api/batches/${batchId}`,
        },
      }),
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Error en el endpoint:", error);
    return new Response(
      JSON.stringify({
        error: "Error procesando la solicitud",
        details: error.message,
      }),
      { status: 500 }
    );
  }
};
