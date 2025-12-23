export interface GeoLocation {
    country?: string;
    city?: string;
    lat?: number;
    lon?: number;
}

export async function getGeoLocation(ip: string): Promise<GeoLocation> {
    // Skip if localhost or private IP (basic check)
    if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
        return {
            country: "Local Network",
            city: "Localhost"
        };
    }

    try {
        const response = await fetch(`https://api.ipapi.is?q=${ip}`);
        if (!response.ok) return {};

        const data = await response.json();
        return {
            country: data.location?.country,
            city: data.location?.city,
            lat: data.location?.latitude,
            lon: data.location?.longitude
        };
    } catch (e) {
        console.error("Error fetching geolocation:", e);
        return {};
    }
}
