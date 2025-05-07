import type { ServiceAccount } from "firebase-admin";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import * as fs from 'fs';
import * as path from "path";

const activeApps = getApps();
let serviceAccount: ServiceAccount;

const serviceAccountPath = import.meta.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (serviceAccountPath) {
  try {
    const serviceAccountFileContent = fs.readFileSync(path.resolve(serviceAccountPath), 'utf8');
    serviceAccount = JSON.parse(serviceAccountFileContent);
  } catch (e) {
    console.error(`Error al cargar o parsear el archivo de cuenta de servicio desde la ruta "${serviceAccountPath}":`, e instanceof Error ? e.message : String(e));
  }
}
else {
  serviceAccount = {
    type: "service_account",
    project_id: import.meta.env.FIREBASE_PROJECT_ID,
    private_key_id: import.meta.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: import.meta.env.FIREBASE_PRIVATE_KEY,
    client_email: import.meta.env.FIREBASE_CLIENT_EMAIL,
    client_id: import.meta.env.FIREBASE_CLIENT_ID,
    auth_uri: import.meta.env.FIREBASE_AUTH_URI,
    token_uri: import.meta.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: import.meta.env.FIREBASE_AUTH_CERT_URL,
    client_x509_cert_url: import.meta.env.FIREBASE_CLIENT_CERT_URL,
  } as ServiceAccount;
}

const initApp = () => {
  console.info('Loading service account from env.')
  return initializeApp({
    credential: cert(serviceAccount)
  })
}

export const app = activeApps.length === 0 ? initApp() : activeApps[0];
