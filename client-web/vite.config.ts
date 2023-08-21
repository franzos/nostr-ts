import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: process.env.GH_PAGES_BUILD ? "/nostr-ts/" : "/", // for github pages
  plugins: [react()],
});
