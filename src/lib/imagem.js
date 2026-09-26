import { supabase, BUCKET } from "./supabase";

// Comprime no navegador antes do upload: lado maior ≤ maxLado, WebP.
// Foto de celular de 4–8 MB vira ~150–300 KB — o Storage gratuito agradece.
export async function comprimir(file, maxLado = 1600, qualidade = 0.82) {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala), h = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", qualidade));
  if (!blob) throw new Error("Não foi possível processar a imagem");
  return blob;
}

// pasta = "<evaluation_id>" ou "perfil"; o 1º nível é sempre o user_id (exigido pelo RLS)
export async function enviarFoto(file, pasta, maxLado = 1600) {
  const { data: { user } } = await supabase.auth.getUser();
  const blob = await comprimir(file, maxLado);
  const caminho = `${user.id}/${pasta}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, blob, {
    contentType: "image/webp", cacheControl: "31536000", upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}

// Remove do bucket um arquivo pela URL pública (ignora URLs externas, ex. de portais)
export async function removerFoto(url) {
  const marca = `/object/public/${BUCKET}/`;
  if (!url || !url.includes(marca)) return;
  const caminho = decodeURIComponent(url.split(marca)[1]);
  await supabase.storage.from(BUCKET).remove([caminho]);
}
