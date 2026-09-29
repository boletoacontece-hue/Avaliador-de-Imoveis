// Leitura de PDFs NO NAVEGADOR (o arquivo nunca é enviado a servidor algum).
//  • Ficha do imóvel do Imobiliar (ficha completa ou "Consulta de imóveis")
//  • Estudo de Mercado do DFImóveis (TIMIPRO)
// A leitura é por POSIÇÃO: o valor fica ao lado do rótulo (fichas) ou logo acima
// dele, na mesma coluna (estudo). Cada valor é validado pelo tipo esperado.
//
// PRIVACIDADE: da ficha só saem dados do IMÓVEL. Locatário, proprietário,
// beneficiário (nomes, CPF, RG, contatos, banco) e notas internas nunca são lidos.

// ------------------------------------------------------------ extração
let libPromise = null;
async function pdfjs() {
  if (!libPromise) {
    libPromise = (async () => {
      const lib = await import("pdfjs-dist");
      lib.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
      return lib;
    })();
  }
  return libPromise;
}

/** Itens de texto do PDF: [{ p, x, y, s }] (y cresce para cima, como no PDF). */
export async function itensDoPdf(arquivo, lib = null) {
  const pdf = lib || (await pdfjs());
  const dados = arquivo instanceof Uint8Array ? arquivo : new Uint8Array(await arquivo.arrayBuffer());
  const doc = await pdf.getDocument({ data: dados, isEvalSupported: false }).promise;
  const itens = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const conteudo = await (await doc.getPage(p)).getTextContent();
    for (const it of conteudo.items) {
      const s = (it.str || "").replace(/\s+/g, " ").trim();
      if (s) itens.push({ p, x: it.transform[4], y: it.transform[5], s });
    }
  }
  await doc.destroy();
  return itens;
}

// ------------------------------------------------------------ utilidades
const semAcento = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/** "Tipo de Imóvel..........:" → "tipo de imovel" */
const rotulo = (s) => semAcento(s).toLowerCase().replace(/\.{2,}/g, " ").replace(/[.:]+\s*$/, "").replace(/\s+/g, " ").trim();

/** "R$ 1.450,95" → 1450.95 · "5.697" → 5697 · "~3,9 meses" → 3.9 · "+6,80%" → 6.8 */
export function numeroBr(txt) {
  if (txt == null) return null;
  let s = String(txt).replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}(\D|$)/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const E_DINHEIRO = (s) => /R\$\s*[\d.]/.test(s);
const E_NUMERO = (s) => /^[~+-]?\s*R?\$?\s*[\d.,]+\s*(%|m²|meses?)?$/i.test(s.trim());
const E_PCT = (s) => /[\d,]+\s*%/.test(s);
const E_TEXTO = (s) => !/[.:]\s*$/.test(s); // não é outro rótulo

function achar(itens, re, filtro = () => true) {
  return itens.filter((i) => filtro(i) && re.test(rotulo(i.s)));
}

/** Valor à direita do rótulo, na mesma linha. */
function aoLado(itens, re, valida = E_TEXTO, filtro) {
  for (const r of achar(itens, re, filtro)) {
    const cand = itens
      .filter((i) => i.p === r.p && Math.abs(i.y - r.y) <= 4.5 && i.x > r.x + 1 && (!filtro || filtro(i)))
      .sort((a, b) => a.x - b.x);
    const v = cand.find((i) => valida(i.s));
    if (v && cand.indexOf(v) <= 1) return v.s; // o primeiro (ou segundo) item à direita
  }
  return null;
}

/** Valor logo ACIMA do rótulo, na mesma coluna (layout do estudo do portal). */
function acima(itens, re, valida = E_NUMERO) {
  for (const r of achar(itens, re)) {
    const cand = itens
      .filter((i) => i.p === r.p && i.y > r.y + 5 && i.y < r.y + 56 && Math.abs(i.x - r.x) <= 42 && valida(i.s))
      .sort((a, b) => (a.y - r.y) - (b.y - r.y) || Math.abs(a.x - r.x) - Math.abs(b.x - r.x));
    if (cand.length) return cand[0].s;
  }
  return null;
}

