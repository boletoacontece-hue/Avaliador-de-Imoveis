import React, { useState } from "react";
import { ImagePlus, X } from "lucide-react";

export default function FotoSlot({ url, rotulo, onEnviar, onRemover }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  async function escolher(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setEnviando(true); setErro("");
    try { await onEnviar(f); } catch (err) { setErro(err.message || "Falha no envio"); }
    setEnviando(false);
  }
  return (
    <div>
      <label className="foto-slot" title={url ? `Trocar ${rotulo.toLowerCase()}` : `Enviar ${rotulo.toLowerCase()}`}>
        <input type="file" accept="image/*" onChange={escolher} />
        {url ? <img src={url} alt={rotulo} loading="lazy" /> : (
          <span style={{ display: "grid", justifyItems: "center", gap: 4 }}><ImagePlus size={20} />{rotulo}</span>
        )}
        {url && <span className="rotulo">{rotulo}</span>}
        {enviando && <span className="carregando" style={{ position: "absolute", inset: 0, minHeight: 0, background: "rgba(255,255,255,.75)" }}><span className="giro" /></span>}
        {url && onRemover && !enviando && (
          <button type="button" className="remover" onClick={(e) => { e.preventDefault(); onRemover(); }} aria-label={`Remover ${rotulo}`}><X size={14} /></button>
        )}
      </label>
      {erro && <div className="erro-msg" style={{ fontSize: 12 }}>{erro}</div>}
    </div>
  );
}
