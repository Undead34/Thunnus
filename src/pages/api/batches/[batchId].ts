import type { APIRoute } from "astro";
import { getBatchStatus } from "@/lib/batches";

export const GET: APIRoute = async ({ params }) => {
    try {
        const { batchId } = params;
        if (!batchId) throw new Error("Missing batch ID");

        const batchStatus = await getBatchStatus(batchId);

        return new Response(JSON.stringify(batchStatus), {
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
