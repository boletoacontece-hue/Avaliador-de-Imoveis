import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, ExternalLink, Save, Eye, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { enviarFoto as uploadFoto, removerFoto as apagarFoto } from "../lib/imagem";
import { hora, linkPublico, montarEndereco } from "../lib/format";
import { Carregando, useToast } from "../components/ui";
import TabImovel from "../components/editor/TabImovel";
import TabPercepcoes from "../components/editor/TabPercepcoes";
import TabComparativos from "../components/editor/TabComparativos";
import TabValor from "../components/editor/TabValor";
import TabMercado from "../components/editor/TabMercado";

const CAMPOS_EVAL = ["title", "client_name", "property_cep", "property_street", "property_number", "property_complement",
  "property_neighborhood", "property_city", "property_state", "property_condo_name", "property_type", "property_area",
  "property_bedrooms", "property_suites", "property_bathrooms", "property_parking", "property_floor", "property_elevator",
  "property_latitude", "property_longitude", "property_description", "evaluation_type", "advantages", "concerns",
  "suggested_value", "suggested_value_description", "ai_strategy", "final_notes",
  // laudos (0003)
  "report_type", "property_code", "interested_party", "purpose", "occupancy", "current_rent", "area_total", "condo_fee",
  "iptu_value", "iptu_registration", "registry_number", "features", "market_value", "negotiation_min", "negotiation_max",
  "target_days", "portal_study"];
const NUM_EVAL = new Set(["property_area", "property_bedrooms", "property_suites", "property_bathrooms", "property_parking",
  "property_floor", "property_latitude", "property_longitude", "suggested_value", "current_rent", "area_total", "condo_fee",
  "iptu_value", "market_value", "negotiation_min", "negotiation_max", "target_days"]);
const CAMPOS_COMP = ["address", "price", "area", "bedrooms", "suites", "parking", "source_url", "source_name", "thumbnail_url",
  "facade_url", "broker_observations", "latitude", "longitude", "sort_order", "advertiser"];
const NUM_COMP = new Set(["price", "area", "bedrooms", "suites", "parking", "latitude", "longitude", "sort_order"]);

const AUTOSAVE_MS = 5000;

