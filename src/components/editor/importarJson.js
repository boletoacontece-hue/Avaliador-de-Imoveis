// Importação de comparativos via JSON ou CSV.
// Aceita: JSON (array ou { "comparativos": [...] }), CSV do Coletor de Amostras
// e CSV do imoveis_scanner original. Chaves em português ou inglês.
const MAPA = {
  address: ["address", "endereco", "endereço"],
  price: ["price", "preco", "preço", "valor"],
  area: ["area", "área", "area_m2", "metragem"],
  bedrooms: ["bedrooms", "quartos"],
  suites: ["suites", "suítes"],
  parking: ["parking", "vagas"],
  source_url: ["source_url", "url", "link"],
  source_name: ["source_name", "portal", "fonte"],
  thumbnail_url: ["thumbnail_url", "thumbnail", "foto", "imagem"],
  facade_url: ["facade_url", "fachada"],
  broker_observations: ["broker_observations", "observacoes", "observações", "obs"],
  titulo: ["titulo", "título", "title"],
  anunciante: ["anunciante", "advertiser"],
  condominio: ["condominio", "condomínio"],
  iptu: ["iptu"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "lon"],
};
const NUMERICOS = ["price", "area", "bedrooms", "suites", "parking", "latitude", "longitude", "condominio", "iptu"];
const INTEIROS = ["bedrooms", "suites", "parking"];
const ROTULO = { price: "preço", area: "área", bedrooms: "quartos", suites: "suítes", parking: "vagas", latitude: "latitude", longitude: "longitude" };

function paraNumero(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  // "R$ 1.250.000,00" → 1250000 ; "85,5" → 85.5
  let s = String(v).replace(/[^\d.,-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

// CSV simples com aspas; separador detectado (";" do Excel pt-BR ou ",")
function lerCsv(texto) {
  const t = texto.replace(/^\uFEFF/, "");
  const primeira = t.split(/\r?\n/, 1)[0];
  const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ";" : ",";
  const linhas = []; let campo = "", linha = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
  if (linhas.length < 2) throw new Error("O CSV não tem linhas de dados.");
  const cab = linhas[0].map((h) => h.trim().toLowerCase());
  return linhas.slice(1).map((l) => Object.fromEntries(cab.map((h, i) => [h, (l[i] ?? "").trim()])));
}

const moeda = (v) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

export function lerComparativos(texto, nomeArquivo = "") {
  let arr;
  if (/\.csv$/i.test(nomeArquivo) || !/^\s*[[{]/.test(texto)) {
    arr = lerCsv(texto);
  } else {
    let json;
    try { json = JSON.parse(texto); } catch { throw new Error("O arquivo não é um JSON válido."); }
    arr = Array.isArray(json) ? json : Array.isArray(json?.comparativos) ? json.comparativos : null;
    if (!arr) throw new Error("O JSON precisa ser uma lista de imóveis (ou ter a chave \"comparativos\").");
  }

  const validos = [], erros = [];
  arr.forEach((obj, i) => {
    if (!obj || typeof obj !== "object") { erros.push({ linha: i + 1, msg: "item não é um objeto" }); return; }
    const chaves = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase().trim(), v]));
    const item = {};
    for (const [campo, nomes] of Object.entries(MAPA)) {
      const k = nomes.find((n) => chaves[n] !== undefined);
      if (k !== undefined) item[campo] = chaves[k];
    }
    const problemas = [];
    for (const c of NUMERICOS) {
      if (item[c] === undefined) continue;
      const n = paraNumero(item[c]);
      if (Number.isNaN(n) && (c === "condominio" || c === "iptu")) { item[c] = null; continue; } // opcional: ignora
      if (Number.isNaN(n)) problemas.push(`${ROTULO[c] || c} inválido`);
      else item[c] = INTEIROS.includes(c) && n != null ? Math.round(n) : n;
    }
    if (!(item.price > 0)) problemas.push("preço ausente");
    if (!(item.area > 0)) problemas.push("área ausente");
    if (item.latitude != null && (item.latitude < -34 || item.latitude > 6)) problemas.push("latitude fora do Brasil");
    for (const c of ["address", "source_url", "source_name", "thumbnail_url", "facade_url", "broker_observations", "titulo", "anunciante"])
      if (item[c] != null) item[c] = String(item[c]).trim() || null;
    // extras (coletor / scanner original) → observações; título vira endereço se faltar
    const extras = [
      item.anunciante && `Anunciante: ${item.anunciante}`,
      item.condominio > 0 && `Condomínio ${moeda(item.condominio)}`,
      item.iptu > 0 && `IPTU ${moeda(item.iptu)}`,
    ].filter(Boolean);
    if (extras.length && !(item.broker_observations || "").includes(extras[0]))
      item.broker_observations = [item.broker_observations, extras.join(" · ")].filter(Boolean).join(" · ");
    if (!item.address && item.titulo) item.address = item.titulo;
    delete item.titulo; delete item.anunciante; delete item.condominio; delete item.iptu;
    // URLs de portal: só http(s)
    for (const c of ["source_url", "thumbnail_url", "facade_url"])
      if (item[c] && !/^https?:\/\//i.test(item[c])) item[c] = null;
    if (problemas.length) erros.push({ linha: i + 1, msg: problemas.join(", "), endereco: item.address });
    else validos.push(item);
  });
  return { validos, erros, total: arr.length };
}
