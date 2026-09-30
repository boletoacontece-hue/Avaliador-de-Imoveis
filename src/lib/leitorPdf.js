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
/** Texto de tudo à direita do rótulo, na mesma linha, até o próximo rótulo. */
function restoDaLinha(itens, re, filtro) {
  for (const r of achar(itens, re, filtro)) {
    const partes = [];
    for (const i of itens.filter((i) => i.p === r.p && Math.abs(i.y - r.y) <= 4.5 && i.x > r.x + 1).sort((a, b) => a.x - b.x)) {
      if (/[.:]\s*$/.test(i.s) || /\.{3,}/.test(i.s)) break; // começou outro rótulo
      partes.push(i.s);
    }
    if (partes.length) return partes.join(" ");
  }
  return null;
}
const data = (s) => ((s || "").replace(/\s+/g, "").match(/\d{2}\/\d{2}\/\d{4}/) || [])[0] || null;
const simNao = (s) => (s == null ? null : /^s/i.test(s.trim()) ? true : /^n/i.test(s.trim()) ? false : null);

/**
 * Lê a ficha do imóvel do Imobiliar (ficha completa ou "Consulta de imóveis") e devolve
 * TODOS os dados do imóvel e da locação úteis ao laudo — nenhum dado de pessoa.
 */
