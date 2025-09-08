const MS_CLIENT_ID =
  process.env.MS_CLIENT_ID ?? "58e9fe71-9fe2-49e1-8e6e-49adae573def";
const TENANT = process.env.TENANT ?? "common";

/**
 * Intercambia REFRESH_TOKEN -> ACCESS_TOKEN
 * Devuelve accessToken y, si MS lo envía, un newRefreshToken para rotarlo.
 */
async function getAccessTokenFromRefresh(refreshToken: string): Promise<{
  accessToken: string;
  newRefreshToken?: string;
}> {
  const resp = await fetch(
    `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MS_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: "Mail.Send offline_access",
      }),
    }
  );

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Token refresh failed: ${resp.status} ${text}`);
  }

  const json = JSON.parse(text) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };

  return {
    accessToken: json.access_token,
    newRefreshToken: json.refresh_token,
  };
}

/**
 * Envía un correo con Microsoft Graph usando /me/sendMail
 */
async function graphSendMail(
  accessToken: string,
  to: string,
  subject: string,
  text: string
) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "Text", content: text },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Graph sendMail error: ${res.status} ${res.statusText}\n${body}`
    );
  }
}

/**
 * Función principal que usarás desde tu endpoint.
 * Lee REFRESH_TOKEN del entorno, renueva access token, y envía el correo.
 */
export async function send_microsoft_email(params: {
  to: string;
  subject: string;
  text: string;
}) {
  const to = params.to;
  const subject = params.subject;
  const text = params.text;

  const rt = import.meta.env.MICROSOFT_REFRESH_TOKEN;

  console.log("MICROSOFT_REFRESH_TOKEN", rt);

  if (!rt)
    throw new Error("Falta MICROSOFT_REFRESH_TOKEN en variables de entorno.");

  // 1) refrescar token
  const { accessToken, newRefreshToken } = await getAccessTokenFromRefresh(rt);

  // 2) (Opcional) rotar refresh_token si MS te devuelve uno nuevo
  if (newRefreshToken && newRefreshToken !== rt) {
    console.warn(
      "ℹ️ Recibiste NEW refresh_token de Microsoft. Rotarlo en tu secret store."
    );
    // TODO: guarda newRefreshToken en tu secret manager/DB
  }

  // 3) enviar
  await graphSendMail(accessToken, to, subject, text);
}
