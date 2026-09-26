import React from "react";
import { useAuth } from "../lib/auth";

export default function AcessoPendente() {
  const { user, sair, recarregarAcesso, erroAcesso } = useAuth();
  const semSchema = /PGRST106|schema must be one of|Invalid schema/i.test(erroAcesso);
  const semFuncao = /PGRST202|could not find the function|does not exist/i.test(erroAcesso);
  return (
    <div className="tela-aviso">
      <img src={`${import.meta.env.BASE_URL}logo-acontece.png`} alt="Acontece" />
      {erroAcesso ? (
        <>
          <h2>O Avaliador ainda não está configurado no banco</h2>
          <p>
            {semSchema ? <>O schema <b>avaliador</b> não está liberado na API do Supabase. Em Settings → API → Exposed schemas, acrescente <b>avaliador</b> (mantendo os que já existem) e salve.</>
              : semFuncao ? <>As migrations do Avaliador não foram encontradas. Rode 0001 e 0002 no SQL Editor do projeto acontece-dashboard.</>
              : <>Não foi possível consultar o seu acesso. Confira se as migrations 0001 e 0002 rodaram e se o schema <b>avaliador</b> está em Exposed schemas.</>}
          </p>
          <code className="erro-tecnico">{erroAcesso}</code>
        </>
      ) : (
        <>
          <h2>Acesso aguardando liberação</h2>
          <p>A conta <b>{user?.email}</b> ainda não foi liberada no Avaliador. Peça ao gestor para liberar este e-mail na tela Equipe.</p>
        </>
      )}
      <div className="acoes-aviso">
        <button className="btn" onClick={recarregarAcesso}>Verificar novamente</button>
        <button className="btn btn-sec" onClick={sair}>Sair</button>
      </div>
    </div>
  );
}
