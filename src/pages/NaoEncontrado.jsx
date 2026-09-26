import React from "react";
import { Link } from "react-router-dom";

export default function NaoEncontrado() {
  return (
    <div className="carregando" style={{ minHeight: "100vh", textAlign: "center", padding: 24 }}>
      <img src={`${import.meta.env.BASE_URL}logo-acontece.png`} alt="Acontece" style={{ width: 90 }} />
      <h2 style={{ margin: "8px 0 0", color: "var(--verde-escuro)" }}>Página não encontrada</h2>
      <p style={{ margin: 0 }}>Confira o endereço do link recebido.</p>
      <Link to="/" className="btn btn-sec">Ir para o início</Link>
    </div>
  );
}
