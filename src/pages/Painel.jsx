import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ExternalLink, Trophy } from "lucide-react";
import { supabase } from "../lib/supabase";
import { brl, dataCurta, linkPublico } from "../lib/format";
import { Carregando, useToast } from "../components/ui";

const FaixasChart = lazy(() => import("../components/AdminCharts").then((m) => ({ default: m.FaixasChart })));
const BairrosValorChart = lazy(() => import("../components/AdminCharts").then((m) => ({ default: m.BairrosValorChart })));
const TiposPieChart = lazy(() => import("../components/MarketCharts").then((m) => ({ default: m.TiposPieChart })));
const Espera = ({ h = 260 }) => <div className="carregando" style={{ minHeight: h }}><div className="giro" /></div>;

const FAIXAS = {
  venda: [[0, 300e3, "até 300 mil"], [300e3, 500e3, "300–500 mil"], [500e3, 1e6, "500 mil–1 mi"],
    [1e6, 2e6, "1–2 mi"], [2e6, 5e6, "2–5 mi"], [5e6, Infinity, "acima de 5 mi"]],
  aluguel: [[0, 1500, "até 1,5 mil"], [1500, 3000, "1,5–3 mil"], [3000, 5000, "3–5 mil"],
    [5000, 10000, "5–10 mil"], [10000, Infinity, "acima de 10 mil"]],
};

const mediaDe = (v) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : null);

