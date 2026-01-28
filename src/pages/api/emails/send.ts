import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { experimental_AstroContainer } from "astro/container";

import { app } from "@/firebase/server";
import { createBatch, updateBatchProgress } from "@/lib/batches";
import { EmailService } from "@/services/email";

import SITCA, { CONFIG as SitcaConfig } from "@/emails/Sitca/Template.astro";
import GoogleDrive, {
  CONFIG as GoogleDriveConfig,
} from "@/emails/GoogleDrive/Template.astro";
import Microsoft, {
  CONFIG as MicrosoftConfig,
} from "@/emails/Microsoft/Template.astro";
import MicrosoftEN, {
  CONFIG as MicrosoftENConfig,
} from "@/emails/Microsoft (EN)/Template.astro";
import OneDriveExcel, {
  CONFIG as OneDriveExcelConfig,
} from "@/emails/OneDriveExcel/Template.astro";
import PoderJudicialPeru, {
  CONFIG as PoderJudicialPeruConfig,
} from "@/emails/PoderJudicialPeru/Template.astro";
import PoderJudiciarioBrasil, {
  CONFIG as PoderJudiciarioBrasilConfig,
} from "@/emails/PoderJudiciarioBrasil/Template.astro";
import FuncionJudicialEcuador, {
  CONFIG as FuncionJudicialEcuadorConfig,
} from "@/emails/FuncionJudicialEcuador/Template.astro";
import CorteSupremaElSalvador, {
  CONFIG as CorteSupremaElSalvadorConfig,
} from "@/emails/CorteSupremaElSalvador/Template.astro";
import RamaJudicialColombia, {
  CONFIG as RamaJudicialColombiaConfig,
} from "@/emails/RamaJudicialColombia/Template.astro";

import type { PhishingUser, SMTP } from "@/types";
import type { APIRoute } from "astro";

interface TemplateEntry {
  component: any;
  config: {
    subject: string;
    country?: string;
    flags: {
      tracking_pixel?: boolean;
      email?: boolean;
      censored_email?: boolean;
      target_name?: boolean;
    };
    defaultProps?: Record<string, unknown>;
  };
}

// | "microsoft"
// | "microsoft-en"
// | "onedrive"
// | "google-drive"
// | "sitca-template";

export const TemplateMapper: Record<string, TemplateEntry> = {
  sitca: { component: SITCA, config: SitcaConfig },
  googleDrive: { component: GoogleDrive, config: GoogleDriveConfig },
  microsoft: { component: Microsoft, config: MicrosoftConfig },
  "microsoft-en": { component: MicrosoftEN, config: MicrosoftENConfig },
  oneDriveExcel: { component: OneDriveExcel, config: OneDriveExcelConfig },
  "poder-judicial-peru": {
    component: PoderJudicialPeru,
    config: PoderJudicialPeruConfig,
  },
  "poder-judiciario-brasil": {
    component: PoderJudiciarioBrasil,
    config: PoderJudiciarioBrasilConfig,
  },
  "funcion-judicial-ecuador": {
    component: FuncionJudicialEcuador,
    config: FuncionJudicialEcuadorConfig,
  },
  "corte-suprema-el-salvador": {
    component: CorteSupremaElSalvador,
    config: CorteSupremaElSalvadorConfig,
  },
  "rama-judicial-colombia": {
    component: RamaJudicialColombia,
    config: RamaJudicialColombiaConfig,
  },
} as const;

const db = getFirestore(app);
const CONCURRENCY_LIMIT = 5;

// Initialize Email Service removed from global scope

async function markEmailSent(userId: string, batchId: string) {
  const userRef = db.collection("phishingUsers").doc(userId);
  await Promise.all([
    userRef.update({
      "status.emailSended": true,
      events: FieldValue.arrayUnion({
        type: "EMAIL_SENT",
        timestamp: new Date().toISOString(),
        data: { client_id: userId },
      }),
    }),
    updateBatchProgress(batchId, true),
  ]);
}

async function markEmailError(
  userId: string,
  batchId: string,
  message: string,
) {
  await Promise.all([
    db.collection("phishingUsers").doc(userId).update({
      "status.emailSended": false,
      "status.emailError": message,
    }),
    updateBatchProgress(batchId, false, { userId, message }),
  ]);
}

function censorEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const first = local[0];
  const last = local.slice(-1);
  const stars = "*".repeat(local.length - 2);
  return `${first}${stars}${last}@${domain}`;
}

interface MailPackage {
  user: PhishingUser;
  container: experimental_AstroContainer;
  smtp: SMTP;
  batchId: string;
  url: URL;
  template: TemplateEntry;
  emailService: EmailService;
}

