import type { APIRoute } from "astro";
import { app } from "@/firebase/server";
import { getAuth } from "firebase-admin/auth";

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const auth = getAuth(app);

    /* Get token from request headers */
    const idToken = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!idToken) {
      return new Response("No token found", { status: 401 });
    }

    /* Verify id token */
    try {
      await auth.verifyIdToken(idToken);
    } catch (error) {
      return new Response("Invalid token", { status: 401 });
    }

    /* Create and set session cookie */
    const fiveDays = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: fiveDays,
    });

    cookies.set("__session", sessionCookie, {
      path: "/",
    });
    return redirect("/dashboard");
  }
  catch (error: any) {
    let message = "Error en el servidor";
    let status = 500;

    switch (error.code) {
      case "auth/id-token-expired":
      case "auth/id-token-revoked":
        message = "Sesión expirada. Inicie sesión nuevamente";
        status = 401;
        break;
      case "auth/insufficient-permission":
        message = "Permisos insuficientes";
        status = 403;
        break;
      case "auth/invalid-credential":
        message = "Credenciales inválidas";
        status = 401;
        break;
    }

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" }
    });
  }
};