// ------------------------------------------------------------ endereço de Brasília
const SIGLAS = "SQ[NS]W?|SHI[NS]|SH[CT][NS]|SCL[NS]|CL[NS]W?|CR[NS]|SEP[NS]|SHCS|SHCN|EQ[NS]|SGAN|SGAS|QI|QL|QS|QN[A-Z]?|QR|SMDB|SMPW|AOS|CCSW|SHCGN|SCS|SBS|SDS";
const QUADRA = new RegExp(`\\b(${SIGLAS})\\s*[-.]?\\s*(\\d{1,4}(?:\\s*\\/\\s*\\d{1,4})?)(?:\\s*[-,]?\\s*(?:bl(?:oco|\\.)?|conjunto|conj\\.?)\\s*["']?([a-z])\\b["']?)?`, "i");
const UNIDADE = /\b(kit(?:net)?|apto?|apartamento|sala|loja|casa|lote|unidade)\.?\s*(?:n[º°o.]\s*)?(\d+[a-z]?)\b/i;

export function separarEndereco(bruto) {
  const s = (bruto || "").replace(/^\s*(quadra|q)\s+/i, "");
  const q = s.match(QUADRA);
  const u = s.match(UNIDADE);
  const rua = q ? `${q[1].toUpperCase()} ${q[2].replace(/\s+/g, "")}${q[3] ? ` Bloco ${q[3].toUpperCase()}` : ""}` : s.split(" - ")[0].trim();
  const complemento = u ? `${u[1][0].toUpperCase()}${u[1].slice(1).toLowerCase().replace(/^apto?$/, "Apto")} ${u[2]}` : "";
  return { rua, complemento };
}

const TIPOS = [
  [/kit/, "Kitnete"], [/casa em cond/, "Casa em Condomínio"], [/cobertura/, "Cobertura"], [/garden/, "Garden"],
  [/studio|estudio/, "Studio"], [/apart/, "Apartamento"], [/sala/, "Sala Comercial"], [/loja/, "Loja"],
  [/galp/, "Galpão"], [/terreno|lote/, "Terreno"], [/casa/, "Casa"],
];
const tipoPadrao = (t) => (TIPOS.find(([re]) => re.test(semAcento((t || "").toLowerCase()))) || [])[1] || null;
const titulo = (s) => (s || "").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
// característica em frase: "CIRCUITO INTERNO DE TV" → "Circuito interno de TV"
const frase = (s) => {
  const t = (s || "").toLowerCase().replace(/\s+/g, " ").trim();
  return (t.charAt(0).toUpperCase() + t.slice(1)).replace(/\btv\b/g, "TV").replace(/\bcftv\b/g, "CFTV").replace(/-(\d)/g, " $1").replace(/\bhs\b/g, "h");
};