async function sendMail(pkg: MailPackage) {
  const { user, container, smtp, batchId, url, template, emailService } = pkg;
  const { component: Template, config } = template;
  const { flags, subject, defaultProps, country } = config;

  const props: Record<string, unknown> = {
    ...defaultProps,
    redirect_to: (() => {
      const u = new URL("", url.origin);
      u.searchParams.set("client_id", user.id);
      if (country) {
        u.searchParams.set("country", country);
      }
      return u.toString();
    })(),
  };

  if (flags?.tracking_pixel) {
    props.tracking_pixel = `${url.origin}/api/tracking-pixel?client_id=${user.id}`;
  }
  if (flags?.email) {
    props.email = user.email;
  }
  if (flags?.censored_email) {
    props.censored_email = censorEmail(user.email);
  }
  if (flags?.target_name) {
    props.target_name = (user as any).name ?? "";
  }

  try {
    const html = await container.renderToString(Template, { props });

    console.log(
      `[Batch ${batchId}] Attempting to send email to ${user.email} using template ${config.subject}`,
    );

    await emailService.send({
      to: user.email,
      subject,
      html,
      smtp: smtp, // Pass SMTP config just in case provider is switched to SMTP
    });

    console.log(`[Batch ${batchId}] Email successfully sent to ${user.email}`);

    await markEmailSent(user.id, batchId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Error");
    console.error(
      `[Batch ${batchId}] Failed to send email to ${user.email}:`,
      error,
    );
    await markEmailError(user.id, batchId, message);
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const data = await request.json();
    if (!data || typeof data !== "object") {
      return new Response(
        JSON.stringify({
          error: "Formato inválido: se requiere { userIds?: string[] }",
        }),
        { status: 400 },
      );
    }

    if (data.userIds && !Array.isArray(data.userIds)) {
      return new Response(
        JSON.stringify({ error: "userIds debe ser un array de strings" }),
        { status: 400 },
      );
    }

    if (data.userIds?.some((id: any) => typeof id !== "string")) {
      return new Response(
        JSON.stringify({ error: "Todos los userIds deben ser strings" }),
        { status: 400 },
      );
    }

    const { userIds } = data;


    // Helper functionality for chunking array (moved inside to avoid global scope pollution if not needed elsewhere)
    const chunkArray = <T>(array: T[], size: number): T[][] => {
      const chunked: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
      }
      return chunked;
    };

    let usersQuery: PhishingUser[] = [];
    if (userIds?.length) {
      if (userIds.length > 1000) {
        return new Response(
          JSON.stringify({ error: "Máximo 1000 userIds por solicitud" }),
          { status: 400 },
        );
      }

      // Chunk userIds to respect Firestore 'in' query limit of 30
      const chunks = chunkArray(userIds, 30);
      const promises = chunks.map(chunk =>
        db.collection("phishingUsers").where("id", "in", chunk).get()
      );

      const snapshots = await Promise.all(promises);
      usersQuery = snapshots.flatMap(snap => snap.docs.map(d => d.data() as PhishingUser));

    } else {
      const snapshot = await db.collection("phishingUsers").get();
      usersQuery = snapshot.docs.map((d) => d.data() as PhishingUser);
    }

    const users = usersQuery;

    if (!users.length) {
      return new Response(
        JSON.stringify({ error: "No se encontraron usuarios" }),
        { status: 404 },
      );
    }

    const batchId = await createBatch(users.map((u) => u.id));

    const smtpDoc = await db.collection("settings").doc("smtp").get();
    if (!smtpDoc.exists) {
      return new Response(
        JSON.stringify({ error: "Configuración SMTP no encontrada" }),
        { status: 500 },
      );
    }
    const smtp = smtpDoc.data() as SMTP;
    const emailService = new EmailService(smtp.provider || "microsoft");

    const tplDoc = await db.collection("settings").doc("email-template").get();
    const selectedKey: string = tplDoc.exists
      ? (tplDoc.data()?.value as string)
      : "sitca";
    const defaultTemplate = TemplateMapper[selectedKey] ?? TemplateMapper.sitca;

    const container = await experimental_AstroContainer.create();
    (async () => {
      try {
        await db
          .collection("batches")
          .doc(batchId)
          .update({ status: "processing" });

        const queue = [...users];

        // Default values if not provided
        const batchSize = Number(data.batchSize) || CONCURRENCY_LIMIT;
        // waitInterval in seconds
        const waitInterval = Number(data.waitInterval) || 0;

        while (queue.length) {
          const chunk = queue.splice(0, batchSize);

          await Promise.all(
            chunk.map((user) => {
              const key = (user as any).template ?? selectedKey;
              const template = TemplateMapper[key] ?? defaultTemplate;
              return sendMail({
                user,
                container,
                smtp,
                batchId,
                url,
                template,
                emailService,
              });
            }),
          );

          // Wait only if there are more items in the queue
          if (queue.length > 0 && waitInterval > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, waitInterval * 1000),
            );
          }
        }

        await db
          .collection("batches")
          .doc(batchId)
          .update({ status: "completed" });
      } catch (err) {
        console.error("Error en worker:", err);
        await db
          .collection("batches")
          .doc(batchId)
          .update({
            status: "failed",
            error: err instanceof Error ? err.message : "Error desconocido",
          });
      }
    })();

    return new Response(
      JSON.stringify({
        batchId,
        message: "Procesamiento de lote iniciado",
        _links: { status: `/api/batches/${batchId}` },
      }),
      { status: 202 },
    );
  } catch (err: any) {
    console.error("Error en endpoint:", err);
    return new Response(
      JSON.stringify({
        error: "Error procesando la solicitud",
        details: err.message,
      }),
      { status: 500 },
    );
  }
};
