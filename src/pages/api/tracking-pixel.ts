import type { APIContext } from 'astro';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET({ request }: APIContext): Promise<Response> {
    // 1x1 Transparent GIF
    const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
    );

    return new Response(transparentGif, {
        status: 200,
        headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            "Surrogate-Control": "no-store",
        },
    });
}