export default function Painel() {
  const [avals, setAvals] = useState(null);
  const [pessoas, setPessoas] = useState({});
  const [membros, setMembros] = useState([]);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [finalidade, setFinalidade] = useState("venda");
  const [toast, avisar] = useToast();

  useEffect(() => {
    (async () => {
      const [ev, mb, pf] = await Promise.all([
        supabase.from("evaluations")
          .select("id,broker_id,client_name,property_address,property_neighborhood,property_type,evaluation_type,suggested_value,is_active,created_at,short_code")
          .order("created_at", { ascending: false }),
        supabase.from("membros").select("user_id,email,papel,ativo"),
        supabase.from("public_broker_profiles").select("user_id,name"),
      ]);
      if (ev.error) { setErro(ev.error.message); setAvals([]); return; }
      const nomes = {};
      (mb.data || []).forEach((m) => { nomes[m.user_id] = m.email; });
      (pf.data || []).forEach((p) => { if (p.name) nomes[p.user_id] = p.name; });
      setPessoas(nomes);
      setMembros((mb.data || []).filter((m) => m.ativo));
      setAvals(ev.data || []);
    })();
  }, []);

  const nome = (uid) => pessoas[uid] || `Usuário ${String(uid).slice(0, 6)}`;

  const kpi = useMemo(() => {
    if (!avals) return null;
    const venda = avals.filter((a) => a.evaluation_type === "venda" && Number(a.suggested_value) > 0).map((a) => Number(a.suggested_value));
    const aluguel = avals.filter((a) => a.evaluation_type === "aluguel" && Number(a.suggested_value) > 0).map((a) => Number(a.suggested_value));
    return {
      total: avals.length,
      ativas: avals.filter((a) => a.is_active).length,
      volumeVenda: venda.reduce((s, v) => s + v, 0),
      volumeAluguel: aluguel.reduce((s, v) => s + v, 0),
      ticketVenda: mediaDe(venda), ticketAluguel: mediaDe(aluguel),
      nVenda: venda.length, nAluguel: aluguel.length,
    };
  }, [avals]);

  const ranking = useMemo(() => {
    if (!avals) return [];
    const m = {};
    avals.forEach((a) => {
      const r = (m[a.broker_id] ||= { uid: a.broker_id, total: 0, venda: 0, aluguel: 0, ativas: 0 });
      r.total++; r[a.evaluation_type]++; if (a.is_active) r.ativas++;
    });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }, [avals]);

  const relatorios = useMemo(() => {
    if (!avals) return null;
    const porTipo = {};
    avals.forEach((a) => { porTipo[a.property_type] = (porTipo[a.property_type] || 0) + 1; });
    const daFinalidade = avals.filter((a) => a.evaluation_type === finalidade && Number(a.suggested_value) > 0);
    const faixas = FAIXAS[finalidade].map(([min, max, faixa]) => ({
      faixa, n: daFinalidade.filter((a) => Number(a.suggested_value) >= min && Number(a.suggested_value) < max).length,
    }));
    const bairros = {};
    daFinalidade.forEach((a) => {
      const b = (a.property_neighborhood || "").trim();
      if (!b) return;
      (bairros[b] ||= []).push(Number(a.suggested_value));
    });
    const topBairros = Object.entries(bairros)
      .map(([bairro, v]) => ({ bairro, media: mediaDe(v), n: v.length }))
      .sort((a, b) => b.media - a.media).slice(0, 10);
    return {
      tipos: Object.entries(porTipo).map(([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n),
      faixas, topBairros, temValores: daFinalidade.length > 0,
    };
  }, [avals, finalidade]);

  const filtrada = useMemo(() => {
    if (!avals) return [];
    const t = busca.trim().toLowerCase();
    if (!t) return avals;
    return avals.filter((a) => [a.client_name, a.property_address, a.property_neighborhood, nome(a.broker_id)]
      .some((c) => (c || "").toLowerCase().includes(t)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avals, busca, pessoas]);

  async function transferir(a, novo) {
    if (novo === a.broker_id) return;
    if (!window.confirm(`Transferir a avaliação de ${a.client_name || a.property_address || "cliente sem nome"} para ${nome(novo)}?`)) return;
    const { error } = await supabase.from("evaluations").update({ broker_id: novo }).eq("id", a.id);
    if (error) return avisar(`Erro: ${error.message}`);
    setAvals((l) => l.map((x) => (x.id === a.id ? { ...x, broker_id: novo } : x)));
    avisar(`Transferida para ${nome(novo)}`);
  }

  async function alternarAtivo(a) {
    const { error } = await supabase.from("evaluations").update({ is_active: !a.is_active }).eq("id", a.id);
    if (error) return avisar(`Erro: ${error.message}`);
    setAvals((l) => l.map((x) => (x.id === a.id ? { ...x, is_active: !a.is_active } : x)));
    avisar(a.is_active ? "Link desativado" : "Link ativado");
  }

  if (!avals) return <Carregando />;

  // destinos da transferência: membros ativos + o dono atual (caso seja um gestor sem linha em membros)
  const destinos = (a) => {
    const ids = new Set(membros.map((m) => m.user_id));
    ids.add(a.broker_id);
    return [...ids].sort((x, y) => nome(x).localeCompare(nome(y), "pt-BR"));
  };

  return (
    <main className="pagina">
      <div className="cabecalho">
        <div><h1>Painel da imobiliária</h1><p>Todas as avaliações da equipe: volume, ranking e relatórios.</p></div>
      </div>
      {erro && <div className="aviso aviso-ambar" style={{ marginBottom: 16 }}>Não foi possível carregar: {erro}</div>}

      <div className="faixa-stats kpis4">
        <div><b>{kpi.total}</b><span>avaliações ({kpi.ativas} com link ativo)</span></div>
        <div><b>{brl(kpi.volumeVenda)}</b><span>volume avaliado em venda</span></div>
        <div><b>{brl(kpi.ticketVenda)}</b><span>ticket médio de venda ({kpi.nVenda})</span></div>
        <div><b>{brl(kpi.ticketAluguel)}</b><span>aluguel médio sugerido ({kpi.nAluguel})</span></div>
      </div>

      <div className="painel-grade">
        <section className="painel" style={{ marginTop: 0 }}>
          <h2 style={{ display: "flex", gap: 8, alignItems: "center" }}><Trophy size={18} color="var(--dourado)" /> Ranking de corretores</h2>
          <p className="dica">Por quantidade de avaliações criadas.</p>
          {ranking.length === 0 ? <p className="dica">Nenhuma avaliação ainda.</p> : (
            <div className="rolagem-x">
              <table className="tabela">
                <thead><tr><th>#</th><th>Corretor</th><th className="num">Total</th><th className="num">Venda</th><th className="num">Aluguel</th><th className="num">Ativas</th></tr></thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.uid}>
                      <td className="num">{i + 1}</td><td>{nome(r.uid)}</td>
                      <td className="num"><b>{r.total}</b></td><td className="num">{r.venda}</td><td className="num">{r.aluguel}</td><td className="num">{r.ativas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="painel" style={{ marginTop: 0 }}>
          <h2>Por tipo de imóvel</h2>
          <p className="dica">Todas as finalidades.</p>
          {relatorios.tipos.length ? <Suspense fallback={<Espera h={280} />}><TiposPieChart tipos={relatorios.tipos} /></Suspense> : <p className="dica">Sem dados.</p>}
        </section>
      </div>

      <section className="painel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div><h2>Valores sugeridos</h2><p className="dica" style={{ margin: 0 }}>Venda e aluguel têm escalas diferentes: escolha a finalidade.</p></div>
          <div className="segmentado" role="radiogroup" aria-label="Finalidade dos relatórios">
            {[["venda", "Venda"], ["aluguel", "Aluguel"]].map(([v, r]) => (
              <label key={v}><input type="radio" name="fin-rel" checked={finalidade === v} onChange={() => setFinalidade(v)} /><span>{r}</span></label>
            ))}
          </div>
        </div>
        {!relatorios.temValores ? <p className="dica" style={{ marginTop: 14 }}>Nenhuma avaliação de {finalidade} com valor sugerido.</p> : (
          <div className="painel-grade" style={{ marginTop: 16 }}>
            <div><h3 className="sub-titulo">Distribuição por faixa de valor</h3>
              <Suspense fallback={<Espera />}><FaixasChart dados={relatorios.faixas} /></Suspense></div>
            <div><h3 className="sub-titulo">Top 10 bairros por valor médio</h3>
              {relatorios.topBairros.length
                ? <Suspense fallback={<Espera />}><BairrosValorChart dados={relatorios.topBairros} aluguel={finalidade === "aluguel"} /></Suspense>
                : <p className="dica">Preencha o bairro nas avaliações para ver este ranking.</p>}</div>
          </div>
        )}
      </section>

      <section className="painel">
        <h2>Todas as avaliações</h2>
        <p className="dica">Transfira uma avaliação escolhendo outro corretor; o link do cliente continua o mesmo.</p>
        <div className="busca" style={{ margin: "10px 0 14px", maxWidth: 480 }}>
          <Search size={17} />
          <input className="input" placeholder="Buscar por cliente, endereço ou corretor" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar avaliações" />
        </div>
        {filtrada.length === 0 ? <p className="dica">Nada encontrado.</p> : (
          <div className="rolagem-x">
            <table className="tabela tabela-avals">
              <thead><tr><th>Cliente / endereço</th><th>Corretor</th><th>Tipo</th><th className="num">Valor</th><th>Criada</th><th>Link</th><th /></tr></thead>
              <tbody>
                {filtrada.map((a) => (
                  <tr key={a.id}>
                    <td><Link to={`/evaluation/${a.id}`}><b>{a.client_name || "Sem nome"}</b></Link><br /><small className="dica">{a.property_address || "Endereço não preenchido"}</small></td>
                    <td>
                      <select className="select select-sm" value={a.broker_id} onChange={(e) => transferir(a, e.target.value)} aria-label="Corretor responsável">
                        {destinos(a).map((uid) => <option key={uid} value={uid}>{nome(uid)}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge ${a.evaluation_type === "aluguel" ? "badge-aluguel" : "badge-venda"}`}>{a.evaluation_type === "aluguel" ? "Aluguel" : "Venda"}</span><br /><small className="dica">{a.property_type}</small></td>
                    <td className="num">{a.suggested_value ? brl(a.suggested_value) : "—"}</td>
                    <td className="num">{dataCurta(a.created_at)}</td>
                    <td>
                      <label className="interruptor" title={a.is_active ? "Desativar link público" : "Ativar link público"}>
                        <input type="checkbox" checked={a.is_active} onChange={() => alternarAtivo(a)} />
                        <span className="trilho" /><span className="sr-only">{a.is_active ? "Ativo" : "Inativo"}</span>
                      </label>
                    </td>
                    <td><a className="btn btn-ghost btn-icone" href={linkPublico(a.short_code)} target="_blank" rel="noreferrer" aria-label="Abrir página do cliente"><ExternalLink size={16} /></a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {toast}
    </main>
  );
}
