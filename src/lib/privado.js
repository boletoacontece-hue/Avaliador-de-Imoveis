// Armazenamento PRIVADO (bucket "avaliador-privado"): fotos da vistoria e selo do PTAM.
// Nada aqui tem link público: a tela usa links temporários e o PDF baixa as imagens na hora.
import { supabase } from "./supabase";

const BUCKET = "avaliador-privado";

/** JPEG comprimido (o gerador de PDF não aceita WebP). ~200–300 KB por foto. */
export async function comprimirJpeg(file, maxLado = 1600, qualidade = 0.8) {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala); canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", qualidade));
  if (!blob) throw new Error("Não foi possível processar a imagem.");
  return blob;
}

export async function enviarPrivado(blob, pasta) {
  // sessão local (sem ida ao servidor); o armazenamento valida o acesso pelas regras de segurança
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Sessão expirada. Entre de novo.");
  const caminho = `${user.id}/${pasta}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`Falha no envio da foto: ${error.message}`);
  return caminho;
}

/** Links temporários (1 hora) para mostrar as fotos na tela. */
export async function linksTemporarios(caminhos) {
  const lista = [...new Set(caminhos.filter(Boolean))];
  if (!lista.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(lista, 3600);
  if (error) return {};
  return Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

/** Baixa a imagem e devolve data URL (para embutir no PDF). */
export async function comoDataUrl(caminho) {
  const { data, error } = await supabase.storage.from(BUCKET).download(caminho);
  if (error || !data) return null;
  return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(data); });
}

export async function removerPrivado(caminhos) {
  const lista = caminhos.filter(Boolean);
  if (lista.length) await supabase.storage.from(BUCKET).remove(lista);
}