function paraNumero(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
// campos obrigatórios no banco: campo apagado no formulário volta ao padrão
const PADROES = { negotiation_min: 3, negotiation_max: 7, target_days: 120, report_type: "completo", features: [] };

function montarPayload(obj, campos, numericos) {
  const p = {};
  for (const k of campos) {
    let v = obj[k];
    if (numericos.has(k)) v = paraNumero(v);
    else if (typeof v === "string") v = v.trim() === "" ? null : v;
    if (v == null && k in PADROES) v = PADROES[k];
    p[k] = v;
  }
  return p;
}

const ABAS = [["imovel", "Imóvel"], ["percepcoes", "Percepções"], ["comparativos", "Comparativos"], ["mercado", "Mercado"], ["valor", "Valor"]];

export default function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState(null);
  const [comps, setComps] = useState([]);
  const [vendidas, setVendidas] = useState([]);
  const [views, setViews] = useState(null);
  const [aba, setAba] = useState("imovel");
  const [erroCarga, setErroCarga] = useState("");
  const [status, setStatus] = useState({ tipo: "salvo", em: null });
  const [versao, setVersao] = useState(0);
  const [toast, avisar] = useToast();

  // estado "vivo" para o salvamento (evita closures desatualizadas)
  const fRef = useRef(null); fRef.current = f;
  const compsRef = useRef([]); compsRef.current = comps;
  const vendRef = useRef([]); vendRef.current = vendidas;
  const sujo = useRef({ eval: false, comps: new Set(), vend: new Set() });
  const updatedAt = useRef(null);
  const salvando = useRef(false);
  const pendente = useRef(false);
  const salvarRef = useRef(null);

  const temAlteracoes = () => sujo.current.eval || sujo.current.comps.size > 0 || sujo.current.vend.size > 0;
  const marcar = () => setVersao((v) => v + 1);

  // ---------- carga ----------
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [ev, cp, sv, vw] = await Promise.all([
        supabase.from("evaluations").select("*").eq("id", id).maybeSingle(),
        supabase.from("comparative_properties").select("*").eq("evaluation_id", id).order("sort_order").order("created_at"),
        supabase.from("sold_samples").select("*").eq("evaluation_id", id).order("sort_order").order("created_at"),
        supabase.from("link_views").select("id", { count: "exact", head: true }).eq("evaluation_id", id),
      ]);
      if (!vivo) return;
      if (ev.error || !ev.data) { setErroCarga(ev.error?.message || "Avaliação não encontrada ou sem permissão de acesso."); return; }
      updatedAt.current = ev.data.updated_at;
      setF(ev.data); setComps(cp.data || []); setVendidas(sv.data || []); setViews(vw.count ?? 0);
      setStatus({ tipo: "salvo", em: new Date(ev.data.updated_at) });
    })();
    return () => { vivo = false; };
  }, [id]);

  // ---------- salvamento ----------
  const salvar = useCallback(async () => {
    if (salvando.current) { pendente.current = true; return true; }
    if (!temAlteracoes()) return true;
    salvando.current = true;
    setStatus({ tipo: "salvando" });

    // captura o que está sujo e limpa já: edições feitas durante o envio marcam de novo
    const evalSujo = sujo.current.eval; sujo.current.eval = false;
    const compIds = [...sujo.current.comps]; sujo.current.comps.clear();
    const vendIds = [...sujo.current.vend]; sujo.current.vend.clear();
    let ok = true;

    try {
      if (evalSujo) {
        const cur = fRef.current;
        const payload = montarPayload(cur, CAMPOS_EVAL, NUM_EVAL);
        payload.advantages = (cur.advantages || []).map((s) => s.trim()).filter(Boolean);
        payload.concerns = (cur.concerns || []).map((s) => s.trim()).filter(Boolean);
        payload.property_address = montarEndereco(cur) || null;
        // trava otimista: só grava se ninguém alterou desde a última leitura
        const { data, error } = await supabase.from("evaluations").update(payload)
          .eq("id", id).eq("updated_at", updatedAt.current).select("updated_at");
        if (error) throw error;
        if (!data?.length) {
          sujo.current.eval = true;
          compIds.forEach((c) => sujo.current.comps.add(c));
          vendIds.forEach((v) => sujo.current.vend.add(v));
          setStatus({ tipo: "conflito" });
          salvando.current = false;
          return false;
        }
        updatedAt.current = data[0].updated_at;
      }
      for (const cid of compIds) {
        const c = compsRef.current.find((x) => x.id === cid);
        if (!c) continue;
        const { error } = await supabase.from("comparative_properties").update(montarPayload(c, CAMPOS_COMP, NUM_COMP)).eq("id", cid);
        if (error) throw error;
      }
      for (const vid of vendIds) {
        const v = vendRef.current.find((x) => x.id === vid);
        if (!v) continue;
        const { error } = await supabase.from("sold_samples")
          .update({ caption: v.caption?.trim() || null, image_url: v.image_url, sort_order: v.sort_order }).eq("id", vid);
        if (error) throw error;
      }
      setStatus({ tipo: "salvo", em: new Date() });
    } catch (err) {
      ok = false;
      if (evalSujo) sujo.current.eval = true;
      compIds.forEach((c) => sujo.current.comps.add(c));
      vendIds.forEach((v) => sujo.current.vend.add(v));
      setStatus({ tipo: "erro", msg: err.message });
    } finally {
      salvando.current = false;
    }
    if (pendente.current) { pendente.current = false; return salvarRef.current(); }
    return ok;
  }, [id]);
  salvarRef.current = salvar;

  // auto-save: 5 s depois da última alteração
  useEffect(() => {
    if (!versao) return;
    setStatus((s) => (s.tipo === "salvando" || s.tipo === "conflito" ? s : { ...s, tipo: "pendente" }));
    const t = setTimeout(() => salvarRef.current(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [versao]);

  // aviso ao fechar a aba com alterações; ao sair da tela pelo menu, grava o que falta
  useEffect(() => {
    const antes = (e) => { if (temAlteracoes()) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", antes);
    return () => { window.removeEventListener("beforeunload", antes); if (temAlteracoes()) salvarRef.current(); };
  }, []);

  // ---------- edição da avaliação ----------
  // atualiza a referência na hora (o salvamento pode rodar antes do próximo render)
  const setVarios = useCallback((obj) => {
    fRef.current = { ...fRef.current, ...obj };
    setF(fRef.current); sujo.current.eval = true; marcar();
  }, []);
  const set = useCallback((k, v) => setVarios({ [k]: v }), [setVarios]);

  async function manterMinhas() {
    const { data } = await supabase.from("evaluations").select("updated_at").eq("id", id).single();
    if (data) updatedAt.current = data.updated_at;
    setStatus({ tipo: "pendente" });
    await salvarRef.current();
  }

  async function alternarAtivo() {
    const ok = await salvarRef.current();
    if (!ok) return;
    const novo = !fRef.current.is_active;
    const { data, error } = await supabase.from("evaluations").update({ is_active: novo })
      .eq("id", id).eq("updated_at", updatedAt.current).select("updated_at");
    if (error || !data?.length) { avisar(error ? `Erro: ${error.message}` : "A avaliação mudou em outro lugar. Recarregue a página."); return; }
    updatedAt.current = data[0].updated_at;
    fRef.current = { ...fRef.current, is_active: novo }; setF(fRef.current);
    avisar(novo ? "Link público ativado" : "Link público desativado");
  }

  async function copiarLink() {
    const url = linkPublico(f.short_code);
    try { await navigator.clipboard.writeText(url); avisar("Link copiado"); }
    catch { window.prompt("Copie o link:", url); }
  }

  async function voltar() {
    const ok = await salvarRef.current();
    if (!ok && !window.confirm("Há alterações que não foram salvas. Sair mesmo assim?")) return;
    nav("/dashboard");
  }

  // ---------- comparativos ----------
  const acoes = {
    adicionar: async () => {
      const { data, error } = await supabase.from("comparative_properties")
        .insert({ evaluation_id: id, sort_order: compsRef.current.length }).select("*").single();
      if (error) return avisar(`Erro: ${error.message}`);
      compsRef.current = [...compsRef.current, data]; setComps(compsRef.current);
    },
    alterar: (cid, patch) => {
      compsRef.current = compsRef.current.map((c) => (c.id === cid ? { ...c, ...patch } : c));
      setComps(compsRef.current);
      sujo.current.comps.add(cid); marcar();
    },
    enviarFoto: async (cid, campo, file) => {
      const antiga = compsRef.current.find((c) => c.id === cid)?.[campo];
      const url = await uploadFoto(file, id);
      acoes.alterar(cid, { [campo]: url });
      if (await salvarRef.current()) apagarFoto(antiga).catch(() => {});
    },
    removerFoto: async (cid, campo) => {
      const antiga = compsRef.current.find((c) => c.id === cid)?.[campo];
      acoes.alterar(cid, { [campo]: null });
      if (await salvarRef.current()) apagarFoto(antiga).catch(() => {});
    },
    excluir: async (c) => {
      if (!window.confirm(`Excluir a amostra${c.address ? ` “${c.address}”` : ""}?`)) return;
      const { error } = await supabase.from("comparative_properties").delete().eq("id", c.id);
      if (error) return avisar(`Erro: ${error.message}`);
      sujo.current.comps.delete(c.id);
      compsRef.current = compsRef.current.filter((x) => x.id !== c.id); setComps(compsRef.current);
      apagarFoto(c.thumbnail_url).catch(() => {}); apagarFoto(c.facade_url).catch(() => {});
    },
    reordenar: (novaLista) => {
      compsRef.current = novaLista.map((c, i) => ({ ...c, sort_order: i }));
      setComps(compsRef.current);
      novaLista.forEach((c) => sujo.current.comps.add(c.id)); marcar();
    },
    importar: async (itens) => {
      const base = compsRef.current.length;
      const linhas = itens.map((it, i) => ({ ...it, evaluation_id: id, sort_order: base + i }));
      const { data, error } = await supabase.from("comparative_properties").insert(linhas).select("*");
      if (error) return avisar(`Erro na importação: ${error.message}`);
      compsRef.current = [...compsRef.current, ...data]; setComps(compsRef.current);
      avisar(`${data.length} amostras importadas`);
    },
    adicionarVendida: async (file) => {
      const url = await uploadFoto(file, id);
      const { data, error } = await supabase.from("sold_samples")
        .insert({ evaluation_id: id, image_url: url, sort_order: vendRef.current.length }).select("*").single();
      if (error) { apagarFoto(url).catch(() => {}); throw error; }
      vendRef.current = [...vendRef.current, data]; setVendidas(vendRef.current);
    },
    trocarVendida: async (vid, file) => {
      const antiga = vendRef.current.find((v) => v.id === vid)?.image_url;
      const url = await uploadFoto(file, id);
      vendRef.current = vendRef.current.map((v) => (v.id === vid ? { ...v, image_url: url } : v));
      setVendidas(vendRef.current);
      sujo.current.vend.add(vid);
      if (await salvarRef.current()) apagarFoto(antiga).catch(() => {});
    },
    legendaVendida: (vid, caption) => {
      vendRef.current = vendRef.current.map((v) => (v.id === vid ? { ...v, caption } : v));
      setVendidas(vendRef.current);
      sujo.current.vend.add(vid); marcar();
    },
    excluirVendida: async (v) => {
      if (!window.confirm("Remover este print?")) return;
      const { error } = await supabase.from("sold_samples").delete().eq("id", v.id);
      if (error) return avisar(`Erro: ${error.message}`);
      sujo.current.vend.delete(v.id);
      vendRef.current = vendRef.current.filter((x) => x.id !== v.id); setVendidas(vendRef.current);
      apagarFoto(v.image_url).catch(() => {});
    },
  };

  // ---------- render ----------
  if (erroCarga) return (
    <main className="pagina"><div className="vazio"><h3>Não foi possível abrir a avaliação</h3><p>{erroCarga}</p>
      <button className="btn btn-sec" onClick={() => nav("/dashboard")}>Voltar às avaliações</button></div></main>
  );
  if (!f) return <Carregando />;

  const statusEl = {
    salvando: <span className="status-salvo"><Loader2 size={14} className="giro-icone" /> Salvando…</span>,
    pendente: <span className="status-salvo pendente">Alterações não salvas</span>,
    salvo: <span className="status-salvo"><CheckCircle2 size={14} /> Último salvamento: {hora(status.em)}</span>,
    erro: <span className="status-salvo erro" title={status.msg}><AlertTriangle size={14} /> Erro ao salvar</span>,
    conflito: <span className="status-salvo erro"><AlertTriangle size={14} /> Conflito de edição</span>,
  }[status.tipo];

  return (
    <>
      <div className="barra-editor">
        <div className="barra-editor-in">
          <button className="btn btn-ghost btn-icone" onClick={voltar} aria-label="Voltar"><ArrowLeft size={19} /></button>
          <div className="titulo">
            <b>{f.client_name || f.property_address || "Nova avaliação"}</b>
            <span style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {statusEl}
              {views != null && <span className="status-salvo" title="Aberturas do link pelo cliente"><Eye size={14} /> {views} {views === 1 ? "visualização" : "visualizações"}</span>}
            </span>
          </div>
          <div className="acoes">
            <label className="interruptor" title="Com o link inativo, o cliente vê só o seu cartão de contato">
              <input type="checkbox" checked={f.is_active} onChange={alternarAtivo} />
              <span className="trilho" /> <span className="rotulo-longo">{f.is_active ? "Ativo" : "Inativo"}</span>
            </label>
            <a className="btn btn-sec btn-icone" href={linkPublico(f.short_code)} target="_blank" rel="noreferrer" aria-label="Abrir página do cliente" title="Abrir página do cliente"><ExternalLink size={17} /></a>
            <button className="btn btn-sec" onClick={copiarLink}><Copy size={16} /><span className="rotulo-longo">Copiar link</span></button>
            <button className="btn" onClick={() => salvarRef.current()} disabled={status.tipo === "salvando"}><Save size={16} /><span className="rotulo-longo">Salvar</span></button>
          </div>
        </div>
      </div>

      <main className="pagina" style={{ paddingTop: 8 }}>
        {status.tipo === "conflito" && (
          <div className="aviso aviso-ambar" style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 240 }}>Esta avaliação foi alterada em outro dispositivo depois que você a abriu. Escolha qual versão vale.</span>
            <button className="btn btn-sec btn-sm" onClick={() => window.location.reload()}>Carregar a outra versão</button>
            <button className="btn btn-sm" onClick={manterMinhas}>Manter as minhas alterações</button>
          </div>
        )}
        {status.tipo === "erro" && <div className="aviso aviso-ambar" style={{ marginTop: 16 }}>Não foi possível salvar: {status.msg}. Tentaremos de novo na próxima alteração, ou clique em Salvar.</div>}

        <div className="abas" role="tablist">
          {ABAS.map(([k, r]) => (
            <button key={k} role="tab" aria-selected={aba === k} onClick={() => setAba(k)}>
              {r}
              {k === "comparativos" && <span className="cont">{comps.length}</span>}
              {k === "percepcoes" && <span className="cont">{(f.advantages?.length || 0) + (f.concerns?.length || 0)}</span>}
            </button>
          ))}
        </div>

        {aba === "imovel" && <TabImovel f={f} set={set} setVarios={setVarios} />}
        {aba === "percepcoes" && <TabPercepcoes f={f} set={set} />}
        {aba === "comparativos" && <TabComparativos f={f} comps={comps} vendidas={vendidas} acoes={acoes} />}
        {aba === "mercado" && <TabMercado f={f} set={set} />}
        {aba === "valor" && <TabValor f={f} set={set} comps={comps} salvarAntes={() => salvarRef.current()} />}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 8 }}>
          {ABAS.findIndex(([k]) => k === aba) > 0
            ? <button className="btn btn-sec" onClick={() => setAba(ABAS[ABAS.findIndex(([k]) => k === aba) - 1][0])}>Anterior</button> : <span />}
          {ABAS.findIndex(([k]) => k === aba) < ABAS.length - 1
            ? <button className="btn" onClick={() => setAba(ABAS[ABAS.findIndex(([k]) => k === aba) + 1][0])}>Próxima: {ABAS[ABAS.findIndex(([k]) => k === aba) + 1][1]}</button>
            : <a className="btn" href={linkPublico(f.short_code)} target="_blank" rel="noreferrer">Ver como o cliente vê</a>}
        </div>
      </main>
      {toast}
    </>
  );
}
