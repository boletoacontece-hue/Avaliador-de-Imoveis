import React, { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Campo, Carregando, useToast } from "../components/ui";
import { dataCurta } from "../lib/format";

export default function Equipe() {
  const { user } = useAuth();
  const [membros, setMembros] = useState(null);
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("corretor");
  const [erro, setErro] = useState("");
  const [toast, avisar] = useToast();

  const carregar = () => supabase.from("membros").select("*").order("criado_em", { ascending: false })
    .then(({ data }) => setMembros(data || []));
  useEffect(() => { carregar(); }, []);

  async function liberar(e) {
    e.preventDefault(); setErro("");
    const { data, error } = await supabase.rpc("liberar_membro", { p_email: email, p_papel: papel });
    if (error) return setErro(error.message);
    if (!data.ok) return setErro(data.erro);
    avisar("Acesso liberado"); setEmail(""); carregar();
  }

  async function alternar(m) {
    const { error } = await supabase.from("membros").update({ ativo: !m.ativo }).eq("user_id", m.user_id);
    if (error) setErro(error.message); else carregar();
  }

  if (!membros) return <Carregando />;
  return (
    <main className="pagina" style={{ maxWidth: 900 }}>
      <div className="cabecalho"><div><h1>Equipe</h1><p>Quem pode criar avaliações. Corretor vê só as próprias; gestor vê todas.</p></div></div>
      <form className="painel" onSubmit={liberar}>
        <h2>Liberar acesso</h2>
        <p className="dica">A pessoa cria a conta na tela de login; depois você libera o e-mail aqui.</p>
        <div className="grade grade-liberar">
          <Campo rotulo="E-mail"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Campo>
          <Campo rotulo="Papel">
            <select className="select" value={papel} onChange={(e) => setPapel(e.target.value)}>
              <option value="corretor">Corretor</option><option value="gestor">Gestor</option>
            </select>
          </Campo>
          <button className="btn"><UserPlus size={17} /> Liberar</button>
        </div>
        {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}
      </form>
      <div className="painel rolagem-x">
        <h2>Membros</h2>
        <p className="dica">Administradores da Vistoria (papel admin) já são gestores aqui automaticamente.</p>
        {membros.length === 0 ? <p className="dica">Ninguém liberado ainda.</p> : (
          <table className="tabela">
            <thead><tr><th>E-mail</th><th>Papel</th><th>Desde</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {membros.map((m) => (
                <tr key={m.user_id}>
                  <td>{m.email}</td>
                  <td style={{ textTransform: "capitalize" }}>{m.papel}</td>
                  <td className="num">{dataCurta(m.criado_em)}</td>
                  <td><span className={`badge ${m.ativo ? "badge-ok" : "badge-off"}`}>{m.ativo ? "Ativo" : "Bloqueado"}</span></td>
                  <td style={{ textAlign: "right" }}>
                    {m.user_id !== user.id && <button className="btn btn-sec btn-sm" onClick={() => alternar(m)}>{m.ativo ? "Bloquear" : "Reativar"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {toast}
    </main>
  );
}
