import React, { useState } from "react";
import { Plus, X } from "lucide-react";

const SUGESTOES = {
  advantages: ["Sol da manhã", "Vista livre", "Reformado", "Andar alto", "Próximo a comércio", "Vaga coberta", "Condomínio com lazer"],
  concerns: ["Barulho da rua", "Necessita reforma", "Sol da tarde", "Andar baixo", "Condomínio alto", "Sem elevador"],
};

function ListaDinamica({ titulo, dica, cor, itens, onChange, sugestoes }) {
  const [novo, setNovo] = useState("");
  const adicionar = (t) => {
    const v = (t ?? novo).trim();
    if (!v || itens.includes(v)) return;
    onChange([...itens, v]); setNovo("");
  };
  const livres = sugestoes.filter((s) => !itens.includes(s));
  return (
    <section className="painel" style={{ marginTop: 0 }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="marcador" style={{ width: 10, height: 10, borderRadius: "50%", background: cor }} />{titulo}</h2>
      <p className="dica">{dica}</p>
      <div className="lista-itens">
        {itens.map((it, i) => (
          <div className="item-lista" key={i}>
            <span className="marcador" style={{ background: cor }} />
            <input className="input" value={it} aria-label={`${titulo} ${i + 1}`}
              onChange={(e) => onChange(itens.map((x, j) => (j === i ? e.target.value : x)))} />
            <button type="button" className="btn btn-ghost btn-icone" onClick={() => onChange(itens.filter((_, j) => j !== i))} aria-label="Remover"><X size={17} /></button>
          </div>
        ))}
        <div className="item-lista">
          <span className="marcador" style={{ background: "var(--linha)" }} />
          <input className="input" value={novo} placeholder="Digite e tecle Enter" onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } }} />
          <button type="button" className="btn btn-sec btn-icone" onClick={() => adicionar()} aria-label="Adicionar"><Plus size={18} /></button>
        </div>
      </div>
      {livres.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
          {livres.map((s) => (
            <button type="button" key={s} className="badge" style={{ cursor: "pointer" }} onClick={() => adicionar(s)}>+ {s}</button>
          ))}
        </div>
      )}
    </section>
  );
}

export default function TabPercepcoes({ f, set }) {
  return (
    <div className="duas-colunas">
      <ListaDinamica titulo="Pontos fortes" cor="var(--verde)" dica="O que valoriza o imóvel na visão de quem compra ou aluga."
        itens={f.advantages || []} onChange={(v) => set("advantages", v)} sugestoes={SUGESTOES.advantages} />
      <ListaDinamica titulo="Pontos de atenção" cor="var(--ambar)" dica="O que pesa na negociação. Mostrar isso dá credibilidade ao valor."
        itens={f.concerns || []} onChange={(v) => set("concerns", v)} sugestoes={SUGESTOES.concerns} />
    </div>
  );
}
