import { getFirestore } from "firebase-admin/firestore";
import { app } from "@/firebase/server";
import type { IEmailProvider, EmailOptions } from "../types";

// Constants
const MS_CLIENT_ID = process.env.MS_CLIENT_ID ?? "58e9fe71-9fe2-49e1-8e6e-49adae573def";
const TENANT = process.env.TENANT ?? "common";
const SCOPES = "Mail.Send offline_access";
const TOKENS_COL = "msOauthTokens";
const SERVICE_DOC_ID = "ms-service-sender";
const DEBUG = (process.env.DEBUG_MS ?? "1") !== "0";
const FETCH_TIMEOUT_MS = 15000;
const FIRESTORE_TIMEOUT_MS = 8000;

export class MicrosoftProvider implements IEmailProvider {
    private db = getFirestore(app);
    private SETTINGS_DOC = this.db.collection("settings").doc("ms-graph");

    private async getClientConfig() {
        // Defaults
        let clientId = process.env.MS_CLIENT_ID ?? "58e9fe71-9fe2-49e1-8e6e-49adae573def";
        let tenantId = process.env.TENANT ?? "common";

        try {
            const snap = await this.SETTINGS_DOC.get();
            if (snap.exists) {
                const data = snap.data() || {};
                if (data.clientId) clientId = data.clientId;
                if (data.tenantId) tenantId = data.tenantId;
            }
        } catch (e) {
            this.warn("Error leyendo MS Config del DB, usando env/defaults:", e);
        }
        return { clientId, tenantId };
    }

    private log(...args: any[]) {
        if (DEBUG) console.log("[MS]", ...args);
    }

    private warn(...args: any[]) {
        console.warn("[MS]", ...args);
    }

    private errlog(...args: any[]) {
        console.error("[MS]", ...args);
    }

    private withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
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

    private async exchangeRefreshToken(refreshToken: string, scopes: string) {
        const { clientId, tenantId } = await this.getClientConfig();
        this.log("Intercambiando refresh -> access (tenant:", tenantId, ")");
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const resp = await fetch(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: clientId,
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
            this.errlog("Fallo en /token:", resp.status, text);
            throw new Error(`Token refresh failed: ${resp.status} ${text}`);
        }

        const json = JSON.parse(text) as {
            access_token: string;
            refresh_token?: string;
            expires_in: number;
        };

        const expiresAt = Date.now() + (json.expires_in - 60) * 1000;
        this.log("Nuevo access_token OK. Expira en ~", json.expires_in, "s");

        return {
            accessToken: json.access_token,
            newRefreshToken: json.refresh_token,
            expiresAt,
        };
    }

