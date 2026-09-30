import React, { useMemo } from "react";
import { Calculator, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { brl, num } from "../../lib/format";
import { homogeneizar, PADRAO_CONFIG, QUALITATIVOS, ROMANO } from "../../lib/homogeneizacao";

const f3 = (v) => (v == null ? "—" : v.toFixed(3).replace(".", ","));
const pct = (v, d = 1) => `${(v * 100).toFixed(d).replace(".", ",")}%`;
const m2 = (v) => (v == null ? "—" : `R$ ${num(Math.round(v))}`);
const INTERVALO_TXT = "0,50 a 2,00 no grau II · 0,80 a 1,25 no grau III";

export function calcularHomogeneizacao(f, comps) {
  const h = f.homogenization || {};
  return homogeneizar({ area: f.property_area, vagas: f.property_parking, quartos: f.property_bedrooms }, comps, h.ajustes || {}, h.config || {});
}

export default function TabFatores({ f, set, comps }) {
  const h = f.homogenization || {};
  const cfg = { ...PADRAO_CONFIG, ...(h.config || {}), coefQualitativo: { ...PADRAO_CONFIG.coefQualitativo, ...(h.config?.coefQualitativo || {}) } };
  const ajustes = h.ajustes || {};
  const r = useMemo(() => calcularHomogeneizacao(f, comps), [f, comps]);
  const e = r.estatistica, m = r.modelo;

  const salvar = (novo) => set("homogenization", { ...h, ...novo });
  const setCfg = (k, v) => salvar({ config: { ...(h.config || {}), [k]: v } });
  const setCoef = (k, v) => salvar({ config: { ...(h.config || {}), coefQualitativo: { ...(h.config?.coefQualitativo || {}), [k]: v } } });
  const setAj = (id, k, v) => salvar({ ajustes: { ...ajustes, [id]: { ...(ajustes[id] || {}), [k]: v } } });
  const valorArredondado = e ? Math.round(e.valorTotal / 1000) * 1000 : null;
  const aluguel = f.evaluation_type === "aluguel";

  const origemArea = cfg.metodoArea === "nenhum" ? "sem ajuste de área"
    : m?.expoenteArea != null ? `calculado a partir das amostras (expoente ${m.expoenteArea.toFixed(3).replace(".", ",")})`
    : "fórmula consagrada de Abunahman (expoente 1/4 até 30% de diferença de área, 1/8 de 30% a 150%)";

  return (
    <>
      <section className="painel">
        <h2 style={{ display: "flex", gap: 8, alignItems: "center" }}><Calculator size={19} /> Homogeneização por fatores</h2>
        <p className="dica" style={{ maxWidth: 760 }}>
          Traz cada amostra às características do imóvel avaliado ({f.property_area ? `${num(f.property_area)} m²` : "informe a área"}
          {f.property_parking != null ? `, ${f.property_parking} ${f.property_parking === 1 ? "vaga" : "vagas"}` : ""}
          {f.property_bedrooms ? `, ${f.property_bedrooms} ${f.property_bedrooms === 1 ? "quarto" : "quartos"}` : ""}), pelo método comparativo direto da ABNT NBR 14653-2.
          Área, vagas e quartos são calculados a partir das próprias amostras quando elas sustentam; localização, padrão e conservação vêm da sua análise.
        </p>
        <div className="grade g4" style={{ marginTop: 12 }}>
          <label className="campo"><span>Fator oferta (anúncios)</span>
            <input className="input num" type="number" step="0.01" min="0.8" max="1" value={cfg.fatorOferta}
              onChange={(ev) => setCfg("fatorOferta", Math.min(1, Math.max(0.8, Number(ev.target.value) || 0.9)))} />
            <small className="dica">0,90 = desconto usual de 10% sobre o anunciado</small>
          </label>
          <label className="campo"><span>Fator área</span>
            <select className="select" value={cfg.metodoArea} onChange={(ev) => setCfg("metodoArea", ev.target.value)}>
              <option value="auto">Automático (pela amostra)</option>
              <option value="formula">Fórmula consagrada</option>
              <option value="nenhum">Sem ajuste de área</option>
            </select>
          </label>
          {QUALITATIVOS.map(([k, rot]) => (
            <label className="campo" key={k}><span>{rot}: peso</span>
              <select className="select" value={cfg.coefQualitativo[k]} onChange={(ev) => setCoef(k, Number(ev.target.value))}>
                {[0.05, 0.1, 0.15, 0.2].map((v) => <option key={v} value={v}>{pct(v, 0)} por nível</option>)}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="painel">
        <h2>Amostras</h2>
        <p className="dica">
          Classifique cada amostra <b>em relação ao imóvel avaliado</b>: se a localização da amostra é melhor, marque “superior” (o valor dela é reduzido).
          Marque “fechado” quando o preço for de negócio realizado, e não de anúncio. Conjunto de fatores admissível: {INTERVALO_TXT}.
        </p>
        {!r.linhas.length ? <p className="dica">{r.avisos[0] || "Sem amostras com preço e área."}</p> : (
          <div className="rolagem-x">
            <table className="tabela tabela-fatores">
              <thead>
                <tr>
                  <th>#</th><th>Amostra</th><th className="num">R$/m²</th><th>Fechado</th>
                  {QUALITATIVOS.map(([k, rot]) => <th key={k}>{rot.split(" ")[0]}</th>)}
                  <th className="num">Oferta</th><th className="num">Área</th><th className="num">Vagas/qtos</th><th className="num">Conjunto</th>
                  <th className="num">R$/m² homog.</th><th>Situação</th><th>Usar</th>
                </tr>
              </thead>
              <tbody>
                {r.linhas.map((l, i) => {
                  const fora = l.conjunto != null && (l.conjunto < 0.5 || l.conjunto > 2.0);
                  const usada = l.status === "usada";
                  return (
                    <tr key={l.id} className={usada ? "" : "linha-fora"}>
                      <td className="num">{i + 1}</td>
                      <td><b>{l.endereco || "—"}</b><small className="dica" style={{ display: "block" }}>{num(l.area)} m² · {brl(l.preco)}</small></td>
                      <td className="num">{m2(l.vu)}</td>
                      <td><input type="checkbox" checked={!!ajustes[l.id]?.transacao} onChange={(ev) => setAj(l.id, "transacao", ev.target.checked)} aria-label="Negócio fechado" /></td>
                      {QUALITATIVOS.map(([k, rot]) => (
                        <td key={k}>
                          <select className="select select-mini" value={ajustes[l.id]?.[k] ?? 0} onChange={(ev) => setAj(l.id, k, Number(ev.target.value))} aria-label={rot}>
                            <option value={-1}>inferior</option><option value={0}>semelhante</option><option value={1}>superior</option>
                          </select>
                        </td>
                      ))}
                      <td className="num">{f3(l.fatores.oferta)}</td>
                      <td className="num">{f3(l.fatores.area)}</td>
                      <td className="num">{f3(l.fatores.vagas * l.fatores.quartos)}</td>
                      <td className={`num ${fora ? "alerta-texto" : ""}`}><b>{f3(l.conjunto)}</b></td>
                      <td className="num"><b>{m2(l.vh)}</b></td>
                      <td><small className={usada ? "" : "alerta-texto"}>{l.status}</small></td>
                      <td><input type="checkbox" checked={!ajustes[l.id]?.excluir} onChange={(ev) => setAj(l.id, "excluir", !ev.target.checked)} aria-label="Usar amostra" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="painel">
        <h2>Resultado</h2>
        <p className="dica" style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Fator área: {origemArea}.
            {m?.porVaga != null && ` Vagas: ${pct(m.porVaga)} por vaga, calculado a partir das amostras.`}
            {m?.porQuarto != null && ` Quartos: ${pct(m.porQuarto)} por quarto, calculado a partir das amostras.`}
            {m && m.expoenteArea == null && cfg.metodoArea === "auto" && m.motivo && ` (Não foi possível calcular pela amostra: ${m.motivo}.)`}
            {m?.r2 != null && ` Ajuste do modelo: R² ${m.r2.toFixed(2).replace(".", ",")} com ${m.n} amostras.`}
          </span>
        </p>
        {r.avisos.map((a) => <p key={a} className="aviso aviso-ambar" style={{ marginTop: 8 }}>{a}</p>)}
        {e && (
          <>
            <div className="referencia" style={{ marginTop: 12 }}>
              <div><span>Amostras usadas</span><b>{e.n} de {r.linhas.length}</b><small className="dica" style={{ display: "block" }}>após saneamento (±30% da média)</small></div>
              <div><span>Valor unitário médio</span><b>{m2(e.valorUnitario)}/m²</b><small className="dica" style={{ display: "block" }}>coef. de variação {pct(e.cv)}</small></div>
              <div><span>Intervalo de confiança 80%</span><b>{m2(e.ic[0])} a {m2(e.ic[1])}</b><small className="dica" style={{ display: "block" }}>amplitude {pct(e.amplitude)}</small></div>
              <div><span>Valor estimado{aluguel ? " (mensal)" : ""}</span><b>{brl(e.valorTotal)}</b><small className="dica" style={{ display: "block" }}>campo de arbítrio: {brl(e.arbitrio[0])} a {brl(e.arbitrio[1])}</small></div>
            </div>
            <div className="graus">
              <div className={`grau g${e.grauPrecisao}`}><span>Grau de precisão</span><b>{ROMANO[e.grauPrecisao]}</b><small>amplitude do IC 80% ≤ 30% = III · ≤ 40% = II · ≤ 50% = I</small></div>
              <div className={`grau g${e.grauFundamentacao}`}>
                <span>Grau de fundamentação (estimado)</span><b>{ROMANO[e.grauFundamentacao]}</b>
                <small>
                  nº de dados: {ROMANO[e.graus.dados]} ({e.n}; III pede 12) · conjunto de fatores: {ROMANO[e.graus.fatores]}
                  {e.graus.fonte < 3 ? " · fatores de análise do corretor limitam a II" : ""}
                </small>
              </div>
            </div>
            <p className="dica" style={{ marginTop: 8 }}>
              A fundamentação completa também depende de itens de documentação (identificação das amostras, fotos, vistoria), conferidos no PTAM.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" className="btn" onClick={() => set("market_value", valorArredondado)}>
                <CheckCircle2 size={16} /> Usar {brl(valorArredondado)} como valor de mercado
              </button>
              {f.market_value > 0 && (
                <span className={`dica ${f.market_value < e.arbitrio[0] || f.market_value > e.arbitrio[1] ? "alerta-texto" : ""}`}>
                  {f.market_value < e.arbitrio[0] || f.market_value > e.arbitrio[1]
                    ? <><AlertTriangle size={14} style={{ verticalAlign: "-2px" }} /> O valor de mercado atual ({brl(f.market_value)}) está fora do campo de arbítrio de ±15%.</>
                    : <>O valor de mercado atual ({brl(f.market_value)}) está dentro do campo de arbítrio.</>}
                </span>
              )}
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
              <input type="checkbox" checked={!!h.usarNoLaudo} onChange={(ev) => salvar({ usarNoLaudo: ev.target.checked })} />
              <span>Incluir a homogeneização no laudo (tabela de fatores, estatística e graus)</span>
            </label>
          </>
        )}
        <p className="nota-fontes">
          Referências: ABNT NBR 14653-2 (tratamento por fatores, graus de fundamentação e precisão, campo de arbítrio);
          fator oferta usual de 0,90 (IBAPE); fator área de Abunahman quando a amostra não sustenta o cálculo próprio.
        </p>
      </section>
    </>
  );
}
