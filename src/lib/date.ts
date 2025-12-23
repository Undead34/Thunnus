import { CONFIG } from "@/config";

export function formatDate(
    date: Date | { seconds: number; nanoseconds?: number } | { _seconds: number; _nanoseconds?: number } | string | number | null | undefined
): string {
    if (!date) return "-";

    let dateObj: Date | null = null;

    try {
        // Handle Firestore Timestamp (has seconds or _seconds)
        // Check for objects that look like Timestamps first
        if (typeof date === "object" && date !== null) {
            if ("seconds" in date && typeof (date as any).seconds === "number") {
                dateObj = new Date((date as any).seconds * 1000);
            } else if ("_seconds" in date && typeof (date as any)._seconds === "number") {
                dateObj = new Date((date as any)._seconds * 1000);
            } else if (date instanceof Date) {
                dateObj = date;
            }
        } else if (typeof date === "string" || typeof date === "number") {
            dateObj = new Date(date);
        }

        if (!dateObj || isNaN(dateObj.getTime())) return "-";

        return new Intl.DateTimeFormat(CONFIG.LOCALE, {
            timeZone: CONFIG.TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(dateObj);
    } catch (e) {
        console.error("Error formatting date:", e);
        return "-";
    }
}