export function lerFichaImobiliar(itens) {
  const tudo = itens.map((i) => i.s).join(" ");
  if (!/ficha do im[oó]vel/i.test(tudo)) throw new Error("Este PDF não parece uma ficha de imóvel do Imobiliar.");

  // zona proibida: do cabeçalho PROPRIETÁRIO(S) até CARACTERÍSTICAS (dados pessoais e bancários)
  const cab = (re) => itens.find((i) => re.test(semAcento(i.s).toUpperCase().replace(/\s+/g, "")));
  const hProp = cab(/^PROPRIETARIO\(S\)$/), hCarac = cab(/^CARACTERISTICAS$/);
  const permitido = (i) => !(hProp && i.p === hProp.p && i.y <= hProp.y + 2 && (!hCarac || i.y > hCarac.y + 2));
  const base = itens.filter(permitido);
  const v = (re, valida) => aoLado(base, re, valida);
  const linha = (re) => restoDaLinha(base, re);
  const nDec = (re) => numeroBr(v(re, (s) => /^[\d.,]+$/.test(s)));
  const completa = !!hCarac;

  const f = { formato: completa ? "Ficha do imóvel (completa)" : "Consulta de imóveis" };
  const emissao = itens.find((i) => i.p === 1 && /\d{2}\/\s?\d{2}\/\s?\d{4}\s+\d{2}:\d{2}/.test(i.s));
  f.emitida_em = emissao ? data(emissao.s) : null;

  // ---- identificação
  f.codigo = v(/^codigo$/, (s) => /^\d+$/.test(s));
  f.endereco_ficha = v(/^endereco$/);
  f.cep = v(/^cep$/, (s) => /\d{5}-?\d{3}/.test(s)) || (tudo.match(/CEP:?\s*(\d{5}-?\d{3})/i) || [])[1] || null;
  if (f.endereco_ficha) {
    const { rua, complemento } = separarEndereco(f.endereco_ficha);
    f.rua = rua;
    f.complemento = complemento || null;
    const ultimo = f.endereco_ficha.split(" - ").pop().trim();
    if (/^[A-Za-zÀ-ú ]{3,30}$/.test(ultimo) && !UNIDADE.test(ultimo)) f.bairro = titulo(ultimo);
  }
  const bairro = v(/^bairro$/, (s) => /^[A-Za-zÀ-ú ]{3,40}$/.test(s));
  if (bairro) f.bairro = titulo(bairro);
  const cidade = v(/^cidade$/, (s) => /^[A-Za-zÀ-ú ]{3,40}$/.test(s));
  f.cidade = cidade ? titulo(cidade).replace(/^Brasilia$/, "Brasília") : "Brasília";
  f.uf = v(/^uf$/, (s) => /^[A-Z]{2}$/.test(s)) || "DF";
  f.tipo_ficha = v(/^tipo d[eo] imovel$/);
  f.tipo = tipoPadrao(f.tipo_ficha);
  f.data_inclusao = data(v(/^data de inclusao$/));
  f.classificacao = v(/^classificacao$/, (s) => /^[A-ZÀ-Ú ]{3,20}$/.test(s));
  f.para_venda = simNao(v(/^para venda$/));
  f.para_locacao = simNao(v(/^para locacao$/));

  // ---- áreas e composição
  f.area_privativa = nDec(/^metragem$/);
  f.area_total = nDec(/^2[ªa] metragem$/);
  f.dormitorios = numeroBr(v(/^n[ºo°]? ?dormitorios$/, (s) => /^\d+$/.test(s)));
  f.vagas = numeroBr(v(/^garagem$/, (s) => /^\d+$/.test(s)));

  // ---- condomínio e custos
  f.edificio = v(/^nome$/);
  const adm = v(/^administradora$/);
  f.administradora_condominio = adm ? adm.replace(/^\d+-/, "").trim() : null;
  f.condominio_inicial = nDec(/^vlr cond\.? inicial$/);
  f.iptu_parcela = nDec(/^(vlr parcela iptu|parcela do iptu)$/);
  const imed = v(/^imediacoes$/) || "";
  const seguro = imed.match(/seguro\s+inc[eê]ndio\s*R?\$?\s*([\d.,]+)/i);
  f.seguro_incendio = seguro ? numeroBr(seguro[1]) : null;

  // ---- documentação
  f.inscricao_iptu = v(/^inscricao do iptu$/, (s) => /^[\d./-]+$/.test(s));
  f.matricula = v(/^matricula reg ?imoveis$/, (s) => /\d/.test(s) && E_TEXTO(s));
  f.zona_registro = v(/^zona reg ?imoveis$/, (s) => /\w/.test(s) && E_TEXTO(s));

  // ---- locação (só dados do contrato — nunca do locatário)
  const status = v(/^status$/);
  f.situacao = status ? (/desocup|vago|livre/i.test(status) ? "desocupado" : /ocup|alug/i.test(status) ? "alugado" : null) : null;
  f.aluguel_atual = nDec(/^vlr\.? aluguel atual$/);
  f.aluguel_pretendido = nDec(/^vlr\.? alug\.? pretendido$/);
  const vig = linha(/^vigencia$/) || "";
  const datas = vig.replace(/\s+/g, "").match(/\d{2}\/\d{2}\/\d{4}/g) || [];
  f.vigencia_inicio = datas[0] || null;
  f.vigencia_fim = datas[1] || null;
  f.prazo_contrato_meses = numeroBr((vig.match(/\((\d+)\s*mes/i) || [])[1]);
  f.indice_reajuste = v(/^indice de reajuste$/);
  f.periodicidade_reajuste = v(/^periodicidade reaj$/);
  f.proximo_reajuste = data(v(/^proximo reajuste$/));
  f.garantia = v(/^tipo fianca$/);

  // ---- DOCs: último condomínio cobrado e aluguel faturado nos meses listados
  const hCond = base.find((i) => i.s === "Cond");
  const hAlug = base.find((i) => i.s === "Alug.Calc");
  if (hCond || hAlug) {
    const comps = base.filter((i) => /^\d{2}\/\d{4}$/.test(i.s) && i.x < 60).sort((a, b) => a.p - b.p || b.y - a.y);
    const naLinha = (c, h) => {
      const it = base.find((i) => i.p === c.p && Math.abs(i.y - c.y) <= 3 && Math.abs(i.x - h.x) < 25 && /^[\d.,]+$/.test(i.s));
      return it ? numeroBr(it.s) : null;
    };
    if (hCond && comps.length) f.condominio = naLinha(comps[0], hCond);
    if (hAlug && comps.length) {
      const valores = comps.map((c) => naLinha(c, hAlug)).filter((x) => x > 0);
      if (valores.length) {
        f.aluguel_faturado = Math.round(valores.reduce((a, b) => a + b, 0) * 100) / 100;
        f.aluguel_faturado_meses = valores.length;
        f.aluguel_faturado_periodo = `${comps[comps.length - 1].s} a ${comps[0].s}`;
      }
    }
  }
  f.condominio = f.condominio || nDec(/^condominio$/) || f.condominio_inicial;
  const alugVenda = nDec(/^aluguel\/venda$/);   // consulta de imóveis
  if (!f.aluguel_atual && alugVenda > 0) f.aluguel_atual = alugVenda;

  // ---- características (ficha completa) e descrição (consulta)
  const carac = [];
  if (hCarac) {
    const fim = cab(/^DOCS$/) || cab(/^OBSERVACOES$/);
    for (const i of base) {
      if (i.p !== hCarac.p || i.y >= hCarac.y - 2 || (fim && fim.p === i.p && i.y <= fim.y + 2)) continue;
      if (/^(caracteristicas (internas|gerais)|qtde|complemento)\.?$/i.test(rotulo(i.s)) || /^[\d.,]+$/.test(i.s)) continue;
      carac.push(frase(i.s));
    }
  }
  f.caracteristicas = [...new Set(carac)];
  f.descricao = base.filter((i) => /^-\s+\S/.test(i.s)).sort((a, b) => a.p - b.p || b.y - a.y).map((i) => i.s.replace(/^-\s+/, "").replace(/\.$/, ""));
  const andar = [...f.caracteristicas, ...f.descricao].join(" ").match(/(\d{1,2})\s*[ºo°]\s*andar|\b(t[eé]rreo)\b/i);
  f.andar = andar ? (andar[2] ? 0 : Number(andar[1])) : null;

  for (const k of Object.keys(f)) if (f[k] == null || f[k] === "" || (Array.isArray(f[k]) && !f[k].length)) delete f[k];
  return f;
}

/** Campos da avaliação preenchidos a partir da ficha. */
export function fichaParaAvaliacao(f) {
  const a = {
    property_code: f.codigo, property_cep: f.cep, property_street: f.rua, property_complement: f.complemento,
    property_neighborhood: f.bairro, property_city: f.cidade, property_state: f.uf, property_type: f.tipo,
    property_condo_name: f.edificio, property_area: f.area_privativa, area_total: f.area_total,
    property_bedrooms: f.dormitorios, property_parking: f.vagas, property_floor: f.andar,
    occupancy: f.situacao, current_rent: f.situacao === "alugado" ? f.aluguel_atual : undefined,
    condo_fee: f.condominio, iptu_value: f.iptu_parcela, iptu_registration: f.inscricao_iptu, registry_number: f.matricula,
    features: [...(f.caracteristicas || []), ...(f.descricao || [])],
  };
  for (const k of Object.keys(a)) if (a[k] == null || a[k] === "" || (Array.isArray(a[k]) && !a[k].length)) delete a[k];
  return a;
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

// ------------------------------------------------------------ ficha de IPTU (SEFAZ-DF)
// "Pauta IPTU/TLP por imóvel" do site da Receita do DF.
// Lê inscrição, endereço fiscal e o histórico ano a ano. Proprietário e CPF/CNPJ nunca são lidos.
const COLUNAS_IPTU = [
  [/^bc do iptu$/, "base_calculo"], [/^aliq iptu$/, "aliquota"], [/^vlr iptu$/, "iptu"], [/^% ?var iptu$/, "var_iptu"],
  [/^bc tlp$/, "base_tlp"], [/^coef tp$/, "coef_tlp"], [/^vlr tlp$/, "tlp"], [/^% ?var tlp$/, "var_tlp"],
];

export function lerFichaIptu(itens) {
  const tudo = itens.map((i) => i.s).join(" ");
  if (!/pauta iptu\/tlp/i.test(tudo)) throw new Error("Este PDF não parece a Pauta IPTU/TLP da Receita do DF.");
  const v = (re, valida) => aoLado(itens, re, valida);
  const f = { fonte: "Receita do DF (SEFAZ-DF) · Pauta IPTU/TLP por imóvel" };
  f.inscricao = v(/^imovel$/, (s) => /^\d{5,}$/.test(s));
  f.endereco_fiscal = v(/^endereco$/);
  const gerado = tudo.match(/às\s+(\d{2}:\d{2})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  f.emitida_em = gerado ? gerado[2] : null;

  // colunas pelo cabeçalho; cada linha começa com o ano
  const cols = [];
  for (const it of itens) {
    const c = COLUNAS_IPTU.find(([re]) => re.test(rotulo(it.s)));
    if (c) cols.push({ x: it.x, chave: c[1], p: it.p });
  }
  const anos = itens.filter((i) => /^(19|20)\d{2}$/.test(i.s) && i.x < 80);
  f.historico = anos.map((a) => {
    const linha = { ano: Number(a.s) };
    for (const it of itens.filter((i) => i.p === a.p && Math.abs(i.y - a.y) <= 3 && i.x > a.x + 10)) {
      const col = cols.filter((c) => c.p === a.p).sort((c1, c2) => Math.abs(c1.x - it.x) - Math.abs(c2.x - it.x))[0];
      if (col && Math.abs(col.x - it.x) < 35) linha[col.chave] = numeroBr(it.s);
    }
    return linha;
  }).filter((l) => l.base_calculo != null).sort((a, b) => b.ano - a.ano);

  if (!f.historico.length) throw new Error("Não encontrei a tabela de valores do IPTU no PDF.");
  const atual = f.historico[0];
  f.ano = atual.ano;
  f.valor_venal = atual.base_calculo;
  f.aliquota = atual.aliquota;
  f.iptu_anual = atual.iptu;
  f.tlp_anual = atual.tlp;
  // mudança de alíquota recente (ex.: reclassificação de uso) vale nota no laudo
  const anterior = f.historico[1];
  if (anterior && anterior.aliquota !== atual.aliquota)
    f.mudanca_aliquota = { de: anterior.aliquota, para: atual.aliquota, ano: atual.ano };
  // valorização do valor venal em 5 anos
  const cinco = f.historico.find((h) => h.ano === atual.ano - 5);
  if (cinco?.base_calculo) f.variacao_venal_5a = Math.round(((atual.base_calculo / cinco.base_calculo) - 1) * 1000) / 10;

  for (const k of Object.keys(f)) if (f[k] == null) delete f[k];
  return f;
}

// ------------------------------------------------------------ PDF → imagens (para leitura por IA)
// Certidões costumam ser escaneadas (sem texto). Cada página vira um JPEG comprimido:
// o envio fica leve (~200 KB por página) e funciona para PDF escaneado ou digital.
export async function paginasComoImagens(arquivo, { maxPaginas = 12, larguraMax = 1150, qualidade = 0.72 } = {}) {
  const pdf = await pdfjs();
  const dados = new Uint8Array(await arquivo.arrayBuffer());
  const doc = await pdf.getDocument({ data: dados, isEvalSupported: false }).promise;
  const total = doc.numPages;
  const paginas = [];
  for (let p = 1; p <= Math.min(total, maxPaginas); p++) {
    const pagina = await doc.getPage(p);
    const base = pagina.getViewport({ scale: 1 });
    const escala = Math.min(2.2, larguraMax / base.width);
    const vp = pagina.getViewport({ scale: escala });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, viewport: vp }).promise;
    paginas.push(canvas.toDataURL("image/jpeg", qualidade).split(",")[1]);
  }
  await doc.destroy();
  return { paginas, total, cortado: total > maxPaginas };
}
