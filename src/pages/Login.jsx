import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { Campo } from "../components/ui";

export default function Login() {
  const { entrar, criarConta, supabaseReady } = useAuth();
  const [modo, setModo] = useState("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);
  const base = import.meta.env.BASE_URL;

  async function enviar(e) {
    e.preventDefault();
    setErro(""); setAviso(""); setEnviando(true);
    if (modo === "entrar") {
      const { error } = await entrar(email, senha);
      if (error) setErro(error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : error.message);
    } else {
      if (senha.length < 8) { setErro("A senha precisa ter pelo menos 8 caracteres."); setEnviando(false); return; }
      const { error, data } = await criarConta(nome, email, senha);
      if (error) setErro(error.message);
      else if (!data.session) setAviso("Conta criada. Confirme o e-mail recebido e peça ao gestor para liberar seu acesso.");
    }
    setEnviando(false);
  }

  return (
    <div className="login">
      <div className="login-lado">
        <img src={`${base}logo-acontece-branco.png`} alt="Acontece Imobiliária" />
        <div>
          <h1>Estudos de valor que o cliente entende.</h1>
          <p>Monte a avaliação com amostras reais de mercado e envie ao cliente um link com a análise completa.</p>
        </div>
        <div className="regua" aria-hidden="true" />
      </div>
      <div className="login-form">
        <form onSubmit={enviar}>
          <div>
            <h2>{modo === "entrar" ? "Entrar" : "Criar conta"}</h2>
            <p className="dica" style={{ margin: "4px 0 0" }}>
              {modo === "entrar" ? "Use o e-mail cadastrado na Acontece." : "Depois de criar, o gestor libera seu acesso."}
            </p>
          </div>
          {!supabaseReady && <div className="aviso aviso-ambar">Supabase não configurado: preencha o arquivo .env.</div>}
          {modo === "criar" && (
            <Campo rotulo="Nome completo"><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" /></Campo>
          )}
          <Campo rotulo="E-mail"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Campo>
          <Campo rotulo="Senha"><input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete={modo === "entrar" ? "current-password" : "new-password"} /></Campo>
          {erro && <div className="erro-msg" role="alert">{erro}</div>}
          {aviso && <div className="aviso">{aviso}</div>}
          <button className="btn" disabled={enviando}>{enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}</button>
          <p className="dica" style={{ margin: 0 }}>
            {modo === "entrar" ? "Ainda não tem acesso? " : "Já tem conta? "}
            <button type="button" className="alternar" onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setErro(""); setAviso(""); }}>
              {modo === "entrar" ? "Criar conta" : "Entrar"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
