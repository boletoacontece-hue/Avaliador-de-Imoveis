import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Send, X, ArrowRight, RotateCcw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { lerContexto, pedirAba } from "../lib/contextoAgente";
import { mensagemErro } from "../lib/versao";

// Agente "Inteligência Artificial da Acontece" (n8n, com a base de conhecimento da casa) como guia do Avaliador.
const CHAVE = "avaliador-agente";
const SUGESTOES = {
  editor: ["O que falta nesta avaliação?", "Como faço o PTAM?", "Como funciona a homogeneização?", "Que amostras devo usar?"],
  geral: ["Como começo uma avaliação?", "Qual laudo devo usar?", "O que é o PTAM?", "Como uso o aplicativo?"],
};
const NOME_TELA = { "/dashboard": "lista de avaliações", "/painel": "painel do gestor", "/equipe": "equipe", "/profile": "meu perfil" };

const sessaoInicial = () => {
  try { const s = JSON.parse(sessionStorage.getItem(CHAVE)); if (s?.id) return s; } catch { /* nada salvo */ }
  return { id: Math.random().toString(36).slice(2, 12), msgs: [] };
};

// texto do agente → elementos (negrito, listas, quebras); sem HTML vindo de fora
function Formatado({ texto }) {
  const linhas = texto.split(/\n/);
  const inline = (t, k) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={`${k}-${i}`}>{p.slice(2, -2)}</b> : p));
  const out = []; let lista = [];
  const fechar = () => { if (lista.length) { out.push(<ul key={`u${out.length}`}>{lista}</ul>); lista = []; } };
  linhas.forEach((l, i) => {
    const m = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (m) lista.push(<li key={i}>{inline(m[1], i)}</li>);
    else { fechar(); if (l.trim()) out.push(<p key={i}>{inline(l, i)}</p>); }
  });
  fechar();
  return <>{out}</>;
}

export default function AssistenteAcontece() {
  const { pathname } = useLocation();
  const [aberto, setAberto] = useState(false);
  const [sessao, setSessao] = useState(sessaoInicial);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const fim = useRef(null);
  const noEditor = pathname.startsWith("/evaluation/");

  useEffect(() => { try { sessionStorage.setItem(CHAVE, JSON.stringify(sessao)); } catch { /* cheio */ } }, [sessao]);
  useEffect(() => { fim.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [sessao.msgs, pensando, aberto]);

  function contexto() {
    const c = noEditor ? lerContexto() : null;
    const linhas = [`Tela: ${c?.tela || NOME_TELA[pathname] || "Avaliador de Imóveis"}${c?.aba ? ` (aba ${c.aba})` : ""}`];
    if (c) {
      linhas.push(`Avaliação aberta: laudo ${c.laudo || "—"}, ${c.operacao || "venda"}; imóvel: ${c.imovel || "—"}; amostras válidas: ${c.amostras}; valor de mercado: ${c.valor_mercado ?? "—"}; oferta: ${c.valor_oferta ?? "—"}`);
      linhas.push(`Etapas prontas: ${c.etapas_prontas || "nenhuma"}. Documentos: ${c.documentos}.`);
      if (c.falta_ptam) linhas.push(`Falta no PTAM: ${c.falta_ptam}.`);
      linhas.push(`Abas do editor (para indicar uma, escreva [[aba:CHAVE]]): ${c.abas}.`);
    }
    return linhas.join("\n");
  }

  async function enviar(pergunta) {
    const q = (pergunta ?? texto).trim();
    if (!q || pensando) return;
    setTexto("");
    const msgs = [...sessao.msgs, { de: "eu", t: q }];
    setSessao({ ...sessao, msgs }); setPensando(true);
    try {
      const { data, error } = await supabase.functions.invoke("acontece-n8n", { body: { modo: "agente", mensagem: q, sessao: sessao.id, contexto: contexto() } });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context.json()).erro || msg; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      setSessao((s) => ({ ...s, msgs: [...msgs, { de: "ia", t: data?.resposta || "Não consegui responder agora." }] }));
    } catch (e) {
      setSessao((s) => ({ ...s, msgs: [...msgs, { de: "ia", t: mensagemErro(e, "Não consegui falar com o agente agora."), erro: true }] }));
    }
    setPensando(false);
  }

  const sugestoes = SUGESTOES[noEditor ? "editor" : "geral"];
  // chave → nome da aba (ex.: ficha → Documentos), vindo do editor
  const nomesAbas = Object.fromEntries(String(lerContexto()?.abas || "").split(", ").filter(Boolean).map((p) => p.split("=")));
  return (
    <>
      {!aberto && (
        <button type="button" className={`agente-botao ${noEditor ? "no-editor" : ""}`} onClick={() => setAberto(true)} aria-label="Abrir a Inteligência Artificial da Acontece">
          <img src={`${import.meta.env.BASE_URL}logo-acontece-branco.png`} alt="" /><span>IA da Acontece</span>
        </button>
      )}
      {aberto && (
        <div className="agente-painel" role="dialog" aria-label="Inteligência Artificial da Acontece">
          <div className="agente-topo">
            <img src={`${import.meta.env.BASE_URL}logo-acontece-branco.png`} alt="" />
            <div><b>Inteligência Artificial da Acontece</b><small>Guia do Avaliador · base de conhecimento da casa</small></div>
            <button type="button" title="Nova conversa" aria-label="Nova conversa" onClick={() => setSessao({ id: Math.random().toString(36).slice(2, 12), msgs: [] })}><RotateCcw size={16} /></button>
            <button type="button" aria-label="Fechar" onClick={() => setAberto(false)}><X size={18} /></button>
          </div>
          <div className="agente-msgs">
            {!sessao.msgs.length && (
              <div className="agente-boasvindas">
                <p>Olá! Sou a IA da Acontece. Conheço o Avaliador, os laudos e o PTAM, as normas de avaliação e os procedimentos da casa.
                  {noEditor ? " Estou vendo a avaliação aberta: pergunte o que falta ou como seguir." : " Como posso ajudar?"}</p>
                <div className="agente-sugestoes">{sugestoes.map((s) => <button key={s} type="button" onClick={() => enviar(s)}>{s}</button>)}</div>
              </div>
            )}
            {sessao.msgs.map((m, i) => {
              const abas = m.de === "ia" ? [...new Set([...m.t.matchAll(/\[\[aba:([a-z]+)\]\]/gi)].map((x) => x[1].toLowerCase()))] : [];
              const limpo = m.t.replace(/\s*\[\[aba:[a-z]+\]\]/gi, "");
              return (
                <div key={i} className={`agente-msg ${m.de} ${m.erro ? "erro" : ""}`}>
                  {m.de === "ia" ? <Formatado texto={limpo} /> : limpo}
                  {noEditor && abas.length > 0 && (
                    <div className="agente-atalhos">{abas.filter((a) => nomesAbas[a]).map((a) => <button key={a} type="button" onClick={() => pedirAba(a)}>Abrir {nomesAbas[a]} <ArrowRight size={13} /></button>)}</div>
                  )}
                </div>
              );
            })}
            {pensando && <div className="agente-msg ia pensando"><span /><span /><span /></div>}
            <div ref={fim} />
          </div>
          <form className="agente-entrada" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
            <textarea rows={1} value={texto} placeholder="Pergunte sobre o Avaliador, laudos, PTAM…" onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
            <button type="submit" className="btn" disabled={pensando || !texto.trim()} aria-label="Enviar"><Send size={16} /></button>
          </form>
          <p className="agente-aviso">Respostas geradas por IA: confira antes de usar em documentos.</p>
        </div>
      )}
    </>
  );
}
