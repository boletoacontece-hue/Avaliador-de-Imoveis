import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, MapPin, FileSearch, Eye } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { brl, dataCurta } from "../lib/format";
import { Campo, Carregando, Modal } from "../components/ui";

export default function Dashboard() {

  const { user } = useAuth();
  const nav = useNavigate();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  // "Nova" da barra inferior do celular chega como ?nova=1
  const [params, setParams] = useSearchParams();
  useEffect(() => { if (params.get("nova")) { setNovo(true); setParams({}, { replace: true }); } }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.from("evaluations")
      .select("id,title,client_name,property_address,property_neighborhood,property_type,evaluation_type,suggested_value,is_active,created_at,link_views(count)")
      .eq("broker_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => { if (error) setErro(error.message); setLista(data || []); });
  }, [user.id]);

  const stats = useMemo(() => {
    if (!lista) return null;
    const agora = new Date();
    const mes = lista.filter((a) => { const d = new Date(a.created_at); return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear(); }).length;
    const valores = lista.map((a) => Number(a.suggested_value)).filter((v) => v > 0);
    return { total: lista.length, mes, media: valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null };
  }, [lista]);

  const filtrada = useMemo(() => {
    if (!lista) return [];
    const t = busca.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter((a) => [a.property_address, a.property_neighborhood, a.client_name].some((c) => (c || "").toLowerCase().includes(t)));
  }, [lista, busca]);

  if (!lista) return <Carregando />;

  return (
    <main className="pagina">
      <div className="cabecalho">
        <div>
          <h1>Minhas avaliações</h1>
          <p>Estudos de valor de mercado que você preparou.</p>
        </div>
        <button className="btn" onClick={() => setNovo(true)}><Plus size={18} /> Nova avaliação</button>
      </div>

      {erro && <div className="aviso aviso-ambar" style={{ marginBottom: 16 }}>Não foi possível carregar: {erro}</div>}

      <div className="faixa-stats">
        <div><b>{stats.total}</b><span>avaliações no total</span></div>
        <div><b>{stats.mes}</b><span>criadas este mês</span></div>
        <div><b>{brl(stats.media)}</b><span>valor médio sugerido</span></div>
      </div>

      {lista.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div className="busca">
            <Search size={17} />
            <input className="input" placeholder="Buscar por endereço, bairro ou cliente" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar avaliações" />
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="vazio">
          <FileSearch size={36} color="var(--musgo)" style={{ margin: "0 auto" }} />
          <h3>Nenhuma avaliação ainda</h3>
          <p>Crie a primeira: preencha o imóvel, adicione as amostras e envie o link ao cliente.</p>
          <button className="btn" onClick={() => setNovo(true)}><Plus size={18} /> Nova avaliação</button>
        </div>
      ) : filtrada.length === 0 ? (
        <div className="vazio"><h3>Nada encontrado para “{busca}”</h3><p>Tente outro trecho do endereço ou o nome do cliente.</p></div>
      ) : (
        <div className="lista-aval">
          {filtrada.map((a) => (
            <Link key={a.id} to={`/evaluation/${a.id}`} className={`card-aval ${a.is_active ? "" : "inativa"}`}>
              <div className="linha1">
                <span className={`badge ${a.evaluation_type === "aluguel" ? "badge-aluguel" : "badge-venda"}`}>{a.evaluation_type === "aluguel" ? "Aluguel" : "Venda"}</span>
                <span className="badge">{a.property_type}</span>
                <span className={`badge ${a.is_active ? "badge-ok" : "badge-off"}`} style={{ marginLeft: "auto" }}>{a.is_active ? "Link ativo" : "Link inativo"}</span>
              </div>
              <h3><MapPin size={14} style={{ display: "inline", marginRight: 4, color: "var(--musgo)", verticalAlign: "-2px" }} />
                {a.property_address || "Endereço ainda não preenchido"}</h3>
              {a.client_name && <div className="cliente">{a.client_name}</div>}
              <div className="rodape">
                <span className="valor">{a.suggested_value ? brl(a.suggested_value) : "Sem valor"}</span>
                <span className="data">
                  {a.link_views?.[0]?.count > 0 && <span title="Aberturas do link pelo cliente" style={{ marginRight: 10 }}><Eye size={13} style={{ verticalAlign: "-2px" }} /> {a.link_views[0].count}</span>}
                  {dataCurta(a.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {novo && <NovaAvaliacao onFechar={() => setNovo(false)} onCriada={(id) => nav(`/evaluation/${id}`)} />}
    </main>
  );
}

function NovaAvaliacao({ onFechar, onCriada }) {
  const [tipo, setTipo] = useState("venda");
  const [cliente, setCliente] = useState("");
  const [erro, setErro] = useState("");
  const [criando, setCriando] = useState(false);

  async function criar(e) {
    e.preventDefault();
    setCriando(true); setErro("");
    const { data, error } = await supabase.from("evaluations")
      .insert({ evaluation_type: tipo, client_name: cliente.trim() || null,
        title: tipo === "aluguel" ? "Estudo de Valor de Locação" : "Estudo de Valor de Mercado" })
      .select("id").single();
    if (error) { setErro(error.message); setCriando(false); return; }
    onCriada(data.id);
  }

  return (
    <Modal titulo="Nova avaliação" onFechar={onFechar}>
      <form onSubmit={criar} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 14 }}>
        <div className="campo">
          <span>Finalidade</span>
          <div className="segmentado" role="radiogroup">
            {[["venda", "Venda"], ["aluguel", "Aluguel"]].map(([v, r]) => (
              <label key={v}><input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} /><span>{r}</span></label>
            ))}
          </div>
        </div>
        <Campo rotulo="Nome do cliente" dica="Aparece na capa da apresentação. Pode preencher depois.">
          <input className="input" value={cliente} onChange={(e) => setCliente(e.target.value)} autoFocus />
        </Campo>
        {erro && <div className="erro-msg">{erro}</div>}
        <div className="rodape-modal">
          <button type="button" className="btn btn-sec" onClick={onFechar}>Cancelar</button>
          <button className="btn" disabled={criando}>{criando ? "Criando…" : "Criar e preencher"}</button>
        </div>
      </form>
    </Modal>
  );
}
