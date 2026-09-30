// Homogeneização por fatores — método comparativo direto de dados de mercado (ABNT NBR 14653-2).
//
// Cada amostra é trazida às características do imóvel avaliado:
//   R$/m² homogeneizado = (preço / área) × Fo × Fa × Fv × Fq × Floc × Fpad × Fcons
// • Fo  (oferta): 0,90 para anúncio (desconto usual de negociação), 1,00 para negócio fechado.
// • Fa  (área), Fv (vagas), Fq (quartos): calculados A PARTIR DA PRÓPRIA AMOSTRA por regressão
//   (ln do R$/m² × ln da área, vagas, quartos) quando os dados sustentam; senão, fórmula consagrada
//   de área (Abunahman: expoente 1/4 até 30% de diferença, 1/8 de 30% a 150%) e vagas/quartos sem ajuste.
// • Floc, Fpad, Fcons: análise do corretor (inferior / semelhante / superior).
// Depois: saneamento (±30% da média), intervalo de confiança de 80% (t de Student),
// graus de precisão e de fundamentação (tabelas da NBR 14653-2) e campo de arbítrio (±15%).

export const PADRAO_CONFIG = {
  fatorOferta: 0.9,
  metodoArea: "auto",          // "auto" (derivado da amostra, com reserva na fórmula) | "formula" | "nenhum"
  coefQualitativo: { localizacao: 0.10, padrao: 0.10, conservacao: 0.10 },
  saneamento: 0.30,
  arbitrio: 0.15,
};

export const QUALITATIVOS = [
  ["localizacao", "Localização"], ["padrao", "Padrão / acabamento"], ["conservacao", "Conservação"],
];

// t de Student unicaudal 90% (= IC bicaudal de 80%) por graus de liberdade
const T90 = { 1: 3.078, 2: 1.886, 3: 1.638, 4: 1.533, 5: 1.476, 6: 1.44, 7: 1.415, 8: 1.397, 9: 1.383, 10: 1.372,
  11: 1.363, 12: 1.356, 13: 1.35, 14: 1.345, 15: 1.341, 16: 1.337, 17: 1.333, 18: 1.33, 19: 1.328, 20: 1.325,
  25: 1.316, 30: 1.31, 40: 1.303, 60: 1.296, 120: 1.289 };
function t90(gl) {
  if (gl <= 0) return null;
  if (T90[gl]) return T90[gl];
  const ks = Object.keys(T90).map(Number).sort((a, b) => a - b);
  const maior = ks.find((k) => k > gl);
  if (!maior) return 1.282;
  const menor = ks.filter((k) => k < gl).pop();
  return T90[menor] + (T90[maior] - T90[menor]) * ((gl - menor) / (maior - menor));
}

// Intervalo admissível do CONJUNTO de fatores por grau (NBR 14653-2, tratamento por fatores)
const INTERVALOS = { 3: [0.8, 1.25], 2: [0.5, 2.0], 1: [0.4, 2.5] };

// ---------------------------------------------------------------- regressão (mínimos quadrados)
function resolver(A, b) { // eliminação de Gauss com pivoteamento
  const n = A.length, M = A.map((l, i) => [...l, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let l = c + 1; l < n; l++) if (Math.abs(M[l][c]) > Math.abs(M[p][c])) p = l;
    if (Math.abs(M[p][c]) < 1e-12) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let l = 0; l < n; l++) {
      if (l === c) continue;
      const f = M[l][c] / M[c][c];
      for (let k = c; k <= n; k++) M[l][k] -= f * M[c][k];
    }
  }
  return M.map((l, i) => l[n] / l[i]);
}

function regressao(X, y) {
  const n = y.length, k = X[0].length;
  const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, l) => s + l[i] * l[j], 0)));
  const Xty = Array.from({ length: k }, (_, i) => X.reduce((s, l, r) => s + l[i] * y[r], 0));
  const beta = resolver(XtX, Xty);
  if (!beta) return null;
  const media = y.reduce((s, v) => s + v, 0) / n;
  const prev = X.map((l) => l.reduce((s, v, i) => s + v * beta[i], 0));
  const sqRes = y.reduce((s, v, i) => s + (v - prev[i]) ** 2, 0);
  const sqTot = y.reduce((s, v) => s + (v - media) ** 2, 0);
  const r2 = sqTot > 0 ? 1 - sqRes / sqTot : 0;
  // erro-padrão dos coeficientes (para t de significância)
  const s2 = n > k ? sqRes / (n - k) : null;
  const inv = s2 != null ? inversa(XtX) : null;
  const ep = inv ? inv.map((l, i) => Math.sqrt(Math.max(0, l[i] * s2))) : null;
  return { beta, r2, n, k, ep };
}
function inversa(A) {
  const n = A.length, cols = [];
  for (let j = 0; j < n; j++) {
    const e = Array.from({ length: n }, (_, i) => (i === j ? 1 : 0));
    const c = resolver(A, e);
    if (!c) return null;
    cols.push(c);
  }
  return A.map((_, i) => cols.map((c) => c[i]));
}

