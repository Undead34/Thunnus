// @ts-check
import { defineConfig } from 'astro/config';

import node from "@astrojs/node";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

import purgecss from "astro-purgecss";

// https://astro.build/config
export default defineConfig({
  output: "server",

  adapter: node({
    mode: "standalone",
  }),

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react({
      experimentalReactChildren: true,
    }),
    purgecss({
      content: [
        'src/pages/templates/**/*.{astro,js,jsx,ts,tsx,vue,svelte}',
        'src/layouts/templates/**/*.{astro,js,jsx,ts,tsx,vue,svelte}',
      ]
    })
  ],
});
