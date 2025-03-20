import type { UserRecord } from "firebase-admin/auth";
type EdgeLocals = import("@astrojs/vercel").EdgeLocals;

declare namespace App {
  interface Locals extends EdgeLocals {
    user: UserRecord;
  }
}

interface ImportMetaEnv {
  readonly FIREBASE_TYPE: string;
  readonly FIREBASE_PRIVATE_KEY_ID: string;
  readonly FIREBASE_PRIVATE_KEY: string;
  readonly FIREBASE_PROJECT_ID: string;
  readonly FIREBASE_CLIENT_EMAIL: string;
  readonly FIREBASE_CLIENT_ID: string;
  readonly FIREBASE_AUTH_URI: string;
  readonly FIREBASE_TOKEN_URI: string;
  readonly FIREBASE_AUTH_CERT_URL: string;
  readonly FIREBASE_CLIENT_CERT_URL: string;
  readonly FIREBASE_UNIVERSE_DOMAIN: string;
  readonly PROD?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
