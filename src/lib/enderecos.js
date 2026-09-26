import { onlyDigits } from "./format";

// ViaCEP — em Brasília o CEP normalmente já resolve a quadra (ex.: SQS 308 Bloco A)
export async function buscarCep(cep) {
  const d = onlyDigits(cep);
  if (d.length !== 8) return null;
  const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  if (!r.ok) return null;
  const j = await r.json();
  if (j.erro) return null;
  return { street: j.logradouro, complement: j.complemento, neighborhood: j.bairro, city: j.localidade, state: j.uf, cep: j.cep };
}

// Autocomplete de logradouro (ViaCEP exige UF, cidade e ao menos 3 letras)
export async function buscarRuas(uf, cidade, termo) {
  if (!uf || !cidade || (termo || "").trim().length < 3) return [];
  const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(cidade)}/${encodeURIComponent(termo.trim())}/json/`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j) ? j.slice(0, 15) : [];
}

// Nominatim (OpenStreetMap) — gratuito, 1 requisição/s. Tenta endereço completo, depois só o CEP.
let ultima = 0;
async function nominatim(params) {
  const espera = Math.max(0, 1100 - (Date.now() - ultima));
  if (espera) await new Promise((r) => setTimeout(r, espera));
  ultima = Date.now();
  const qs = new URLSearchParams({ format: "json", limit: "1", countrycodes: "br", ...params });
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, { headers: { "Accept-Language": "pt-BR" } });
  if (!r.ok) return null;
  const j = await r.json();
  return j[0] ? { lat: Number(Number(j[0].lat).toFixed(7)), lng: Number(Number(j[0].lon).toFixed(7)) } : null;
}

export async function geocodificar({ texto, street, number, neighborhood, city, state, cep }) {
  const tentativas = [];
  if (texto) tentativas.push({ q: texto });
  if (street) tentativas.push({ q: [street, number, neighborhood, city, state].filter(Boolean).join(", ") });
  if (neighborhood && city) tentativas.push({ q: [neighborhood, city, state].filter(Boolean).join(", ") });
  if (onlyDigits(cep).length === 8) tentativas.push({ postalcode: onlyDigits(cep).replace(/(\d{5})(\d{3})/, "$1-$2"), country: "Brasil" });
  for (const t of tentativas) {
    const r = await nominatim(t);
    if (r) return r;
  }
  return null;
}
