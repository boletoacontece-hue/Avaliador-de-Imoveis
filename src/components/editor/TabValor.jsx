import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Campo, InputMoeda, InputNumero } from "../ui";
import { brl, num, fmtM2, precoM2, media, mediana } from "../../lib/format";

export default function TabValor({ f, set, comps, salvarAntes }) {
  const [gerando, setGerando] = useState(false);
  const [erroIa, setErroIa] = useState("");

  async function gerarEstrategia() {
    if (f.ai_strategy?.trim() && !window.confirm("Substituir a estratégia atual por uma nova versão gerada pela IA?")) return;
    setGerando(true); setErroIa("");
    try {
      // a IA lê a avaliação do banco: grava antes o que ainda está pendente
      if (!(await salvarAntes())) throw new Error("Salve as alterações pendentes antes de gerar.");
      const { data, error } = await supabase.functions.invoke("gerar-estrategia", { body: { evaluation_id: f.id } });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context.json()).erro || msg; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      if (!data?.texto) throw new Error("A IA não devolveu texto. Tente de novo.");
      set("ai_strategy", data.texto);
    } catch (err) { setErroIa(err.message); }
    setGerando(false);
  }

  const tipo = f.evaluation_type;
  const m2s = comps.map((c) => precoM2(c.price, c.area)).filter((v) => v != null);
  const mdn = mediana(m2s), med = media(m2s);
  const area = Number(f.property_area) || null;
  const referencia = mdn && area ? mdn * area : null;
  const m2Sugerido = precoM2(f.suggested_value, area);
  const desvio = m2Sugerido && mdn ? ((m2Sugerido / mdn) - 1) * 100 : null;
  const m2Mercado = precoM2(f.market_value, area);
  const acimaMercado = f.market_value > 0 && f.suggested_value > 0 ? ((f.suggested_value / f.market_value) - 1) * 100 : null;
  const dMin = f.negotiation_min ?? 3, dMax = f.negotiation_max ?? 7;
  const fechamento = f.suggested_value > 0 ? [f.suggested_value * (1 - dMin / 100), f.suggested_value * (1 - dMax / 100)] : null;
  const estudo = f.portal_study;

  return (
    <>
      <section className="painel">
        <h2>{tipo === "aluguel" ? "Valores de locação" : "Valores"}</h2>
        <p className="dica">
          O <b>valor de mercado</b> é o técnico, o ponto de equilíbrio das amostras. O <b>valor de oferta</b> é o de anúncio: o teto para
          começar, já com a margem que o comprador vai negociar.
        </p>
        <div className="dois-valores">
          <div>
            <span className="rot">Valor de mercado <small>(técnico)</small></span>
            <div className="valor-grande"><InputMoeda valor={f.market_value} onChange={(v) => set("market_value", v)} className="input" aria-label="Valor de mercado" /></div>
            <small className="dica num">{fmtM2(m2Mercado, tipo)}</small>
            {referencia && !f.market_value && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set("market_value", Math.round(referencia / 1000) * 1000)}>Usar mediana × área ({brl(referencia)})</button>
            )}
          </div>
          <div>
            <span className="rot">Valor estratégico de oferta <small>(anúncio)</small></span>
            <div className="valor-grande"><InputMoeda valor={f.suggested_value} onChange={(v) => set("suggested_value", v)} className="input" aria-label="Valor de oferta" /></div>
            <small className="dica num">{fmtM2(m2Sugerido, tipo)}{acimaMercado != null && ` · ${acimaMercado >= 0 ? "+" : ""}${acimaMercado.toFixed(1).replace(".", ",")}% sobre o mercado`}</small>
            {f.market_value > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[3, 5, 7].map((p) => (
                  <button key={p} type="button" className="btn btn-ghost btn-sm" onClick={() => set("suggested_value", Math.round((f.market_value * (1 + p / 100)) / 1000) * 1000)}>Mercado + {p}%</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grade g3" style={{ marginTop: 16 }}>
          <Campo rotulo="Desconto que o comprador pede (mín. %)"><InputNumero decimal valor={f.negotiation_min} onChange={(v) => set("negotiation_min", v)} /></Campo>
          <Campo rotulo="Desconto (máx. %)"><InputNumero decimal valor={f.negotiation_max} onChange={(v) => set("negotiation_max", v)} /></Campo>
          <Campo rotulo="Prazo-alvo de venda (dias)"><InputNumero valor={f.target_days} onChange={(v) => set("target_days", v)} /></Campo>
        </div>
        {fechamento && (
          <p className="dica" style={{ marginTop: 10 }}>
            Com desconto de {num(dMin)}% a {num(dMax)}% sobre a oferta, o fechamento estimado fica entre{" "}
            <b className="num">{brl(fechamento[1])}</b> e <b className="num">{brl(fechamento[0])}</b>
            {f.market_value > 0 && (fechamento[1] < f.market_value * 0.97 ? " — abaixo do valor de mercado: considere subir a oferta." : " — em linha com o valor de mercado.")}
          </p>
        )}
        {Number(dMin) > Number(dMax) && <p className="erro-msg" style={{ marginTop: 6 }}>O desconto mínimo está maior que o máximo.</p>}
        <div className="referencia" style={{ marginTop: 14 }}>
          <div><span>Mediana das amostras</span><b>{fmtM2(mdn, tipo)}</b></div>
          <div><span>Mediana × área do imóvel</span><b>{referencia ? brl(referencia) : "—"}</b></div>
          <div>
            <span>Oferta por m²</span>
            <b>{fmtM2(m2Sugerido, tipo)}</b>
            {desvio != null && <small className="dica" style={{ display: "block" }}>{desvio >= 0 ? "+" : ""}{desvio.toFixed(1).replace(".", ",")}% em relação à mediana</small>}
          </div>
          {estudo?.preco_m2_medio > 0 && <div><span>Média do segmento (portal)</span><b>{fmtM2(estudo.preco_m2_medio, tipo)}</b></div>}
        </div>
        {m2s.length > 0 && m2s.length < 3 && <p className="dica" style={{ marginTop: 10 }}>Com menos de 3 amostras a mediana é pouco representativa.</p>}
        {!area && <p className="dica" style={{ marginTop: 10 }}>Informe a área na aba Imóvel para ver as referências por m².</p>}
        {med != null && <p className="dica" style={{ marginTop: 6 }}>Média simples das amostras: <span className="num">{fmtM2(med, tipo)}</span></p>}
      </section>
      <section className="painel">
        <h2>Justificativa do valor</h2>
        <p className="dica">Explique ao cliente como chegou ao número: amostras mais parecidas, ajustes, momento de mercado.</p>
        <textarea className="textarea" style={{ minHeight: 160 }} value={f.suggested_value_description || ""} onChange={(e) => set("suggested_value_description", e.target.value)} />
      </section>
      <section className="painel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h2>Estratégia {tipo === "aluguel" ? "de locação" : "de venda"}</h2>
            <p className="dica" style={{ margin: 0 }}>Gerada pela IA a partir do imóvel, das percepções, das amostras e do valor. Revise e ajuste antes de enviar.</p>
          </div>
          <button type="button" className="btn btn-sec" onClick={gerarEstrategia} disabled={gerando}>
            <Sparkles size={16} /> {gerando ? "Gerando…" : f.ai_strategy?.trim() ? "Gerar de novo" : "Gerar com IA"}
          </button>
        </div>
        {erroIa && <div className="erro-msg" style={{ marginTop: 10 }}>{erroIa}</div>}
        {!f.suggested_value && <p className="dica" style={{ marginTop: 10 }}>Dica: defina os valores antes de gerar, para a estratégia considerar o preço.</p>}
        <textarea className="textarea" style={{ minHeight: 200, marginTop: 12 }} value={f.ai_strategy || ""}
          onChange={(e) => set("ai_strategy", e.target.value)} aria-label="Estratégia" placeholder="Clique em Gerar com IA ou escreva a estratégia." />
      </section>
      <section className="painel">
        <h2>Notas finais</h2>
        <p className="dica">Recomendações de estratégia, próximos passos, condições.</p>
        <textarea className="textarea" value={f.final_notes || ""} onChange={(e) => set("final_notes", e.target.value)} aria-label="Notas finais" />
      </section>
    </>
  );
}
