import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, supabaseReady } from "./supabase";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [acesso, setAcesso] = useState({ membro: false, gestor: false });
  const [loading, setLoading] = useState(true);

  const carregarAcesso = useCallback(async (u) => {
    if (!u) { setAcesso({ membro: false, gestor: false }); return; }
    const { data, error } = await supabase.rpc("meu_acesso");
    setAcesso(error || !data ? { membro: false, gestor: false } : data);
  }, []);

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      await carregarAcesso(u);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      const u = session?.user || null;
      setUser(u);
      if (evt === "SIGNED_IN" || evt === "SIGNED_OUT") carregarAcesso(u);
    });
    return () => sub.subscription.unsubscribe();
  }, [carregarAcesso]);

  const value = {
    user, loading, supabaseReady,
    membro: acesso.membro, gestor: acesso.gestor,
    recarregarAcesso: () => carregarAcesso(user),
    entrar: (email, senha) => supabase.auth.signInWithPassword({ email: email.trim(), password: senha }),
    criarConta: (nome, email, senha) =>
      supabase.auth.signUp({ email: email.trim(), password: senha, options: { data: { nome } } }),
    sair: () => supabase.auth.signOut(),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
