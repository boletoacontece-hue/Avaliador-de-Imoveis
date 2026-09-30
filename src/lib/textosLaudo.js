// Textos-padrão dos laudos (modelos Acontece), montados com os dados da avaliação.
// O corretor pode editar qualquer seção ou pedir para a IA reescrever; em branco, vale o padrão.
import { brlDec as brl, num, precoM2, mediana, montarEndereco } from "./format";
import { porExtenso } from "./extenso";

export const SECOES_LAUDO = [
  ["apresentacao", "Apresentação", ["completo", "ptam"]],
  ["descricao", "Descrição do imóvel", ["cliente", "completo", "ptam"]],
  ["ocupacao", "Ocupação", ["cliente", "completo", "ptam"]],
  ["parametros", "Parâmetros de avaliação", ["cliente", "completo", "ptam"]],
  ["valor_mercado", "Valor de mercado", ["cliente", "completo", "ptam"]],
  ["valor_oferta", "Valor estratégico de oferta", ["cliente", "completo"]],
  ["observacoes", "Observações", ["cliente", "completo", "ptam"]],
  ["comercial", "Mensagem final", ["completo"]],
];

const pct = (v) => `${Number(v).toFixed(2).replace(".", ",")}%`;
const m2Txt = (v) => (v ? `R$ ${num(Math.round(v))}/m²` : null);
const frase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const lista = (itens) => (itens.length <= 1 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`);

export function textosPadrao(av, comps = []) {
  const aluguel = av.evaluation_type === "aluguel";
  const ficha = av.property_sheet || {};
  const iptu = av.tax_sheet || {};
  const estudo = av.portal_study || {};
  const tipo = (av.property_type || "imóvel").toLowerCase();
  const area = Number(av.property_area) || null;
  const m2s = comps.map((c) => precoM2(c.price, c.area)).filter(Boolean).sort((a, b) => a - b);
  const bairro = av.property_neighborhood || "região do imóvel";
  const mercado = Number(av.market_value) || null;
  const oferta = Number(av.suggested_value) || null;
  const dMin = Number(av.negotiation_min ?? 3), dMax = Number(av.negotiation_max ?? 7);
  const prazo = Number(av.target_days) || 120;
  const verbo = aluguel ? "locação" : "venda";

  // ---- descrição
  // destaques: sem repetir andar/dormitório; minúscula só na 1ª letra (preserva TV, CFTV…)
  const feats = (av.features || []).filter((f) => !/^(dormit|banheiro$)|andar|t[eé]rreo/i.test(f)).slice(0, 8)
    .map((f) => f.charAt(0).toLowerCase() + f.slice(1));
  const composicao = [
    av.property_bedrooms ? `${av.property_bedrooms} ${av.property_bedrooms === 1 ? "quarto" : "quartos"}` : null,
    av.property_suites ? `${av.property_suites} ${av.property_suites === 1 ? "suíte" : "suítes"}` : null,
    av.property_bathrooms ? `${av.property_bathrooms} ${av.property_bathrooms === 1 ? "banheiro" : "banheiros"}` : null,
    av.property_parking ? `${av.property_parking} ${av.property_parking === 1 ? "vaga de garagem" : "vagas de garagem"}` : null,
  ].filter(Boolean);
  const descricao = av.property_description?.trim() || [
    `${frase(tipo)}${area ? ` com área privativa de ${num(area)} m²` : ""}${av.area_total ? ` (área total de ${num(av.area_total)} m²)` : ""}${av.property_floor != null ? `, no ${av.property_floor === 0 ? "térreo" : `${av.property_floor}º andar`}` : ""}.`,
    composicao.length ? `Composto por ${lista(composicao)}.` : null,
    feats.length ? `Destaques: ${lista(feats)}.` : null,
    av.property_condo_name ? `Integra o ${av.property_condo_name}${av.condo_fee ? `, com condomínio de ${brl(av.condo_fee)} mensais` : ""}.` : null,
  ].filter(Boolean).join(" ");

  // ---- ocupação
  let ocupacao;
  if (av.occupancy === "alugado") {
    ocupacao = `Atualmente alugado${av.current_rent ? `, gerando uma rentabilidade mensal de ${brl(av.current_rent)}` : ""}.`;
    if (ficha.vigencia_fim) ocupacao += ` Contrato de locação vigente${ficha.vigencia_inicio ? ` desde ${ficha.vigencia_inicio}` : ""} até ${ficha.vigencia_fim}${ficha.indice_reajuste ? `, com reajuste pelo ${ficha.indice_reajuste.replace(/IGPM/i, "IGP-M").replace(/\s*ANO$/i, "")}` : ""}${ficha.garantia ? ` e garantia ${ficha.garantia}` : ""}.`;
    if (ficha.aluguel_faturado && ficha.aluguel_faturado_meses)
      ocupacao += ` Nos últimos ${ficha.aluguel_faturado_meses} meses foram faturados ${brl(ficha.aluguel_faturado)} em aluguéis.`;
  } else if (av.occupancy === "desocupado") {
    ocupacao = `Imóvel atualmente desocupado, pronto para uso imediato${aluguel ? "" : " ou disponibilização para locação tradicional ou de temporada"}.`;
  } else if (av.occupancy === "proprietario") {
    ocupacao = "Imóvel atualmente ocupado pelo proprietário.";
  } else ocupacao = "";

  // ---- parâmetros
  const partesParam = [];
  partesParam.push(`O estudo de mercado considerou imóveis semelhantes na mesma região (${bairro}), com amostragem de ${m2s.length || "diversas"} ofertas ativas.`);
  if (m2s.length >= 2) partesParam.push(`Os valores observados oscilam entre ${m2Txt(m2s[0])} e ${m2Txt(m2s.at(-1))}, com mediana de ${m2Txt(mediana(m2s))}, variando conforme o nível de benfeitorias, localização exata, visibilidade e estado de conservação.`);
  if (estudo.tempo_venda_meses) {
    partesParam.push(`Segundo o estudo de mercado ${estudo.fonte || "do portal"}${estudo.referencia ? ` de ${estudo.referencia}` : ""}, imóveis do mesmo segmento levaram em média ${num(estudo.tempo_venda_meses)} meses para sair de anúncio${estudo.preco_m2_medio ? `, com preço médio de ${m2Txt(estudo.preco_m2_medio)}` : ""}.`);
  } else {
    partesParam.push("A análise do ciclo de liquidez local indica tempo médio de exposição entre 90 e 180 dias, dependendo diretamente da precificação inicial.");
  }
  partesParam.push(`Diante disso, o posicionamento de ${verbo} foi definido de forma competitiva para maximizar a atratividade do ativo, reduzir o tempo de absorção, estimular visitas e propiciar propostas efetivas.`);
  if (iptu.valor_venal) partesParam.push(`Como referência fiscal, o valor venal atribuído pela Receita do DF para ${iptu.ano} é de ${brl(iptu.valor_venal)} (base de cálculo do IPTU), que não se confunde com o valor de mercado.`);
  const parametros = partesParam.join(" ");

  // ---- valores
  const baseM2 = area ? ` (considerando a área privativa de ${num(area)} m²)` : "";
  const valor_mercado = mercado
    ? `Definido tecnicamente em ${brl(mercado)} (${porExtenso(mercado)}), correspondendo a aproximadamente ${m2Txt(precoM2(mercado, area)) || "—"}${baseM2}. Este montante reflete o ponto de equilíbrio da análise comparativa das ofertas de imóveis semelhantes na região${av.occupancy === "alugado" && !aluguel ? ", ponderando a renda atual de locação" : ""}, e representa a real expectativa de liquidez para o cenário atual.`
    : "";
  const valor_oferta = oferta
    ? `O valor estimado de anúncio é de ${brl(oferta)} (${porExtenso(oferta)})${area ? `, correspondendo a ${m2Txt(precoM2(oferta, area))}` : ""}, o teto para iniciar os trabalhos de ${verbo}, adequado para comercialização em prazo médio (até ${prazo} dias). Este valor situa-se no limite superior admissível de mercado, fundamentado na elasticidade da demanda, conferindo a necessária margem de negociação sem depreciação do valor de mercado do ativo.`
    : "";

  // ---- observações
  const obs = [`Conforme a praxe do mercado imobiliário local, ${aluguel ? "interessados" : "compradores"} tendem a pleitear margens de desconto entre ${num(dMin)}% e ${num(dMax)}%. Dessa forma, estima-se que o valor final de fechamento orbitará com uma oscilação de aproximadamente ${num(Math.round((dMin + dMax) / 2))}% em relação ao preço de anúncio estratégico${mercado ? ", aproximando-se do valor técnico de avaliação" : ""}.`,
    "Flutuações intencionais no valor anunciado (em até 5% para mais ou para menos) podem ser utilizadas como gatilho estratégico nos portais imobiliários para reposicionamento e destaque do anúncio, com impacto direto no prazo de exposição."];
  if (av.occupancy === "alugado" && !aluguel) obs.push("O rendimento atual de locação constitui um atrativo adicional para investidores focados em retorno imediato.");
  if (iptu.mudanca_aliquota) obs.push(`A alíquota do IPTU passou de ${pct(iptu.mudanca_aliquota.de)} para ${pct(iptu.mudanca_aliquota.para)} em ${iptu.mudanca_aliquota.ano}, o que reduz o custo de manutenção do imóvel.`);

  return {
    apresentacao: "Este estudo foi desenvolvido com o objetivo de posicionar o imóvel de forma estratégica dentro do mercado, buscando não apenas determinar um valor justo, mas definir a melhor forma de venda. Mais do que uma avaliação tradicional, este material visa traduzir como o mercado pensa, reage e decide.",
    descricao, ocupacao, parametros, valor_mercado, valor_oferta,
    observacoes: obs.join("\n\n"),
    comercial: "Temos grande interesse em trabalhar para vocês, cuidar de todos os processos e dos negócios imobiliários e, para isso, divulgamos seu imóvel nos maiores e melhores veículos de vendas no DF e no Brasil, como os portais Wimóveis, DFImóveis, Lugar Certo, OLX e ZAP Imóveis, e ainda contamos com convênios com cartórios e toda a assessoria jurídica para fazer o melhor e mais seguro negócio. Oferecemos soluções. Isso só é possível porque nossas ações começam com você e seus interesses. Se você acredita, “ACONTECE”.",
  };
}

/** Texto final de cada seção: o editado pelo corretor ou, em branco, o padrão. */
export function textosFinais(av, comps) {
  const padrao = textosPadrao(av, comps);
  const editado = av.report_texts || {};
  const out = {};
  for (const [k] of SECOES_LAUDO) out[k] = (editado[k] ?? "").trim() || padrao[k];
  return out;
}

export function enderecoLaudo(av) {
  return [montarEndereco(av), av.property_code ? `Cód. ${av.property_code}` : null].filter(Boolean).join(" · ");
}
