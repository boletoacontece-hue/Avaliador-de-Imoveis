import React, { useEffect, useState } from "react";
import { Sparkles, Search, Gauge, AlertTriangle, ListChecks, Globe } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { brl, num, TIPOS_IMOVEL } from "../../lib/format";
import { mensagemErro } from "../../lib/versao";
import { Modal } from "../ui";

// Portais: DFImóveis e Wimóveis com endereço de busca conferido; os demais em teste (bloqueiam mais).
const PORTAIS = [["DFImóveis", true, ""], ["Wimóveis", true, ""], ["Imovelweb", false, ""], ["ZAP Imóveis", false, "em teste"], ["VivaReal", false, "em teste"], ["OLX", false, "em teste"]];
const ETAPAS = ["Consultando os portais…", "Recortando os anúncios…", "Lendo os anúncios com IA…", "Aplicando as regras do robô…", "Analisando o mercado…"];
const quadraDo = (s) => (String(s || "").toUpperCase().match(/^\s*([A-Z]{2,5}\s*\d{1,3})/) || [])[1] || "";

export function BuscaAmostrasIA({ f, onFechar, onResultado }) {
  const area = Number(f.property_area) || null;
  const [p, setP] = useState({
    operacao: f.evaluation_type === "aluguel" ? "aluguel" : "venda", tipo: f.property_type || "Apartamento",
    bairro: f.property_neighborhood || "", quadra: quadraDo(f.property_street), quartos: f.property_bedrooms || "",
    area: area || "", area_min: area ? Math.round(area * 0.7) : "", area_max: area ? Math.round(area * 1.3) : "",
    vagas: f.property_parking ?? "", maximo: 20, portais: PORTAIS.filter(([, padrao]) => padrao).map(([n]) => n),
  });
  const [buscando, setBuscando] = useState(false);
  const [etapa, setEtapa] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState("");
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });

  useEffect(() => {
    if (!buscando) return;
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [buscando]);
  useEffect(() => { setEtapa(Math.min(ETAPAS.length - 1, Math.floor(segundos / 14))); }, [segundos]);

  async function buscar() {
    if (!p.bairro.trim()) return setErro("Informe o bairro.");
    if (!p.portais.length) return setErro("Escolha ao menos um portal.");
    setErro(""); setBuscando(true); setSegundos(0);
    try {
      const filtros = { ...p, quartos: Number(p.quartos) || null, area: Number(p.area) || null, area_min: Number(p.area_min) || null,
        area_max: Number(p.area_max) || null, vagas: p.vagas === "" ? null : Number(p.vagas), quadra: p.quadra.trim() || null };
      const { data, error } = await supabase.functions.invoke("acontece-n8n", { body: { modo: "amostras", evaluation_id: f.id, filtros } });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context.json()).erro || msg; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      if (!data?.amostras?.length) {
        const bloqueados = (data?.sites || []).filter((s) => s.status !== "ok").map((s) => s.portal);
        throw new Error(`Nenhuma amostra encontrada${bloqueados.length ? ` (sem resposta de: ${bloqueados.join(", ")})` : ""}. Tente ampliar a faixa de área, tirar a quadra ou incluir outros portais.`);
      }
      onResultado(data, filtros);
    } catch (e) { setErro(mensagemErro(e)); }
    setBuscando(false);
  }

  return (
    <Modal titulo="Buscar amostras com IA" onFechar={buscando ? () => {} : onFechar} largo>
      <p className="dica" style={{ marginTop: 4 }}>
        A busca consulta os portais, recorta cada anúncio, lê os dados com IA e aplica as regras do robô de amostras (endereço normalizado, duplicatas,
        valores fora do padrão, anúncios de procura). As mais parecidas com o imóvel vêm primeiro, para você revisar antes de importar.
      </p>
      <div className="grade g4" style={{ marginTop: 12 }}>
        <label className="campo"><span>Operação</span>
          <select className="select" value={p.operacao} onChange={set("operacao")} disabled={buscando}><option value="venda">Venda</option><option value="aluguel">Aluguel</option></select></label>
        <label className="campo"><span>Tipo</span>
          <select className="select" value={p.tipo} onChange={set("tipo")} disabled={buscando}>{TIPOS_IMOVEL.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="campo"><span>Bairro</span><input className="input" value={p.bairro} onChange={set("bairro")} disabled={buscando} placeholder="Ex.: Asa Sul" /></label>
        <label className="campo"><span>Quadra (opcional)</span><input className="input" value={p.quadra} onChange={set("quadra")} disabled={buscando} placeholder="Ex.: SQS 213" /></label>
        <label className="campo"><span>Quartos</span><input className="input num" type="number" min="0" value={p.quartos} onChange={set("quartos")} disabled={buscando} /></label>
        <label className="campo"><span>Vagas</span><input className="input num" type="number" min="0" value={p.vagas} onChange={set("vagas")} disabled={buscando} /></label>
        <label className="campo"><span>Área mínima (m²)</span><input className="input num" type="number" value={p.area_min} onChange={set("area_min")} disabled={buscando} /></label>
        <label className="campo"><span>Área máxima (m²)</span><input className="input num" type="number" value={p.area_max} onChange={set("area_max")} disabled={buscando} /></label>
      </div>
      <div style={{ marginTop: 12 }}>
        <span className="rotulo-campo">Portais</span>
        <div className="chips-portais">
          {PORTAIS.map(([n, , obs]) => (
            <label key={n} className={`chip-portal ${p.portais.includes(n) ? "on" : ""}`}>
              <input type="checkbox" checked={p.portais.includes(n)} disabled={buscando}
                onChange={(e) => setP({ ...p, portais: e.target.checked ? [...p.portais, n] : p.portais.filter((x) => x !== n) })} />
              {n}{obs && <small> · {obs}</small>}
            </label>
          ))}
        </div>
        <p className="dica" style={{ margin: "6px 0 0" }}>Cada portal adicional aumenta o tempo e o custo da busca. ZAP, VivaReal e OLX bloqueiam mais e estão em teste.</p>
      </div>
      {buscando && (
        <div className="busca-andamento">
          <span className="giro-mini" /> <b>{ETAPAS[etapa]}</b>
          <span className="dica">{segundos}s · costuma levar de 40 s a 2 min</span>
          <div className="busca-barra"><i style={{ width: `${Math.min(95, (segundos / 100) * 100)}%` }} /></div>
        </div>
      )}
      {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}
      <div className="rodape-modal">
        <button className="btn btn-sec" onClick={onFechar} disabled={buscando}>Cancelar</button>
        <button className="btn" onClick={buscar} disabled={buscando}><Search size={16} /> {buscando ? "Buscando…" : "Buscar amostras"}</button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ análise da IA (guardada na avaliação)
export function AnaliseMercadoIA({ scan, onNovaBusca }) {
  const a = scan?.analise;
  if (!scan) return null;
  const conf = { alta: "ok", media: "parcial", média: "parcial", baixa: "falta" }[String(a?.confianca || "").toLowerCase()] || "parcial";
  return (
    <section className="painel analise-ia">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ display: "flex", gap: 8, alignItems: "center" }}><Sparkles size={18} /> Leitura de mercado da IA</h2>
          <p className="dica" style={{ margin: 0 }}>
            Busca de {new Date(scan.geradoEm || Date.now()).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            {scan.criterios?.total_lidos ? ` · ${scan.criterios.total_lidos} anúncios lidos` : ""}
            {scan.stats?.n ? ` · ${scan.stats.n} amostras limpas` : ""}. Preços de oferta: o valor do laudo sai da homogeneização (aba Fatores).
          </p>
        </div>
        <button type="button" className="btn btn-sec btn-sm" onClick={onNovaBusca}><Search size={15} /> Nova busca</button>
      </div>
      {a ? (
        <>
          {a.resumo && <p style={{ marginTop: 12, lineHeight: 1.6 }}>{a.resumo}</p>}
          <div className="referencia" style={{ marginTop: 8 }}>
            {a.faixa_valor?.provavel > 0 && <div><span>Faixa de oferta para o imóvel</span><b>{brl(a.faixa_valor.provavel)}</b><small className="dica" style={{ display: "block" }}>{brl(a.faixa_valor.minimo)} a {brl(a.faixa_valor.maximo)}</small></div>}
            {a.preco_m2?.referencia > 0 && <div><span>R$/m² de referência</span><b>R$ {num(a.preco_m2.referencia)}</b><small className="dica" style={{ display: "block" }}>R$ {num(a.preco_m2.minimo)} a R$ {num(a.preco_m2.maximo)}</small></div>}
            <div><span>Confiança</span><b className={`conf-${conf}`}><Gauge size={16} style={{ verticalAlign: "-2px" }} /> {a.confianca || "—"}</b><small className="dica" style={{ display: "block" }}>{a.motivo_confianca}</small></div>
          </div>
          {a.leitura_mercado && <p className="dica" style={{ marginTop: 10, lineHeight: 1.6 }}>{a.leitura_mercado}</p>}
          {a.alertas?.filter(Boolean).length > 0 && (
            <ul className="lista-ia alerta">{a.alertas.filter(Boolean).map((t, i) => <li key={i}><AlertTriangle size={14} /> {t}</li>)}</ul>
          )}
          {a.proximos_passos?.filter(Boolean).length > 0 && (
            <ul className="lista-ia">{a.proximos_passos.filter(Boolean).map((t, i) => <li key={i}><ListChecks size={14} /> {t}</li>)}</ul>
          )}
        </>
      ) : <p className="dica" style={{ marginTop: 10 }}>A IA não devolveu a análise desta vez; as amostras vieram normalmente.</p>}
      {scan.sites?.length > 0 && (
        <div className="sites-busca">
          {scan.sites.map((s) => <span key={s.portal} className={`fonte-chip ${s.status === "ok" ? "" : "chip-falha"}`}><Globe size={12} /> {s.portal}: {s.status === "ok" ? `${s.encontrados} anúncios` : s.status === "bloqueado" ? "bloqueou" : "sem anúncios"}</span>)}
        </div>
      )}
    </section>
  );
}
