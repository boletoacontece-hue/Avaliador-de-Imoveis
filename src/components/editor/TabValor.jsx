import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { InputMoeda } from "../ui";
import { brl, fmtM2, precoM2, media, mediana } from "../../lib/format";

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

  return (
    <>
      <section className="painel">
        <h2>{tipo === "aluguel" ? "Aluguel sugerido" : "Valor sugerido"}</h2>
        <p className="dica">O número em destaque no fim da apresentação.</p>
        <div className="valor-grande" style={{ maxWidth: 420 }}>
          <InputMoeda valor={f.suggested_value} onChange={(v) => set("suggested_value", v)} className="input" aria-label="Valor sugerido" />
        </div>
        <div className="referencia">
          <div><span>Mediana das amostras</span><b>{fmtM2(mdn, tipo)}</b></div>
          <div><span>Mediana × área do imóvel</span><b>{referencia ? brl(referencia) : "—"}</b></div>
          <div>
            <span>Valor sugerido por m²</span>
            <b>{fmtM2(m2Sugerido, tipo)}</b>
            {desvio != null && <small className="dica" style={{ display: "block" }}>{desvio >= 0 ? "+" : ""}{desvio.toFixed(1).replace(".", ",")}% em relação à mediana</small>}
          </div>
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
        {!f.suggested_value && <p className="dica" style={{ marginTop: 10 }}>Dica: defina o valor sugerido antes de gerar, para a estratégia considerar o preço.</p>}
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
