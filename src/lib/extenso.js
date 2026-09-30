// Valor por extenso em reais (pt-BR): 365000 → "trezentos e sessenta e cinco mil reais"
const UNID = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze",
  "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n) {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), r = n % 100;
  const partes = [];
  if (c) partes.push(CEM[c]);
  if (r) partes.push(r < 20 ? UNID[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ` e ${UNID[r % 10]}` : ""));
  return partes.join(" e ");
}

const ESCALAS = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]];

function inteiroPorExtenso(n) {
  if (n === 0) return "zero";
  const grupos = [];
  while (n > 0) { grupos.push(n % 1000); n = Math.floor(n / 1000); }
  const partes = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (!g) continue;
    const nome = i === 1 && g === 1 ? "mil" : `${ate999(g)}${i ? ` ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}` : ""}`;
    partes.push({ texto: nome, valor: g, i });
  }
  // "e" antes do último grupo quando ele é < 100 ou centena redonda (ex.: "mil e duzentos", "dois mil e cinquenta")
  return partes.map((p, k) => {
    if (k === 0) return p.texto;
    const ultimo = k === partes.length - 1;
    if (ultimo && (p.valor < 100 || p.valor % 100 === 0)) return ` e ${p.texto}`;
    // depois de milhão/bilhão, vírgula (escrita usual em documentos); depois de mil, só espaço
    return `${partes[k - 1].i >= 2 ? "," : ""} ${p.texto}`;
  }).join("").replace(/\s+/g, " ").trim();
}

export function porExtenso(valor) {
  if (valor == null || !Number.isFinite(Number(valor))) return "";
  const total = Math.round(Number(valor) * 100);
  const reais = Math.floor(total / 100), centavos = total % 100;
  const partes = [];
  if (reais) {
    const txt = inteiroPorExtenso(reais);
    // "um milhão de reais", "dois milhões de reais" (milhão/bilhão redondos levam "de")
    const de = reais >= 1e6 && reais % 1e6 === 0 ? " de" : "";
    partes.push(`${txt}${de} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.join(" e ") || "zero reais";
}
