import React from "react";
import { useAuth } from "../lib/auth";

export default function AcessoPendente() {
  const { user, sair, recarregarAcesso } = useAuth();
  return (
    <div className="carregando" style={{ minHeight: "100vh", padding: 24, textAlign: "center" }}>
      <img src={`${import.meta.env.BASE_URL}logo-acontece.png`} alt="Acontece" style={{ width: 90 }} />
      <h2 style={{ margin: "8px 0 0", color: "var(--verde-escuro)" }}>Acesso aguardando liberação</h2>
      <p style={{ maxWidth: 420, margin: 0 }}>
        A conta <b>{user?.email}</b> ainda não foi liberada no Avaliador. Peça ao gestor para liberar este e-mail na tela Equipe.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={recarregarAcesso}>Verificar novamente</button>
        <button className="btn btn-sec" onClick={sair}>Sair</button>
      </div>
    </div>
  );
}
