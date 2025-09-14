import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace <repo-name> with your GitHub repo name
export default defineConfig({
  base: '/my-ai-bot/',
  plugins: [react()],
});