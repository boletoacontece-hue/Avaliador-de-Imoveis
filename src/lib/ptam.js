// PTAM — Parecer Técnico de Avaliação Mercadológica (Resolução COFECI 1.066/2007; Ato Normativo COFECI 001/2011).
// Checklist do roteiro mínimo e textos padrão do parecer.
import { homogeneizar } from "./homogeneizacao";
import { brlDec, num } from "./format";
import { porExtenso } from "./extenso";

/** Homogeneização é obrigatória no PTAM: calcula mesmo que "incluir no laudo" esteja desmarcado. */
export function homogeneizacaoPtam(av, comps) {
  const h = av.homogenization || {};
  return homogeneizar({ area: av.property_area, vagas: av.property_parking, quartos: av.property_bedrooms }, comps, h.ajustes || {}, h.config || {});
}

export const fotosDaVistoria = (av) => (av.inspection?.ambientes || []).flatMap((a) => (a.fotos || []).map((f) => ({ ...f, ambiente: a.nome })));

/**
 * Itens do roteiro do PTAM. obrigatorio=false: recomendado, mas não bloqueia.
 * @param extra { perfil: {name, creci_number, cnai_number, bio}, temAssinatura }
 */
export function checklistPtam(av, comps, extra = {}) {
  const p = extra.perfil || {};
  const cert = av.registry_sheet;
  const amostrasComFonte = comps.filter((c) => c.price > 0 && c.area > 0 && (c.source_name || c.source_url || c.advertiser)).length;
  const hom = homogeneizacaoPtam(av, comps).estatistica;
  const fotos = fotosDaVistoria(av).length;
  return [
    { ok: !!av.interested_party?.trim(), rotulo: "Solicitante", onde: "aba Imóvel → Dados do laudo (Interessado)" },
    { ok: !!(av.purpose?.trim() || av.evaluation_type), rotulo: "Finalidade / objetivo", onde: "aba Imóvel → Dados do laudo" },
    { ok: !!av.property_street && av.property_area > 0, rotulo: "Identificação, endereço e área do imóvel", onde: "aba Imóvel" },
    { ok: !!(cert?.matricula || av.registry_number || av.tax_sheet?.cadastro?.matricula), rotulo: "Matrícula e cartório", onde: "aba Documentos → certidão ou cadastro do GDF" },
    { ok: !!av.inspection?.data, rotulo: "Data da vistoria", onde: "aba Vistoria" },
    { ok: fotos > 0, rotulo: `Relatório fotográfico (${fotos} ${fotos === 1 ? "foto" : "fotos"})`, onde: "aba Vistoria" },
    { ok: amostrasComFonte >= 3, rotulo: `Amostras com fonte identificada (${amostrasComFonte}; mínimo 3)`, onde: "aba Comparativos" },
    { ok: !!hom && hom.n >= 3, rotulo: "Homogeneização das amostras", onde: "aba Fatores" },
    { ok: av.market_value > 0, rotulo: "Valor de mercado", onde: "aba Fatores → “Usar como valor de mercado” ou aba Valor" },
    { ok: av.property_latitude != null, rotulo: "Croqui de localização (posição do imóvel)", onde: "aba Imóvel → localizar no mapa" },
    { ok: !!p.name && !!p.creci_number && !!p.cnai_number, rotulo: "Avaliador: nome, CRECI e CNAI", onde: "Meu perfil" },
    { ok: !!p.bio?.trim(), rotulo: "Breve currículo do avaliador", onde: "Meu perfil" },
    { ok: !!av.ptam?.selo_path, rotulo: "Selo Certificador", onde: "esta aba → PTAM" },
    { ok: !!extra.temAssinatura, rotulo: "Assinatura digitalizada", onde: "Meu perfil (sem ela, fica a linha para assinar à mão)", obrigatorio: false },
    { ok: !!cert, rotulo: "Certidão de matrícula atualizada", onde: "aba Documentos; anexe o PDF ao baixar", obrigatorio: false },
  ].map((i) => ({ obrigatorio: true, ...i }));
}

export const METODOLOGIA_PTAM = "Adotou-se o Método Comparativo Direto de Dados de Mercado, nos termos da ABNT NBR 14653-1 e 14653-2, que identifica o valor de mercado do imóvel por meio do tratamento técnico dos atributos de elementos comparáveis que constituem a amostra. Os dados foram homogeneizados por fatores (item 7), com saneamento dos valores discrepantes, cálculo do intervalo de confiança de 80% e definição do valor dentro do campo de arbítrio admitido pela norma.";

export function ressalvasPtam(av) {
  return [
    "Este parecer baseia-se em documentos e informações fornecidos pelo solicitante e em dados de mercado coletados até a data de referência, presumidos verdadeiros e obtidos de boa-fé.",
    av.registry_sheet ? "A situação documental considera a certidão de matrícula apresentada; não foram realizadas outras pesquisas sobre títulos, ônus ou ações." : "Não foi apresentada certidão de matrícula; não foram realizadas pesquisas sobre títulos, ônus ou ações.",
    "A vistoria foi visual, sem ensaios técnicos; vícios ocultos e aspectos estruturais não foram objeto de análise.",
    "O valor apurado refere-se à data de referência deste parecer e pode variar com as condições de mercado.",
    "Parecer elaborado nos termos da Lei nº 6.530/78, da Resolução COFECI nº 1.066/2007 e do Ato Normativo COFECI nº 001/2011.",
  ];
}

export function conclusaoPtam(av, est, dataRef) {
  const mercado = Number(av.market_value) || null;
  const oferta = Number(av.suggested_value) || null;
  const partes = [];
  if (mercado) partes.push(`Com base na pesquisa de mercado e no tratamento das amostras, conclui-se que o valor de mercado do imóvel, na data de referência de ${dataRef}, é de ${brlDec(mercado)} (${porExtenso(mercado)})${av.property_area ? `, correspondente a R$ ${num(Math.round(mercado / av.property_area))}/m² de área privativa` : ""}.`);
  if (est) partes.push(`O valor encontra-se ${mercado && mercado >= est.arbitrio[0] && mercado <= est.arbitrio[1] ? "dentro do" : "em relação ao"} campo de arbítrio de ${brlDec(est.arbitrio[0])} a ${brlDec(est.arbitrio[1])}, com grau de fundamentação ${["fora da norma", "I", "II", "III"][est.grauFundamentacao]} e grau de precisão ${["fora da norma", "I", "II", "III"][est.grauPrecisao]}.`);
  if (oferta && mercado && oferta !== mercado) partes.push(`Para fins de comercialização, recomenda-se valor de oferta de ${brlDec(oferta)} (${porExtenso(oferta)}), que preserva margem para negociação.`);
  return partes.join(" ");
}

export const dataPorExtenso = (iso) => {
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
};
export const dataCurtaBr = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "");
