// O que o agente da Acontece sabe da tela atual. O editor publica um resumo da avaliação aberta
// (sem nomes de cliente); o assistente lê na hora de enviar a pergunta.
let atual = null;
export function publicarContexto(ctx) { atual = ctx; }
export function lerContexto() { return atual; }
export function limparContexto() { atual = null; }

/** O agente pode pedir para abrir uma aba do editor: o texto traz [[aba:fatores]]. */
export const pedirAba = (aba) => window.dispatchEvent(new CustomEvent("agente:aba", { detail: aba }));