// ------------------------------------------------------------ ficha do Imobiliar
export function lerFichaImobiliar(itens) {
  const tudo = itens.map((i) => i.s).join(" ");
  if (!/ficha do im[oó]vel/i.test(tudo)) throw new Error("Este PDF não parece uma ficha de imóvel do Imobiliar.");

  // zona proibida: do cabeçalho PROPRIETÁRIO(S) até CARACTERÍSTICAS (dados pessoais e bancários)
  const cab = (re) => itens.find((i) => re.test(semAcento(i.s).toUpperCase().replace(/\s+/g, "")));
  const hProp = cab(/^PROPRIETARIO\(S\)$/), hCarac = cab(/^CARACTERISTICAS$/);
  const permitido = (i) => !(hProp && i.p === hProp.p && i.y <= hProp.y + 2 && (!hCarac || i.y > hCarac.y + 2));
  const base = itens.filter(permitido);
  const v = (re, valida) => aoLado(base, re, valida);

  const f = {};
  f.property_code = v(/^codigo$/, (s) => /^\d+$/.test(s));
  const endereco = v(/^endereco$/);
  f.property_cep = v(/^cep$/, (s) => /\d{5}-?\d{3}/.test(s)) || (tudo.match(/CEP:?\s*(\d{5}-?\d{3})/i) || [])[1] || null;
  if (endereco) {
    const { rua, complemento } = separarEndereco(endereco);
    f.property_street = rua;
    if (complemento) f.property_complement = complemento;
    const ultimo = endereco.split(" - ").pop().trim();
    if (/^[A-Za-zÀ-ú ]{3,30}$/.test(ultimo) && !UNIDADE.test(ultimo)) f.property_neighborhood = titulo(ultimo);
  }
  const bairro = v(/^bairro$/, (s) => /^[A-Za-zÀ-ú ]{3,40}$/.test(s));
  if (bairro) f.property_neighborhood = titulo(bairro);
  const cidade = v(/^cidade$/, (s) => /^[A-Za-zÀ-ú ]{3,40}$/.test(s));
  f.property_city = cidade ? titulo(cidade).replace(/^Brasilia$/, "Brasília") : "Brasília";
  f.property_state = v(/^uf$/, (s) => /^[A-Z]{2}$/.test(s)) || "DF";

  f.property_type = tipoPadrao(v(/^tipo d[eo] imovel$/));
  const status = v(/^status$/);
  if (status) f.occupancy = /desocup|vago|livre/i.test(status) ? "desocupado" : /ocup|alug/i.test(status) ? "alugado" : null;
  f.property_bedrooms = numeroBr(v(/^n[ºo°]? ?dormitorios$/, (s) => /^\d+$/.test(s)));
  f.property_area = numeroBr(v(/^metragem$/, (s) => /^[\d.,]+$/.test(s)));
  f.area_total = numeroBr(v(/^2[ªa] metragem$/, (s) => /^[\d.,]+$/.test(s)));
  f.property_parking = numeroBr(v(/^garagem$/, (s) => /^\d+$/.test(s)));
  f.property_condo_name = v(/^nome$/);
  f.iptu_registration = v(/^inscricao do iptu$/, (s) => /^[\d./-]+$/.test(s));
  f.registry_number = v(/^matricula reg ?imoveis$/, (s) => /\d/.test(s) && E_TEXTO(s));
  f.iptu_value = numeroBr(v(/^(vlr parcela iptu|parcela do iptu)$/, (s) => /^[\d.,]+$/.test(s)));
  const aluguel = numeroBr(v(/^vlr\.? aluguel atual$/, (s) => /^[\d.,]+$/.test(s)));
  if (aluguel) f.current_rent = aluguel;

  // condomínio: valor do último boleto (coluna "Cond" dos DOCs) > valor da consulta > valor inicial
  const hCond = base.find((i) => i.s === "Cond");
  if (hCond) {
    const linha1 = base.filter((i) => i.p === hCond.p && i.y < hCond.y - 3 && i.y > hCond.y - 18 && Math.abs(i.x - hCond.x) < 22 && /^[\d.,]+$/.test(i.s));
    if (linha1.length) f.condo_fee = numeroBr(linha1[0].s);
  }
  f.condo_fee = f.condo_fee || numeroBr(v(/^condominio$/, (s) => /^[\d.,]+$/.test(s))) || numeroBr(v(/^vlr cond\.? inicial$/, (s) => /^[\d.,]+$/.test(s)));

  // características: nomes entre CARACTERÍSTICAS e DOCs/OBSERVAÇÕES (ficha completa)…
  const carac = [];
  if (hCarac) {
    const fim = cab(/^DOCS$/) || cab(/^OBSERVACOES$/);
    for (const i of base) {
      if (i.p !== hCarac.p || i.y >= hCarac.y - 2 || (fim && fim.p === i.p && i.y <= fim.y + 2)) continue;
      if (/^(caracteristicas (internas|gerais)|qtde|complemento)\.?$/i.test(rotulo(i.s)) || /^[\d.,]+$/.test(i.s)) continue;
      carac.push(i.s);
    }
  }
  // …ou as linhas "- ..." da descrição (consulta de imóveis)
  const descricao = base.filter((i) => /^-\s+\S/.test(i.s)).sort((a, b) => a.p - b.p || b.y - a.y).map((i) => i.s.replace(/^-\s+/, "").replace(/\.$/, ""));
  f.features = [...new Set([...carac.map(frase), ...descricao])];

  // limpa vazios
  for (const k of Object.keys(f)) if (f[k] == null || f[k] === "" || (Array.isArray(f[k]) && !f[k].length)) delete f[k];
  return f;
}

