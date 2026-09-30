// Conteúdo institucional da página pública — edite aqui, sem mexer nos componentes.
export const EMPRESA = {
  nome: "Acontece Imobiliária",
  razao: "Acontece Assessoria e Planejamento Imobiliário",
  creci: "CRECI 4996-DF",
  apresentacao:
    "Somos uma imobiliária de Brasília especializada em administração, locação e venda de imóveis. " +
    "Cada estudo de valor parte de dados reais de mercado e da experiência de quem acompanha diariamente " +
    "milhares de imóveis na cidade.",
  // Números animados em "Quem somos" — confirme antes de publicar
  estatisticas: [
    { valor: 3000, prefixo: "+", sufixo: "", rotulo: "imóveis administrados" },
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
  // Regiões onde atuamos (página do cliente) e unidades do timbrado dos laudos
  unidades: [
    { tipo: "Matriz", regiao: "Sudoeste", endereco: "CLSW 302, Bloco B, Lojas 57/69", edificio: "Ed. Park Center", detalhe: "8 lojas em departamentos (sede própria)" },
    { tipo: "Filial", regiao: "Águas Claras", endereco: "Rua 25 Norte, Lote 02, Loja 02", edificio: "Ed. Viviane Rinaldi", detalhe: "1 loja dupla (própria)" },
    { tipo: "Filial", regiao: "Noroeste", endereco: "CLNW 10/11, Bloco I, Loja 05", edificio: "Ed. Acontece Center", detalhe: "1 loja dupla (própria)" },
  ],
  // Reconhecimentos (substituem a antiga menção à rede). icone: "medalha" | "coroa"
  reconhecimentos: [
    { titulo: "Selo Integridade", entidade: "CRECI/DF (26 empresas)", periodo: "2024/2025", icone: "medalha" },
    { titulo: "Selo Qualidade", entidade: "SECOVI/DF (30 empresas)", periodo: "Desde 2017", icone: "medalha" },
    { titulo: "Prêmio Master", entidade: "Portal DFImóveis", periodo: "1º Aluguel — 2025", icone: "coroa" },
    { titulo: "Destaque Aluguel", entidade: "Portal Wimóveis", periodo: "2024", icone: "medalha" },
    { titulo: "Categoria Diamante", entidade: "Clube Loft (3 empresas)", periodo: "2024/2025", icone: "coroa" },
    { titulo: "Prêmio Colibri", entidade: "Assoc. Corretores de Imóveis/DF", periodo: "2020 a 2025", icone: "medalha" },
    { titulo: "Troféu Elite", entidade: "Porto Seguro Seguradora", periodo: "2023 e 2024", icone: "coroa" },
  ],
  fraseReconhecimento: "7 prêmios em 2 anos = excelência consistente.",
  rodapeLaudo: "CLSW 302, Bloco “B”, Lojas 57/69, Edifício Park Center, Sudoeste, Brasília/DF · Tel.: (61) 3341-3535",
  notaTecnica: "Este documento constitui uma Opinião de Valor Mercadológico para orientação comercial, elaborada em observância às resoluções do COFECI e aos preceitos gerais da ABNT NBR 14.653.",
};
