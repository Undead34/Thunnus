import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { timezone } = data;

        if (!timezone) {
            return new Response(JSON.stringify({ error: "Timezone required" }), {
                status: 400,
            });
        }

        // Path to config file
        const configPath = path.join(process.cwd(), "src", "config", "index.ts");

        // Read current content (rudimentary, assuming structure)
        // We will just rewrite the file content since it's simple
        const newContent = `export const CONFIG = {
  TIMEZONE: "${timezone}", // Default timezone, can be changed here
  LOCALE: "es-ES",
};
`;

        await fs.writeFile(configPath, newContent, "utf-8");

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
        });
    }
};

export const GET: APIRoute = async () => {
    // Return current config using dynamic import or reading file
    // Ideally importing CONFIG would work, but in dev it might be cached.
    // Reading file is safer for "edit" view.
    try {
        const configPath = path.join(process.cwd(), "src", "config", "index.ts");
        const content = await fs.readFile(configPath, "utf-8");

        // Extract timezone via regex
        const match = content.match(/TIMEZONE:\s*"([^"]+)"/);
        const timezone = match ? match[1] : "UTC";

        return new Response(JSON.stringify({ timezone }), { status: 200 });
    } catch (e) {
        return new Response(JSON.stringify({ timezone: "UTC" }), { status: 200 });
    }
}
