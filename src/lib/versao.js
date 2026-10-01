// Depois de uma publicação, uma aba aberta com a versão antiga tenta carregar arquivos
// (ex.: leitor de PDF, gerador de PDF, telas) que já foram substituídos no servidor.
// Isso não é defeito: basta recarregar a página. Aqui o erro vira uma orientação clara.
const PADROES = /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch dynamically|ChunkLoadError|Loading chunk/i;

export const ehVersaoNova = (erro) => PADROES.test(String(erro?.message || erro || ""));

export const AVISO_VERSAO = "O Avaliador foi atualizado enquanto esta página estava aberta. Recarregue a página (Ctrl + F5) e tente de novo; o que já foi salvo não se perde.";

/** Mensagem para o usuário: orientação de recarga quando for versão nova; senão, a mensagem original. */
export function mensagemErro(erro, padrao = "Algo deu errado. Tente de novo.") {
  if (ehVersaoNova(erro)) return AVISO_VERSAO;
  return erro?.message || padrao;
}