    private async graphSendMail(accessToken: string, to: string, subject: string, html: string) {
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
            this.errlog("Graph sendMail error:", res.status, res.statusText, body);
            throw new Error(`Graph sendMail error: ${res.status} ${res.statusText}\n${body}`);
        }
        this.log("sendMail OK ->", to);
    }

    private readEnvRefreshToken(): string | undefined {
        if (process.env.MICROSOFT_REFRESH_TOKEN) return process.env.MICROSOFT_REFRESH_TOKEN;
        try {
            // @ts-ignore
            if (import.meta?.env?.MICROSOFT_REFRESH_TOKEN) return import.meta.env.MICROSOFT_REFRESH_TOKEN as string;
        } catch (_) { }
        return undefined;
    }

    private async readSettingsRefreshToken(): Promise<string | undefined> {
        try {
            const snap = await this.withTimeout(
                this.SETTINGS_DOC.get(),
                FIRESTORE_TIMEOUT_MS,
                "Firestore settings.get"
            );
            if (!snap.exists) return undefined;
            const data = snap.data() as any;
            const val = data?.refreshToken || data?.MICROSOFT_REFRESH_TOKEN;
            if (typeof val === "string" && val.trim()) return val.trim();
        } catch (e) {
            this.warn("No pude leer settings/ms-graph:", String(e));
        }
        return undefined;
    }

    private async ensureRefreshTokenDoc(): Promise<string> {
        const ref = this.db.collection(TOKENS_COL).doc(SERVICE_DOC_ID);
        const snap = await this.withTimeout(ref.get(), FIRESTORE_TIMEOUT_MS, "Firestore tokens.get");

        if (snap.exists) {
            const d = snap.data()!;
            const rt = (d.refreshToken as string | undefined) ?? (d.refreshToken_enc as string | undefined);
            if (rt) return rt;
            this.warn("Doc existe pero sin refreshToken; intentar siembra…");
        } else {
            this.warn("Doc de tokens no existe; intentar siembra…");
        }

        let envRT = this.readEnvRefreshToken();
        if (!envRT) {
            envRT = await this.readSettingsRefreshToken();
        }

        if (!envRT) {
            throw new Error("No refresh token available in env or Firestore");
        }

        const { tenantId } = await this.getClientConfig();

        await this.withTimeout(
            ref.set({
                provider: "microsoft",
                tenant: tenantId,
                scopes: SCOPES,
                refreshToken: envRT,
                accessToken: null,
                accessTokenExpiresAt: 0,
                refreshLock: false,
                lockUntil: 0,
                updatedAt: new Date().toISOString(),
            }, { merge: true }),
            FIRESTORE_TIMEOUT_MS,
            "Firestore tokens.set(seed)"
        );

        this.log("Refresh token sembrado (env/settings).");
        return envRT;
    }

    private async getAccessTokenFromStore(): Promise<string> {
        const ref = this.db.collection(TOKENS_COL).doc(SERVICE_DOC_ID);
        const seededRefresh = await this.ensureRefreshTokenDoc();

        let snap = await this.withTimeout(ref.get(), FIRESTORE_TIMEOUT_MS, "Firestore tokens.get(cache)");
        let d = snap.data()!;

        if (d?.accessToken && typeof d.accessTokenExpiresAt === "number" && d.accessTokenExpiresAt > Date.now() + 30_000) {
            this.log("Usando access_token cacheado.");
            return d.accessToken as string;
        }

        const now = Date.now();
        const lockWindowMs = 30_000;
        const desiredLockUntil = now + lockWindowMs;

        if (d?.refreshLock && typeof d.lockUntil === "number" && d.lockUntil > now) {
            this.log("Otro proceso refrescando; esperar…");
            await new Promise((r) => setTimeout(r, 900));
            snap = await this.withTimeout(ref.get(), FIRESTORE_TIMEOUT_MS, "Firestore tokens.get(retry)");
            d = snap.data()!;
            if (d?.accessToken && typeof d.accessTokenExpiresAt === "number" && d.accessTokenExpiresAt > Date.now() + 30_000) {
                this.log("Access token disponible tras esperar.");
                return d.accessToken as string;
            }
            this.warn("No apareció token tras espera; refresco igualmente.");
        } else {
            await this.withTimeout(
                ref.set({ refreshLock: true, lockUntil: desiredLockUntil }, { merge: true }),
                FIRESTORE_TIMEOUT_MS,
                "Firestore tokens.set(lock)"
            );
        }

        try {
            const refreshToken = (d?.refreshToken as string | undefined) ?? (d?.refreshToken_enc as string | undefined) ?? seededRefresh;
            if (!refreshToken) throw new Error("No hay refresh token en el store.");

            const { accessToken, newRefreshToken, expiresAt } = await this.exchangeRefreshToken(refreshToken, d?.scopes ?? SCOPES);

            const update: Record<string, any> = {
                accessToken,
                accessTokenExpiresAt: expiresAt,
                updatedAt: new Date().toISOString(),
            };
            if (newRefreshToken && newRefreshToken !== refreshToken) {
                this.warn("Recibido NEW refresh_token; rotando en Firestore.");
                update.refreshToken = newRefreshToken;
            }

            await this.withTimeout(ref.set(update, { merge: true }), FIRESTORE_TIMEOUT_MS, "Firestore tokens.set(update)");
            return accessToken;
        } catch (e: any) {
            const message = String(e?.message ?? e);
            if (message.includes("invalid_grant")) {
                await this.withTimeout(
                    ref.set({
                        accessToken: null,
                        accessTokenExpiresAt: 0,
                        refreshToken: null,
                        error: "invalid_grant",
                        updatedAt: new Date().toISOString(),
                    }, { merge: true }),
                    FIRESTORE_TIMEOUT_MS,
                    "Firestore tokens.set(invalid_grant)"
                );
                this.errlog("invalid_grant: el usuario debe re-autenticar/consentir.");
            }
            throw e;
        } finally {
            await this.withTimeout(
                ref.set({ refreshLock: false, lockUntil: 0 }, { merge: true }),
                FIRESTORE_TIMEOUT_MS,
                "Firestore tokens.set(unlock)"
            ).catch((unlockErr) => this.warn("No pude liberar lock:", String(unlockErr)));
        }
    }

    async send(options: EmailOptions): Promise<void> {
        const accessToken = await this.getAccessTokenFromStore();
        await this.graphSendMail(accessToken, options.to, options.subject, options.html);
    }
}