// ------------------------------------------------------------ estudo do DFImóveis
export function lerEstudoPortal(itens) {
  const tudo = itens.map((i) => i.s).join(" ");
  if (!/dfimoveis/i.test(tudo) || !/segmenta[cç][aã]o/i.test(tudo))
    throw new Error("Este PDF não parece um Estudo de Mercado do DFImóveis.");
  const ac = (re, valida) => acima(itens, re, valida);
  const lado = (re, valida) => aoLado(itens, re, valida);
  const n = (s) => numeroBr(s);

  const semEspaco = itens.map((i) => semAcento(i.s).toUpperCase().replace(/\s+/g, ""));
  const capa = semEspaco.find((s) => s.startsWith("ESTUDODEMERCADO")) || "";
  const bairroLbl = achar(itens, /^valorizacao no (?!ano)/)[0];

  const e = {
    fonte: "DFImóveis.com (TIMIPRO)",
    finalidade: /ALUGUEL|LOCACAO/.test(capa) ? "aluguel" : "venda",
    local: (itens.find((i) => i.p === 1 && QUADRA.test(i.s)) || {}).s || null,
    tipologia: (itens.find((i) => i.p === 1 && /·.*m²/.test(i.s)) || {}).s || null,
    segmento: ((tudo.match(/Segmenta[cç][aã]o:\s*([^()]+\([^)]*\))/i) || [])[1] || "").trim() || null,
    amostra: n((tudo.match(/Amostra:\s*([\d.]+)\s*im[oó]veis/i) || [])[1]),
    referencia: (tudo.match(/carga de (\d{2}\/\d{4})/i) || [])[1] || null,

    preco_medio: n(ac(/^preco medio$/, E_DINHEIRO)),
    preco_m2_medio: n(ac(/^preco medio \/ m²$/, E_DINHEIRO)),
    anuncios: n(ac(/^imoveis$/)),
    area_media: n(ac(/^area media$/)),
    preco_m2_imovel: n(ac(/^preco\/m² deste$/, E_DINHEIRO)),
    preco_anunciado: n(lado(/^este imovel$/, E_DINHEIRO)),
    menor_valor: n(lado(/^menor valor$/, E_DINHEIRO)),
    maior_valor: n(lado(/^maior valor$/, E_DINHEIRO)),

    leads_12m: n(ac(/^leads gerados/)),
    acessos: n(ac(/^acessos aos anuncios$/)),
    leads_por_oferta: n(ac(/^leads por oferta$/)),
    pct_indicacao: n(ac(/^via indicacao$/, E_PCT)),

    valorizacao_ano: n(ac(/^valorizacao no ano$/, E_PCT)),
    valorizacao_bairro: n(ac(/^valorizacao no (?!ano)/, E_PCT)),
    bairro: bairroLbl ? bairroLbl.s.replace(/^valoriza[cç][aã]o no\s+/i, "").trim() : null,
    valorizacao_trimestre: n(ac(/^no ultimo trimestre$/, E_PCT)),

    tempo_venda_meses: n(ac(/^tempo medio de anuncio entre os$/)),
    tempo_ativos_meses: n(ac(/^tempo medio dos imoveis do segmento$/)),
    valor_medio_saida: n(ac(/^valor medio dos imoveis que sairam/, E_DINHEIRO)),

    habitantes: n(ac(/^habitantes da regiao$/)),
    renda_media: n(ac(/^renda media do domicilio$/, E_DINHEIRO)),
  };

  // ranking de valorização de bairros: nome à esquerda, % na mesma linha
  const hRank = itens.find((i) => semAcento(i.s).toUpperCase().replace(/\s+/g, "").includes("RANKINGDEVALORIZACAO"));
  if (hRank) {
    e.ranking_valorizacao = itens
      .filter((i) => i.p === hRank.p && i.y < hRank.y - 20 && i.y > 40 && i.x < 120 && /^[A-Za-zÀ-ú ]{3,40}$/.test(i.s))
      .sort((a, b) => b.y - a.y)
      .map((nome) => {
        const pct = itens.find((i) => i.p === nome.p && Math.abs(i.y - nome.y) <= 5 && i.x > nome.x + 50 && E_PCT(i.s));
        return pct ? { bairro: nome.s, pct: n(pct.s) } : null;
      })
      .filter(Boolean);
  }
  // canais de contato
  const canais = ["WhatsApp", "Indicação (WhatsApp)", "Telefone"]
    .map((c) => ({ canal: c, pct: n(aoLado(itens, new RegExp(`^${rotulo(c).replace(/[()]/g, "\\$&")}$`), E_PCT)) }))
    .filter((c) => c.pct != null);
  if (canais.length) e.canais = canais;

  for (const k of Object.keys(e)) if (e[k] == null || (Array.isArray(e[k]) && !e[k].length)) delete e[k];
  const essenciais = ["preco_medio", "preco_m2_medio", "tempo_venda_meses"].filter((k) => e[k] != null).length;
  if (essenciais === 0) throw new Error("Não encontrei os indicadores no PDF. O layout do estudo pode ter mudado.");
  return e;
}