// ---------------------------------------------------------------- modelo derivado da amostra
/**
 * Ajusta ln(R$/m² × Fo) = a + b·ln(área) [+ c·vagas] [+ d·quartos] nas amostras.
 * Só usa uma variável se ela varia na amostra e se há dados suficientes (3 por coeficiente).
 * Aceita cada coeficiente só se tiver o sinal esperado, magnitude plausível e |t| ≥ 1,5
 * (evidência estatística razoável); caso contrário vale a fórmula consagrada.
 */
const T_MIN = 1.5;
export function derivarModelo(linhas) {
  const ok = linhas.filter((l) => l.vu > 0 && l.area > 0);
  const n = ok.length;
  const varia = (f) => new Set(ok.map(f).filter((v) => v != null)).size > 1 && ok.every((l) => f(l) != null);
  const vars = [["area", (l) => Math.log(l.area)]];
  if (varia((l) => l.vagas)) vars.push(["vagas", (l) => l.vagas]);
  if (varia((l) => l.quartos)) vars.push(["quartos", (l) => l.quartos]);
  while (vars.length && n < 3 * (vars.length + 1)) vars.pop(); // micronumerosidade
  const resultado = { n, usados: [], r2: null, expoenteArea: null, porVaga: null, porQuarto: null, motivo: null };
  if (!vars.length || !varia((l) => l.area)) { resultado.motivo = n < 6 ? "poucas amostras (mínimo 6)" : "áreas iguais nas amostras"; return resultado; }

  const X = ok.map((l) => [1, ...vars.map(([, f]) => f(l))]);
  const y = ok.map((l) => Math.log(l.vu * l.fo));
  const reg = regressao(X, y);
  if (!reg) { resultado.motivo = "dados colineares"; return resultado; }
  resultado.r2 = reg.r2;
  resultado.coeficientes = {};
  vars.forEach(([nome], i) => {
    const b = reg.beta[i + 1], ep = reg.ep?.[i + 1];
    const tStat = ep ? Math.abs(b / ep) : 0;
    resultado.coeficientes[nome] = { b, t: tStat };
    if (nome === "area" && b < 0 && b > -0.6 && tStat >= T_MIN) { resultado.expoenteArea = -b; resultado.usados.push("área"); }
    if (nome === "vagas" && b > 0 && b < 0.2 && tStat >= T_MIN) { resultado.porVaga = Math.exp(b) - 1; resultado.usados.push("vagas"); }
    if (nome === "quartos" && b > 0 && b < 0.2 && tStat >= T_MIN) { resultado.porQuarto = Math.exp(b) - 1; resultado.usados.push("quartos"); }
  });
  if (!resultado.usados.length) resultado.motivo = "a amostra não mostrou relação consistente";
  return resultado;
}

// ---------------------------------------------------------------- homogeneização
/**
 * @param alvo    { area, vagas, quartos }
 * @param amostras [{ id, price, area, parking, bedrooms }]
 * @param ajustes  { [id]: { transacao, localizacao, padrao, conservacao (-1|0|1), excluir } }
 * @param config   PADRAO_CONFIG (parcial)
 */
