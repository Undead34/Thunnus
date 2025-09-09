// services/microsoft.ts
// ------------------------------------------------------------
// Envío Microsoft Graph con manejo de tokens en Firestore.
// - Usa tu instancia de Firebase Admin: getFirestore(app)
// - Siembra refresh_token desde: process.env -> import.meta.env -> Firestore(settings/ms-graph)
// - Cachea access_token con expiración
// - Rota refresh_token cuando MS devuelve uno nuevo
// - Timeouts para evitar cuelgues
// ------------------------------------------------------------

import { getFirestore } from "firebase-admin/firestore";
import { app } from "@/firebase/server"; // <-- usa tu app inicializada

const db = getFirestore(app);

const MS_CLIENT_ID =
  process.env.MS_CLIENT_ID ?? "58e9fe71-9fe2-49e1-8e6e-49adae573def";
const TENANT = process.env.TENANT ?? "common";
const SCOPES = "Mail.Send offline_access";

// Colección de tokens (cuenta de servicio). Cambia SERVICE_DOC_ID si quieres por-usuario.
const TOKENS_COL = "msOauthTokens";
const SERVICE_DOC_ID = "ms-service-sender";

// Donde también buscaremos un refresh_token si no está en env:
const SETTINGS_DOC = db.collection("settings").doc("ms-graph");

const DEBUG = (process.env.DEBUG_MS ?? "1") !== "0";
const FETCH_TIMEOUT_MS = 15000;
const FIRESTORE_TIMEOUT_MS = 8000;

function log(...args: any[]) {
  if (DEBUG) console.log("[MS]", ...args);
}
function warn(...args: any[]) {
  console.warn("[MS]", ...args);
}
function errlog(...args: any[]) {
  console.error("[MS]", ...args);
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const to = setTimeout(
      () => reject(new Error(`${label} timeout after ${ms}ms`)),
      ms
    );
    p.then((v) => {
      clearTimeout(to);
      resolve(v);
    }).catch((e) => {
      clearTimeout(to);
      reject(e);
    });
  });
}

// -----------------------------
// OAuth: refresh -> access (con timeout)
// -----------------------------
async function exchangeRefreshToken(refreshToken: string, scopes: string) {
  log("Intercambiando refresh -> access (tenant:", TENANT, ")");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const resp = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: scopes,
      }),
      signal: controller.signal,
    }
  )
    .catch((e) => {
      throw new Error(`Fallo de red /token: ${String(e)}`);
    })
    .finally(() => clearTimeout(timer));

  const text = await resp.text();
  if (!resp.ok) {
    errlog("Fallo en /token:", resp.status, text);
    throw new Error(`Token refresh failed: ${resp.status} ${text}`);
  }

  const json = JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };

  const expiresAt = Date.now() + (json.expires_in - 60) * 1000; // -60s margen
  log("Nuevo access_token OK. Expira en ~", json.expires_in, "s");

  return {
    accessToken: json.access_token,
    newRefreshToken: json.refresh_token,
    expiresAt,
  };
}

async function graphSendMail(
  accessToken: string,
  to: string,
  subject: string,
  html: string
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "HTML", content: html },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
    signal: controller.signal,
  })
    .catch((e) => {
      throw new Error(`Fallo de red sendMail: ${String(e)}`);
    })
    .finally(() => clearTimeout(timer));

  const body = await res.text().catch(() => "");
  if (!res.ok) {
    errlog("Graph sendMail error:", res.status, res.statusText, body);
    throw new Error(
      `Graph sendMail error: ${res.status} ${res.statusText}\n${body}`
    );
  }
  log("sendMail OK ->", to);
}

// -----------------------------
// Seed helpers: de dónde saco el refresh_token
// -----------------------------
function readEnvRefreshToken(): string | undefined {
  if (process.env.MICROSOFT_REFRESH_TOKEN)
    return process.env.MICROSOFT_REFRESH_TOKEN;
  try {
    // @ts-ignore - Astro en server suele exponer import.meta.env
    if (import.meta?.env?.MICROSOFT_REFRESH_TOKEN)
      return import.meta.env.MICROSOFT_REFRESH_TOKEN as string;
  } catch (_) {}
  return undefined;
}

async function readSettingsRefreshToken(): Promise<string | undefined> {
  try {
    const snap = await withTimeout(
      SETTINGS_DOC.get(),
      FIRESTORE_TIMEOUT_MS,
      "Firestore settings.get"
    );
    if (!snap.exists) return undefined;
    const data = snap.data() as any;
    const val = data?.refreshToken || data?.MICROSOFT_REFRESH_TOKEN;
    if (typeof val === "string" && val.trim()) return val.trim();
  } catch (e) {
    warn("No pude leer settings/ms-graph:", String(e));
  }
  return undefined;
}

