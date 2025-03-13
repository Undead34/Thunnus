import type { APIRoute } from "astro";
import { getBatches } from "@/lib/batches";

export const GET: APIRoute = async ({ params }) => {
    try {
        const batches = await getBatches();

        return new Response(JSON.stringify(batches), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            error: "Error retrieving batch status",
            details: error.message
        }), { status: 500 });
    }
};