export function homogeneizar(alvo, amostras, ajustes = {}, config = {}) {
  const cfg = { ...PADRAO_CONFIG, ...config, coefQualitativo: { ...PADRAO_CONFIG.coefQualitativo, ...(config.coefQualitativo || {}) } };
  const A = Number(alvo.area) || null;
  const base = amostras.filter((c) => Number(c.price) > 0 && Number(c.area) > 0).map((c) => {
    const aj = ajustes[c.id] || {};
    return { id: c.id, endereco: c.address, preco: Number(c.price), area: Number(c.area), vu: Number(c.price) / Number(c.area),
      vagas: c.parking ?? null, quartos: c.bedrooms ?? null, fo: aj.transacao ? 1 : cfg.fatorOferta, aj, excluidaManual: !!aj.excluir };
  });
  const resultado = { alvo: { area: A, vagas: alvo.vagas ?? null, quartos: alvo.quartos ?? null }, config: cfg, linhas: [], modelo: null, estatistica: null, avisos: [] };
  if (!A) { resultado.avisos.push("Informe a área privativa do imóvel avaliado."); return resultado; }
  if (!base.length) { resultado.avisos.push("Nenhuma amostra com preço e área."); return resultado; }

  const modelo = cfg.metodoArea === "auto" ? derivarModelo(base.filter((l) => !l.excluidaManual)) : null;
  resultado.modelo = modelo;

  for (const l of base) {
    const f = { oferta: l.fo };
    // área
    const razao = l.area / A, dif = Math.abs(razao - 1);
    if (cfg.metodoArea === "nenhum") f.area = 1;
    else if (modelo?.expoenteArea != null) f.area = razao ** modelo.expoenteArea;
    else f.area = dif > 1.5 ? null : razao ** (dif <= 0.3 ? 0.25 : 0.125);
    // vagas e quartos (só com coeficiente derivado da amostra)
    f.vagas = modelo?.porVaga != null && l.vagas != null && alvo.vagas != null ? (1 + modelo.porVaga) ** (alvo.vagas - l.vagas) : 1;
    f.quartos = modelo?.porQuarto != null && l.quartos != null && alvo.quartos != null ? (1 + modelo.porQuarto) ** (alvo.quartos - l.quartos) : 1;
    // qualitativos: amostra superior ao avaliado → reduz; inferior → aumenta
    for (const [k] of QUALITATIVOS) {
      const nivel = Number(l.aj[k] || 0), c = cfg.coefQualitativo[k] || 0;
      f[k] = nivel > 0 ? 1 / (1 + c) : nivel < 0 ? 1 + c : 1;
    }
    const conjunto = f.area == null ? null : Object.entries(f).filter(([k]) => k !== "oferta").reduce((p, [, v]) => p * v, 1);
    resultado.linhas.push({ ...l, fatores: f, conjunto, vh: conjunto == null ? null : l.vu * l.fo * conjunto });
  }

  // ---- saneamento: descarta fora de ±30% da média, repetindo até estabilizar
  let validas = resultado.linhas.filter((l) => !l.excluidaManual && l.vh != null);
  for (const l of resultado.linhas) l.status = l.excluidaManual ? "excluída pelo corretor" : l.vh == null ? "área muito diferente (fora de 150%)" : "usada";
  for (let i = 0, max = validas.length; i < max && validas.length > 2; i++) {
    const m = validas.reduce((s, l) => s + l.vh, 0) / validas.length;
    const fora = validas.filter((l) => Math.abs(l.vh / m - 1) > cfg.saneamento);
    if (!fora.length) break;
    // tira só a mais distante por rodada (evita descartar demais de uma vez)
    const pior = fora.sort((a, b) => Math.abs(b.vh / m - 1) - Math.abs(a.vh / m - 1))[0];
    pior.status = `saneamento: ${((pior.vh / m - 1) * 100).toFixed(0)}% da média`;
    validas = validas.filter((l) => l !== pior);
  }

  // ---- estatística
  const n = validas.length;
  if (n < 3) { resultado.avisos.push("São necessárias ao menos 3 amostras válidas (grau I da NBR 14653-2)."); return resultado; }
  const vs = validas.map((l) => l.vh);
  const media = vs.reduce((s, v) => s + v, 0) / n;
  const dp = Math.sqrt(vs.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1));
  const t = t90(n - 1);
  const semi = t * dp / Math.sqrt(n);
  const ic = [media - semi, media + semi];
  const amplitude = (ic[1] - ic[0]) / media;
  const grauPrecisao = amplitude <= 0.3 ? 3 : amplitude <= 0.4 ? 2 : amplitude <= 0.5 ? 1 : 0;

  // grau de fundamentação (itens mensuráveis: nº de dados e intervalo do conjunto de fatores)
  const fatores = validas.map((l) => l.conjunto);
  const dentro = (g) => {
    const [mn, mx] = n < 5 ? INTERVALOS[3] : INTERVALOS[g];
    return fatores.every((f) => f >= mn && f <= mx);
  };
  const grauDados = n >= 12 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0;
  const grauFatores = dentro(3) ? 3 : dentro(2) ? 2 : dentro(1) ? 1 : 0;
  // fatores só da análise do corretor (sem estudo) limitam a fundamentação ao grau II
  const usaQualitativo = validas.some((l) => QUALITATIVOS.some(([k]) => Number(l.aj[k] || 0) !== 0));
  const grauFonte = usaQualitativo ? 2 : 3;
  const grauFundamentacao = Math.min(grauDados, grauFatores, grauFonte);
  const valorUnitario = media;
  const valorTotal = valorUnitario * A;

  resultado.estatistica = {
    n, media, dp, cv: dp / media, t, ic, amplitude, grauPrecisao,
    graus: { dados: grauDados, fatores: grauFatores, fonte: grauFonte }, grauFundamentacao,
    valorUnitario, valorTotal,
    arbitrio: [valorTotal * (1 - cfg.arbitrio), valorTotal * (1 + cfg.arbitrio)],
    intervaloTotal: [ic[0] * A, ic[1] * A],
  };
  if (grauFatores === 0) resultado.avisos.push("Há amostras com conjunto de fatores fora do intervalo admissível (0,40 a 2,50): troque-as por amostras mais parecidas com o imóvel.");
  if (n < 5 && grauFatores < 3) resultado.avisos.push("Com menos de 5 amostras, a norma pede conjunto de fatores entre 0,80 e 1,25.");
  return resultado;
}

export const ROMANO = ["fora da norma", "I", "II", "III"];
