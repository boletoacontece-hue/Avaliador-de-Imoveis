// GitHub Pages não tem rewrite de SPA: servindo o index.html também como 404.html,
// qualquer rota (/abc123, /a/<uuid>, /dashboard) abre o app, que resolve a rota no navegador.
import { copyFileSync } from "node:fs";
copyFileSync("dist/index.html", "dist/404.html");
console.log("404.html criado (fallback de SPA)");
