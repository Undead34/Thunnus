import type { APIRoute } from "astro";
import { app } from "@/firebase/server";
import { getFirestore } from "firebase-admin/firestore";
import type { PhishingUser } from "@/types";

const db = getFirestore(app);
const phishingUsersRef = db.collection("phishingUsers");

// Obtener todos los usuarios
export const GET: APIRoute = async () => {
  try {
    const snapshot = await phishingUsersRef.get();
    const users: PhishingUser[] = [];
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as PhishingUser);
    });

    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error al obtener usuarios" }), {
      status: 500,
    });
  }
};

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const name = formData.get("name")?.toString();
  const age = formData.get("age")?.toString();
  const isBestFriend = formData.get("isBestFriend") === "on";

  if (!name || !age) {
    return new Response("Missing required fields", {
      status: 400,
    });
  }
  try {
    const friendsRef = db.collection("friends");
    await friendsRef.add({
      name,
      age: parseInt(age),
      isBestFriend,
    });
  } catch (error) {
    return new Response("Something went wrong", {
      status: 500,
    });
  }
  return redirect("/dashboard");
};

