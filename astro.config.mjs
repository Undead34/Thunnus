// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  output: "server",

  vite: {
    plugins: [tailwindcss()],
    // Soluciona el error de los módulos node:*
    ssr: {
      noExternal: ['firebase-admin', 'google-logging-utils', '@fastify/busboy'],
      external: ['node:events', 'node:util', 'node:stream', 'node:process']
    }
  },

  integrations: [react()],

  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  })
});