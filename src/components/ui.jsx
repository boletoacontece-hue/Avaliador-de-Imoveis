import React, { useEffect, useState } from "react";

export function Campo({ rotulo, dica, children, className, style }) {
  return (
    <label className={`campo ${className || ""}`} style={style}>
      <span>{rotulo}</span>
      {children}
      {dica && <small className="dica">{dica}</small>}
    </label>
  );
}

export function Carregando({ texto = "Carregando…" }) {
  return <div className="carregando"><div className="giro" /><span>{texto}</span></div>;
}

// Input monetário: digita só números, exibe R$ 1.234.567
export function InputMoeda({ valor, onChange, className = "input", centavos = false, ...rest }) {
  const fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: centavos ? 2 : 0, maximumFractionDigits: centavos ? 2 : 0 });
  const exibir = valor == null || valor === "" ? "" : `R$ ${fmt.format(Number(valor))}`;
  return (
    <input {...rest} className={className} inputMode="numeric" value={exibir}
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, "");
        if (!d) return onChange(null);
        onChange(centavos ? Number(d) / 100 : Number(d));
      }} />
  );
}

export function InputNumero({ valor, onChange, decimal = false, ...rest }) {
  return (
    <input {...rest} className="input num" inputMode={decimal ? "decimal" : "numeric"}
      value={valor ?? ""}
      onChange={(e) => {
        const bruto = e.target.value.replace(",", ".");
        if (bruto === "") return onChange(null);
        const n = decimal ? bruto.replace(/[^\d.]/g, "") : bruto.replace(/\D/g, "");
        onChange(n === "" ? null : decimal && n.endsWith(".") ? n : Number(n));
      }} />
  );
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2600); return () => clearTimeout(t); }, [msg]);
  const el = msg ? <div className="toast" role="status">{msg}</div> : null;
  return [el, setMsg];
}

export function Modal({ titulo, children, onFechar, largo = false }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onFechar?.();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar?.()}>
      <div className={`modal ${largo ? "modal-largo" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

// Coordenada: aceita sinal negativo e vírgula; guarda texto local enquanto digita
export function InputCoord({ valor, onChange, ...rest }) {
  const [texto, setTexto] = useState(valor ?? "");
  const [foco, setFoco] = useState(false);
  useEffect(() => { if (!foco) setTexto(valor ?? ""); }, [valor, foco]);
  return (
    <input {...rest} className="input num" inputMode="decimal" value={texto}
      onFocus={() => setFoco(true)} onBlur={() => setFoco(false)}
      onChange={(e) => {
        const t = e.target.value.replace(",", ".").replace(/[^\d.-]/g, "");
        setTexto(t);
        if (t === "") return onChange(null);
        const n = Number(t);
        if (!isNaN(n) && t !== "-" && !t.endsWith(".")) onChange(n);
      }} />
  );
}
