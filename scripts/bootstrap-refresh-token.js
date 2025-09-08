/**
 * Bootstrap de refresh_token para Microsoft personal (Outlook/Hotmail).
 * - Usa el Device Code flow con endpoints OAuth2 v2.0
 * - Muestra en consola el refresh_token para guardarlo en tu .env
 *
 * Ejecución:
 *   node ./scripts/bootstrap-refresh-token.js
 *
 * IMPORTANTE: Ejecuta esto en local una vez, copia el REFRESH_TOKEN que imprime
 * y guárdalo en el servidor en process.env.REFRESH_TOKEN
 */

const CLIENT_ID = "58e9fe71-9fe2-49e1-8e6e-49adae573def"; // tu Application (client) ID
const TENANT = "common"; // "common" soporta cuentas personales y organizacionales
const SCOPE = "offline_access Mail.Send"; // offline_access = nos da refresh_token

async function bootstrap() {
  // 1) Pedimos un device_code
  const deviceResp = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        scope: SCOPE,
      }),
    }
  );

  if (!deviceResp.ok) {
    const text = await deviceResp.text();
    throw new Error(`Device code error: ${deviceResp.status} ${text}`);
  }

  const deviceData = await deviceResp.json();

  console.log("\n👉 Abre en el navegador:", deviceData.verification_uri);
  console.log("👉 Ingresa este código:", deviceData.user_code);
  if (deviceData.verification_uri_complete) {
    console.log("👉 O entra directo:", deviceData.verification_uri_complete);
  }
  console.log("(Completa el consentimiento antes de que expire)\n");

  // 2) Poll al token endpoint hasta que el usuario confirme
  const start = Date.now();
  const maxMs = deviceData.expires_in * 1000;
  const intervalMs = (deviceData.interval ?? 5) * 1000;

  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const tokenResp = await fetch(
      `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          client_id: CLIENT_ID,
          device_code: deviceData.device_code,
        }),
      }
    );

    const text = await tokenResp.text();

    if (tokenResp.status === 200) {
      const tok = JSON.parse(text);
      console.log("\n✅ ¡Autorizado!");
      console.log("🔁 REFRESH_TOKEN (guárdalo como secreto en tu servidor):\n");
      console.log(tok.refresh_token, "\n");
      console.log(
        "⚠️ IMPORTANTE: Coloca este valor en tu .env como REFRESH_TOKEN y NO lo compartas."
      );
      return;
    }

    try {
      const err = JSON.parse(text);
      if (err.error === "authorization_pending") {
        continue; // el usuario todavía no completó
      }
      if (err.error === "slow_down") {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw new Error(`${tokenResp.status} ${text}`);
    } catch {
      throw new Error(`${tokenResp.status} ${text}`);
    }
  }

  throw new Error("Tiempo agotado esperando autorización del usuario.");
}

bootstrap().catch((e) => {
  console.error("❌ Error bootstrap:", e.message || e);
  process.exit(1);
});
