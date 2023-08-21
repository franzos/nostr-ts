import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const BASE_URL = process.env.VITE_CLIENT_WEB_BASE_URL || "/";

export default defineConfig({
  base: BASE_URL,
  plugins: [react()],
});
