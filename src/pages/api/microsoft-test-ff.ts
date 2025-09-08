import { send_microsoft_email } from "@/services/microsoft";

export async function GET() {
  try {
    await send_microsoft_email({
      to: "maizogabriel@gmail.com",
      subject: "Test Microsoft Graph",
      text: "This is a test email sent using Microsoft Graph API.",
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
