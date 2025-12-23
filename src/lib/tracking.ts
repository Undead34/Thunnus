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
    } else if (type === "OPENED") {
        updateData["status.emailOpened"] = true;
        updateData["status.emailOpenedAt"] = new Date();
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
