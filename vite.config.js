import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Caminho base: no GitHub Pages é o nome do repositório.
// Com domínio próprio (ex.: avaliacao.seudominio.com.br), defina VITE_BASE=/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_BASE || "/Avaliador-de-Imoveis/",
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          // react e supabase em pacotes próprios (cache estável); gráficos, animações e mapa
          // ficam nos pacotes das telas que os usam e só baixam quando necessários
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
