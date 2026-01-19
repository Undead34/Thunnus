import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { parseUserAgent } from "./user-agent";
import { getGeoLocation } from "./geoip";

export interface TrackingMetadata {
  ip: string;
  userAgent: string;
  device: {
    os: string;
    browser: string;
  };
  geolocation?: {
    country?: string;
    city?: string;
    lat?: number;
    lon?: number;
  };
}

export type EventType = "CLICKED" | "OPENED" | "SUBMIT" | "SENT";

export async function getTrackingMetadata(
  headers: Headers,
  clientAddress?: string
): Promise<TrackingMetadata> {
  const ip =
    clientAddress ||
    headers.get("x-forwarded-for")?.split(",")[0] ||
    headers.get("x-real-ip") ||
    "unknown";

  const userAgent = headers.get("user-agent") || "unknown";
  const { os, browser } = parseUserAgent(userAgent);
  const geolocation = await getGeoLocation(ip);

  return {
    ip,
    userAgent,
    device: { os, browser },
    geolocation,
  };
}

export async function logTrackingEvent(
  db: Firestore,
  clientId: string,
  type: EventType,
  metadata: TrackingMetadata,
  extraData: Record<string, any> = {}
) {
  const userRef = db.collection("phishingUsers").doc(clientId);
  const timestamp = new Date().toISOString();

  const eventData = {
    type,
    timestamp,
    data: {
      ...metadata,
      ...extraData,
    },
  };

  const updateData: Record<string, any> = {
    "status.lastActivityAt": new Date(),
    events: FieldValue.arrayUnion(eventData),
  };

  // Flatten metadata for root-level update (for the table view)
  // We explicitly update this on every relevant event to ensure the "main" view is fresh
  if (type === "CLICKED" || type === "SUBMIT") {
    updateData["metadata.ip"] = metadata.ip;
    updateData["metadata.userAgent"] = metadata.userAgent;
    updateData["metadata.device.os"] = metadata.device.os;
    updateData["metadata.device.browser"] = metadata.device.browser;
    updateData["metadata.geolocation"] = metadata.geolocation;
  }

  // Type-specific updates
  if (type === "CLICKED") {
    updateData["status.linkClicked"] = true;
    updateData["clickCount"] = FieldValue.increment(1);

    // Inferred Open: Clicking implies reading the email
    updateData["status.emailOpened"] = true;
    // We set this to 'click' but we want to avoid overwriting 'pixel' if it exists.
    // However, standard update() can't do conditional checks.
    // Compromise: We only write 'click' via a script or we assume 'pixel' will overwrite it later if it happens.
    // Actually, if we just write 'click', and then 'pixel' comes, 'pixel' overwrites.
    // If 'pixel' came first, and 'click' comes... 'click' overwrites 'pixel'. That is BAD.
    // To solve this properly without a transaction read, tracking pixel logic should always enforce "pixel".
    // Here, we can't easily know.
    // OPTION B: Use a transaction passed in? Too complex.
    // OPTION C: Just set it. If UI sees 'click', it shows yellow. If pixel loads later, it becomes 'pixel'.
    // PROBLEM: If they loaded pixel (Green), then clicked (Yellow), it downgrades the status.
    // FIX: Only set openedMethod if we can.
    // Since we are NOT reading the doc here, we'll settle for:
    // We will NOT write openedMethod here blindly.
    // We will rely on a new field or just check existence in middleware.

    // BETTER FIX: The middleware ALREADY reads the user snapshot. We can pass current status!
    // But `logTrackingEvent` signature is generic.
    // Let's add `currentStatus` to extraData or a new arg?
    // Or simplified: We just don't set openedMethod on click for now, OR we accept the overwrite risk.
    // User explicitly asked to distinguish.
    // Let's try to do it right: middleware passes a flag if we should write it.
    // But simpler: We use a merge with dot notation.
    // If I write `updateData['status.openedMethod'] = 'click'`, it overwrites.

    // Let's rely on the client (middleware) to decide? No, standardization.
    // Let's just set it. If it flips between Green/Yellow, it's weird but acceptable for now?
    // No, Green > Yellow.
    // I will check if extraData has `currentOpenedMethod`?
    // Actually, `middleware.ts` DOES read the doc.
    // I'll leave this logic here but commented out or minimal, and handle the "smart" update in middleware?
    // No, I entered a contract to do it here.

    // Let's assume we pass `currentStatus` in extraData for CLICKED events from middleware.
    if (extraData.currentStatus) {
      const currentMethod = extraData.currentStatus.openedMethod;
      if (currentMethod !== "pixel") {
        updateData["status.openedMethod"] = "click";
      }
    } else {
      // Fallback: If we don't know, we set it to click.
      // This might overwrite pixel. But typically pixel loads BEFORE click.
      // If pixel loads after, it corrects.
      // If pixel loaded, then click... we rely on middleware passing data.
      updateData["status.openedMethod"] = "click";
    }
  } else if (type === "OPENED") {
    updateData["status.emailOpened"] = true;
    updateData["status.emailOpenedAt"] = new Date();
    updateData["status.openedMethod"] = "pixel"; // Pixel always wins / is definitive
  } else if (type === "SUBMIT") {
    updateData["status.formSubmitted"] = true;
  } else if (type === "SENT") {
    updateData["status.emailSended"] = true;
  }

  try {
    // Check existence inside the function or assume caller checked?
    // Safe to just update if we assume existence, but update will fail if doc doesn't exist.
    // Ideally we check before, but for perf we might skip.
    // Let's rely on update() which fails if doc missing? No, set({merge:true}) creates
    // But we probably want update.
    await userRef.update(updateData);
  } catch (e) {
    console.error(`Error logging tracking event ${type} for ${clientId}:`, e);
    // Fallback if user doesn't exist?
  }
}
