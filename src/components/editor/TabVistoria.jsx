import React, { useEffect, useRef, useState } from "react";
import { ehApp, fotoDaCamera } from "../../lib/nativo";
import { Camera, Images, Plus, Trash2, X, ShieldCheck } from "lucide-react";
import { Campo } from "../ui";
import { comprimirJpeg, enviarPrivado, linksTemporarios, removerPrivado } from "../../lib/privado";
import { mensagemErro } from "../../lib/versao";

export const CONSERVACAO = ["Novo", "Ótimo", "Bom", "Regular", "Necessita reparos", "Em reforma"];
export const PADRAO = ["Simples", "Normal", "Alto", "Luxo"];
const SUGESTOES = ["Fachada", "Área comum / portaria", "Sala", "Cozinha", "Quarto", "Suíte", "Banheiro", "Área de serviço", "Varanda", "Garagem", "Vista"];
const MAX_FOTOS = 60;
const novoId = () => Math.random().toString(36).slice(2, 10);

export default function TabVistoria({ f, set, atual }) {
  const v = f.inspection || {};
  const ambientes = v.ambientes || [];
  const [links, setLinks] = useState({});
  const [enviando, setEnviando] = useState({});
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState("");
  const totalFotos = ambientes.reduce((s, a) => s + (a.fotos?.length || 0), 0);

  const salvar = (patch) => set("inspection", { ...v, ...patch });
  const setAmbientes = (lista) => salvar({ ambientes: lista });

  // links temporários para as fotos (o armazenamento é privado)
  const caminhos = ambientes.flatMap((a) => (a.fotos || []).map((ft) => ft.path));
  useEffect(() => {
    const faltam = caminhos.filter((c) => !links[c]);
    if (faltam.length) linksTemporarios(faltam).then((novos) => setLinks((l) => ({ ...l, ...novos })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminhos.join("|")]);

  function adicionarAmbiente(nome) {
    const n = (nome || "").trim();
    if (!n) return;
    setAmbientes([...ambientes, { id: novoId(), nome: n, fotos: [] }]);
    setNovo("");
  }

  async function enviarFotos(amb, arquivos) {
    setErro("");
    const lista = [...arquivos].slice(0, Math.max(0, MAX_FOTOS - totalFotos));
    if (!lista.length) return setErro(`Limite de ${MAX_FOTOS} fotos por vistoria.`);
    setEnviando((e) => ({ ...e, [amb.id]: lista.length }));
    const novas = [];
    for (const arq of lista) {
      try {
        const caminho = await enviarPrivado(await comprimirJpeg(arq), `${f.id}/vistoria`);
        novas.push({ path: caminho, legenda: "" });
      } catch (e) { setErro(mensagemErro(e)); }
      setEnviando((e) => ({ ...e, [amb.id]: Math.max(0, (e[amb.id] || 1) - 1) }));
    }
    // aplica sobre o estado MAIS RECENTE (legendas e outras fotos podem ter mudado durante o envio)
    const vAgora = atual()?.inspection || {};
    set("inspection", { ...vAgora, ambientes: (vAgora.ambientes || []).map((a) => (a.id === amb.id ? { ...a, fotos: [...(a.fotos || []), ...novas] } : a)) });
    setEnviando((e) => ({ ...e, [amb.id]: 0 }));
  }

  function setLegenda(amb, i, legenda) {
    setAmbientes(ambientes.map((a) => (a.id === amb.id ? { ...a, fotos: a.fotos.map((ft, k) => (k === i ? { ...ft, legenda } : ft)) } : a)));
  }
  async function removerFoto(amb, i) {
    const foto = amb.fotos[i];
    setAmbientes(ambientes.map((a) => (a.id === amb.id ? { ...a, fotos: a.fotos.filter((_, k) => k !== i) } : a)));
    removerPrivado([foto.path]).catch(() => {});
  }
  async function removerAmbiente(amb) {
    if (amb.fotos?.length && !window.confirm(`Remover “${amb.nome}” e as ${amb.fotos.length} fotos?`)) return;
    setAmbientes(ambientes.filter((a) => a.id !== amb.id));
    removerPrivado((amb.fotos || []).map((ft) => ft.path)).catch(() => {});
  }

  return (
    <>
      <section className="painel">
        <h2>Vistoria do imóvel</h2>
        <p className="dica">Dados da visita ao imóvel avaliado. No PTAM, viram o item de vistoria e o relatório fotográfico (exigidos pelo COFECI).</p>
        <div className="grade g4" style={{ marginTop: 12 }}>
          <Campo rotulo="Data da vistoria"><input type="date" className="input" value={v.data || ""} onChange={(e) => salvar({ data: e.target.value })} /></Campo>
          <Campo rotulo="Estado de conservação">
            <select className="select" value={v.conservacao || ""} onChange={(e) => salvar({ conservacao: e.target.value })}>
              <option value="">—</option>{CONSERVACAO.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Padrão de acabamento">
            <select className="select" value={v.padrao || ""} onChange={(e) => salvar({ padrao: e.target.value })}>
              <option value="">—</option>{PADRAO.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Acompanhou a vistoria" dica="Ex.: proprietário, inquilino, síndico (sem nomes)">
            <input className="input" value={v.acompanhante || ""} onChange={(e) => salvar({ acompanhante: e.target.value })} />
          </Campo>
        </div>
        <Campo rotulo="Observações da vistoria" className="span-all" style={{ marginTop: 12 }}>
          <textarea className="textarea" rows={3} value={v.observacoes || ""} placeholder="Estado geral, reformas, infiltrações, itens que pesam no valor…"
            onChange={(e) => salvar({ observacoes: e.target.value })} />
        </Campo>
      </section>

      <section className="painel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h2>Fotos por ambiente</h2>
            <p className="dica" style={{ margin: 0 }}>{totalFotos} de {MAX_FOTOS} fotos. No celular, “Câmera” abre a câmera direto.</p>
          </div>
          <span className="selo-privacidade"><ShieldCheck size={14} /> Fotos guardadas de forma privada: só você e os gestores veem. Não vão para o link do cliente.</span>
        </div>

        <div className="sugestoes-ambiente">
          {SUGESTOES.filter((s) => !ambientes.some((a) => a.nome === s)).map((s) => (
            <button key={s} type="button" className="chip-add" onClick={() => adicionarAmbiente(s)}><Plus size={13} /> {s}</button>
          ))}
          <span className="novo-ambiente">
            <input className="input" placeholder="Outro ambiente" value={novo} onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarAmbiente(novo); } }} />
            <button type="button" className="btn btn-sec btn-sm" onClick={() => adicionarAmbiente(novo)}><Plus size={14} /> Adicionar</button>
          </span>
        </div>
        {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}

        {ambientes.length === 0 && <p className="dica" style={{ marginTop: 14 }}>Escolha os ambientes acima para começar a fotografar.</p>}
        {ambientes.map((amb) => (
          <Ambiente key={amb.id} amb={amb} links={links} enviando={enviando[amb.id] || 0}
            onRenomear={(nome) => setAmbientes(ambientes.map((a) => (a.id === amb.id ? { ...a, nome } : a)))}
            onEnviar={(arqs) => enviarFotos(amb, arqs)} onLegenda={(i, t) => setLegenda(amb, i, t)}
            onRemoverFoto={(i) => removerFoto(amb, i)} onRemover={() => removerAmbiente(amb)} />
        ))}
      </section>
    </>
  );
}

function Ambiente({ amb, links, enviando, onRenomear, onEnviar, onLegenda, onRemoverFoto, onRemover }) {
  const camera = useRef(), galeria = useRef();
  const escolher = (ref) => ref.current?.click();
  // no aplicativo, a câmera nativa (orientação corrigida); no navegador, o seletor com captura
  async function usarCamera() {
    if (!ehApp) return escolher(camera);
    try { const foto = await fotoDaCamera(); if (foto) onEnviar([foto]); }
    catch (e) { alert(e.message); }
  }
  const aoEscolher = (e) => { const a = [...(e.target.files || [])]; e.target.value = ""; if (a.length) onEnviar(a); };
  return (
    <div className="ambiente">
      <div className="ambiente-topo">
        <input className="input ambiente-nome" value={amb.nome} onChange={(e) => onRenomear(e.target.value)} aria-label="Nome do ambiente" />
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn btn-sec btn-sm" onClick={usarCamera}><Camera size={15} /> Câmera</button>
          <button type="button" className="btn btn-sec btn-sm" onClick={() => escolher(galeria)}><Images size={15} /> Galeria</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRemover} aria-label="Remover ambiente"><Trash2 size={15} /></button>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={aoEscolher} />
        <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={aoEscolher} />
      </div>
      <div className="fotos-vistoria">
        {(amb.fotos || []).map((ft, i) => (
          <figure key={ft.path} className="foto-vistoria">
            <div className="moldura">
              {links[ft.path] ? <img src={links[ft.path]} alt={ft.legenda || amb.nome} loading="lazy" /> : <span className="giro-mini" />}
              <button type="button" className="tirar" onClick={() => onRemoverFoto(i)} aria-label="Remover foto"><X size={14} /></button>
            </div>
            <input className="input legenda" placeholder="Legenda (opcional)" value={ft.legenda || ""} onChange={(e) => onLegenda(i, e.target.value)} />
          </figure>
        ))}
        {enviando > 0 && Array.from({ length: enviando }).map((_, i) => (
          <figure key={`env${i}`} className="foto-vistoria"><div className="moldura carregando-foto"><span className="giro-mini" /> enviando…</div></figure>
        ))}
        {!amb.fotos?.length && !enviando && <p className="dica" style={{ margin: 0 }}>Nenhuma foto ainda.</p>}
      </div>
    </div>
  );
}
