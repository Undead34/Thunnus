import type { APIRoute } from "astro";
import { getAuth } from "firebase-admin/auth";
import { app } from "@/firebase/server";

export const POST: APIRoute = async ({ request, redirect }) => {
  const auth = getAuth(app);

  try {
    const data = await request.json();

    // Validaciones adicionales en el servidor
    if (!data.email || !data.password || !data.name) {
      return new Response("Missing required fields", { status: 400 });
    }

    await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
    });

    return redirect("/login");
  } catch (error: any) {
    // Manejar errores específicos de Firebase
    let message = "Error al crear el usuario";
    if (error.code === "auth/email-already-exists") {
      message = "El correo ya está registrado";
    } else if (error.code === "auth/invalid-email") {
      message = "Correo electrónico inválido";
    }

    return new Response(message, {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};
