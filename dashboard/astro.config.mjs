import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',       // SSG — no Astro server needed, auth is client-side
  adapter: vercel(),
  integrations: [react()],
});
