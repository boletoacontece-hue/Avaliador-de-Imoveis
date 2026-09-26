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
};
