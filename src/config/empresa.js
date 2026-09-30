// Conteúdo institucional da página pública — edite aqui, sem mexer nos componentes.
export const EMPRESA = {
  nome: "Acontece Imobiliária",
  razao: "Acontece Assessoria e Planejamento Imobiliário",
  creci: "CRECI 4996-DF",
  rede: "Rede RE/MAX",
  apresentacao:
    "Somos uma imobiliária de Brasília especializada em administração, locação e venda de imóveis. " +
    "Cada estudo de valor parte de dados reais de mercado e da experiência de quem acompanha diariamente " +
    "milhares de imóveis na cidade.",
  // Números animados em "Quem somos" — confirme antes de publicar
  estatisticas: [
    { valor: 3000, prefixo: "+", sufixo: "", rotulo: "imóveis administrados" },
    { valor: 3, prefixo: "", sufixo: "", rotulo: "escritórios em Brasília" },
  ],
  // Par de fotos do MESMO imóvel para "Foto amadora × profissional".
  // Enquanto estiver null, o card mostra só o texto explicativo.
  fotoAmadora: null,       // ex.: "educacao/amadora.webp" (arquivo em /public)
  fotoProfissional: null,  // ex.: "educacao/profissional.webp"

  // ---- dados dos laudos em PDF (timbrado) ----
  razaoCompleta: "ACONTECE Assessoria e Planejamento Imobiliário Ltda.",
  cnpj: "26.977.553/0001-92",
  creciPj: "CRECI/DF – 4996J",
  telefone: "(61) 3341-3535",
  cidadeLaudo: "Brasília/DF",
  unidades: [
    ["SEDE SUDOESTE", "CLSW 302, Bloco B, Lojas 57/69, Ed. Park Center, Brasília – DF"],
    ["FILIAL ÁGUAS CLARAS", "Rua 25 Norte, Lote 02, Loja 02, Ed. Viviane Rinaldi, Brasília – DF"],
    ["FILIAL NOROESTE", "CLNW 10/11, Bloco I, Loja 05, Ed. Acontece Center, Brasília – DF"],
  ],
  rodapeLaudo: "CLSW 302, Bloco “B”, Lojas 57/69, Edifício Park Center, Sudoeste, Brasília/DF · Tel.: (61) 3341-3535",
  notaTecnica: "Este documento constitui uma Opinião de Valor Mercadológico para orientação comercial, elaborada em observância às resoluções do COFECI e aos preceitos gerais da ABNT NBR 14.653.",
};
