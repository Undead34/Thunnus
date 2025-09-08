import type { UserRecord } from "firebase-admin/auth";

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
  readonly MICROSOFT_REFRESH_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user: UserRecord;
  }
}