// -----------------------------
// Store Firestore (siembra + cache + lock, con timeouts)
// -----------------------------
async function ensureRefreshTokenDoc(): Promise<string> {
  const ref = db.collection(TOKENS_COL).doc(SERVICE_DOC_ID);

  // 1) ¿Ya existe con refresh?
  const snap = await withTimeout(
    ref.get(),
    FIRESTORE_TIMEOUT_MS,
    "Firestore tokens.get"
  );
  if (snap.exists) {
    const d = snap.data()!;
    const rt =
      (d.refreshToken as string | undefined) ??
      (d.refreshToken_enc as string | undefined);
    if (rt) {
      return rt;
    }
    warn("Doc existe pero sin refreshToken; intentar siembra…");
  } else {
    warn("Doc de tokens no existe; intentar siembra…");
  }

  // 2) Intentar env
  let envRT = readEnvRefreshToken();
  if (!envRT) {
    // 3) Intentar settings/ms-graph.refreshToken
    envRT = await readSettingsRefreshToken();
  }

  if (!envRT) {
    throw new Error(
      "No hay refresh token disponible. Proporciónalo en process.env.MICROSOFT_REFRESH_TOKEN, import.meta.env.MICROSOFT_REFRESH_TOKEN o en Firestore settings/ms-graph.refreshToken"
    );
  }

  await withTimeout(
    ref.set(
      {
        provider: "microsoft",
        tenant: TENANT,
        scopes: SCOPES,
        refreshToken: envRT, // PRODUCCIÓN: cifrar o usar Secret Manager
        accessToken: null,
        accessTokenExpiresAt: 0,
        refreshLock: false,
        lockUntil: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ),
    FIRESTORE_TIMEOUT_MS,
    "Firestore tokens.set(seed)"
  );

  log("Refresh token sembrado (env/settings).");
  return envRT;
}

async function getAccessTokenFromStore(): Promise<string> {
  const ref = db.collection(TOKENS_COL).doc(SERVICE_DOC_ID);

  // Asegurar que tenemos refresh token
  const seededRefresh = await ensureRefreshTokenDoc();

  // Intento rápido: cache
  let snap = await withTimeout(
    ref.get(),
    FIRESTORE_TIMEOUT_MS,
    "Firestore tokens.get(cache)"
  );
  let d = snap.data()!;
  if (
    d?.accessToken &&
    typeof d.accessTokenExpiresAt === "number" &&
    d.accessTokenExpiresAt > Date.now() + 30_000
  ) {
    log("Usando access_token cacheado.");
    return d.accessToken as string;
  }

  // Lock simple
  const now = Date.now();
  const lockWindowMs = 30_000;
  const desiredLockUntil = now + lockWindowMs;

  if (d?.refreshLock && typeof d.lockUntil === "number" && d.lockUntil > now) {
    log("Otro proceso refrescando; esperar…");
    await new Promise((r) => setTimeout(r, 900));
    snap = await withTimeout(
      ref.get(),
      FIRESTORE_TIMEOUT_MS,
      "Firestore tokens.get(retry)"
    );
    d = snap.data()!;
    if (
      d?.accessToken &&
      typeof d.accessTokenExpiresAt === "number" &&
      d.accessTokenExpiresAt > Date.now() + 30_000
    ) {
      log("Access token disponible tras esperar.");
      return d.accessToken as string;
    }
    warn("No apareció token tras espera; refresco igualmente.");
  } else {
    await withTimeout(
      ref.set(
        { refreshLock: true, lockUntil: desiredLockUntil },
        { merge: true }
      ),
      FIRESTORE_TIMEOUT_MS,
      "Firestore tokens.set(lock)"
    );
  }

  try {
    const refreshToken =
      (d?.refreshToken as string | undefined) ??
      (d?.refreshToken_enc as string | undefined) ??
      seededRefresh;

    if (!refreshToken) throw new Error("No hay refresh token en el store.");

    const { accessToken, newRefreshToken, expiresAt } =
      await exchangeRefreshToken(refreshToken, d?.scopes ?? SCOPES);

    const update: Record<string, any> = {
      accessToken,
      accessTokenExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    };
    if (newRefreshToken && newRefreshToken !== refreshToken) {
      warn("Recibido NEW refresh_token; rotando en Firestore.");
      update.refreshToken = newRefreshToken; // PRODUCCIÓN: cifrar/Secret Manager
    }

    await withTimeout(
      ref.set(update, { merge: true }),
      FIRESTORE_TIMEOUT_MS,
      "Firestore tokens.set(update)"
    );
    return accessToken;
  } catch (e: any) {
    const message = String(e?.message ?? e);
    if (message.includes("invalid_grant")) {
      await withTimeout(
        ref.set(
          {
            accessToken: null,
            accessTokenExpiresAt: 0,
            refreshToken: null,
            error: "invalid_grant",
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
        FIRESTORE_TIMEOUT_MS,
        "Firestore tokens.set(invalid_grant)"
      );
      errlog("invalid_grant: el usuario debe re-autenticar/consentir.");
    }
    throw e;
  } finally {
    await withTimeout(
      ref.set({ refreshLock: false, lockUntil: 0 }, { merge: true }),
      FIRESTORE_TIMEOUT_MS,
      "Firestore tokens.set(unlock)"
    ).catch((unlockErr) => warn("No pude liberar lock:", String(unlockErr)));
  }
}

// -----------------------------
// API principal que tú llamas
// -----------------------------
interface Options {
  to: string;
  subject: string;
  html: string;
}

export async function send_microsoft_email(params: Options): Promise<void> {
  const { to, subject, html } = params;

  const accessToken = await getAccessTokenFromStore();

  await graphSendMail(accessToken, to, subject, html);
}
