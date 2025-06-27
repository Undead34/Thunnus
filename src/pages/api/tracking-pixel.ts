import type { APIContext } from 'astro';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET({ request }: APIContext): Promise<Response> {
    
    const filePath = path.join(process.cwd(), 'src/assets/tracking-pixel.png');

    try {
        const fileBuffer = await fs.readFile(filePath);

        return new Response(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

    } catch (error) {
        console.error('No se pudo encontrar el píxel:', error);
        return new Response('Pixel no encontrado', { status: 404 });
    }
}