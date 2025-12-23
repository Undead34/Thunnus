import { app } from "@/firebase/server";
import type { APIRoute } from "astro";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { parseUserAgent } from "@/lib/user-agent";
import { getGeoLocation } from "@/lib/geoip";

const db = getFirestore(app);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const {
      client_id,
      status,
    }: { client_id: string; status: "submit" | "clicked" | "opened" | "sent" } =
      await request.json();

    const userRef = db.collection("phishingUsers").doc(client_id);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), {
        status: 404,
      });
    }

    // Capture Metadata
    const ip = clientAddress || request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const { os, browser } = parseUserAgent(userAgent);

    const metadataUpdate = {
      "metadata.ip": ip,
      "metadata.userAgent": userAgent,
      "metadata.device.os": os,
      "metadata.device.browser": browser,
      // We can't get accurate screen resolution from server side, defaulting or leaving as is if existing
    };

    if (status === "clicked") {
      await userRef.update({
        clickCount: FieldValue.increment(1),
        ...metadataUpdate
      });
    }

    // Actualizar solo los campos específicos sin afectar otros campos
    const updateData: Record<string, any> = {};

    if (status === "submit") {
      updateData["status.formSubmitted"] = true;
      // Also update metadata on submit as it's a strong signal
      updateData["metadata.ip"] = ip;
      updateData["metadata.userAgent"] = userAgent;
      updateData["metadata.device.os"] = os;
      updateData["metadata.device.browser"] = browser;
    } else if (status === "clicked") {
      updateData["status.linkClicked"] = true;
    } else if (status === "opened") {
      updateData["status.emailOpened"] = true;
    } else if (status === "sent") {
      updateData["status.emailSended"] = true;
    }

    if (Object.keys(updateData).length > 0) {
      await userRef.update(updateData);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Error en servidor" }), {
      status: 500,
    });
  }
};
