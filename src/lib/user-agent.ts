export interface DeviceInfo {
    os: string;
    browser: string;
    deviceType: string;
}

export function parseUserAgent(userAgent: string): DeviceInfo {
    let os = "Unknown OS";
    let browser = "Unknown Browser";
    let deviceType = "Desktop";

    if (!userAgent) {
        return { os, browser, deviceType };
    }

    // OS Detection
    if (userAgent.indexOf("Win") !== -1) os = "Windows";
    else if (userAgent.indexOf("Mac") !== -1) os = "MacOS";
    else if (userAgent.indexOf("Linux") !== -1) os = "Linux";
    else if (userAgent.indexOf("Android") !== -1) os = "Android";
    else if (userAgent.indexOf("iOS") !== -1) os = "iOS";

    // Browser Detection
    if (userAgent.indexOf("Chrome") !== -1 && userAgent.indexOf("Edge") === -1 && userAgent.indexOf("OPR") === -1) {
        browser = "Chrome";
    } else if (userAgent.indexOf("Safari") !== -1 && userAgent.indexOf("Chrome") === -1) {
        browser = "Safari";
    } else if (userAgent.indexOf("Firefox") !== -1) {
        browser = "Firefox";
    } else if (userAgent.indexOf("Edge") !== -1) {
        browser = "Edge";
    } else if (userAgent.indexOf("OPR") !== -1 || userAgent.indexOf("Opera") !== -1) {
        browser = "Opera";
    }

    // Device Type (Mobile/Desktop) - Simple heuristic
    if (/Mobi|Android/i.test(userAgent)) {
        deviceType = "Mobile";
    }

    return { os, browser, deviceType };
}
