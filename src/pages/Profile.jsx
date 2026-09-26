import React, { useEffect, useRef, useState } from "react";
import { Camera, MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { enviarFoto, removerFoto } from "../lib/imagem";
import { Campo, Carregando, useToast } from "../components/ui";

const VAZIO = { name: "", photo_url: "", creci_number: "", cnai_number: "", phone: "" };

export default function Profile() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState("");
  const [toast, avisar] = useToast();
  const arquivo = useRef(null);

  useEffect(() => {
    supabase.from("public_broker_profiles").select("name,photo_url,creci_number,cnai_number,phone")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setPerfil({ ...VAZIO, name: user.user_metadata?.nome || "", ...(data || {}) }));
  }, [user]);

  const set = (k) => (e) => setPerfil((p) => ({ ...p, [k]: e.target.value }));

  async function trocarFoto(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setEnviandoFoto(true); setErro("");
    try {
      const antiga = perfil.photo_url;
      const url = await enviarFoto(f, "perfil", 600);
      setPerfil((p) => ({ ...p, photo_url: url }));
      await salvar({ ...perfil, photo_url: url }, true);
      removerFoto(antiga).catch(() => {});
    } catch (err) { setErro(err.message); }
    setEnviandoFoto(false);
  }

  async function salvar(dados = perfil, silencioso = false) {
    setSalvando(true); setErro("");
    const { error } = await supabase.from("public_broker_profiles").upsert({
      user_id: user.id,
      name: dados.name?.trim() || null,
      photo_url: dados.photo_url || null,
      creci_number: dados.creci_number?.trim() || null,
      cnai_number: dados.cnai_number?.trim() || null,
      phone: dados.phone?.trim() || null,
    }, { onConflict: "user_id" });
    setSalvando(false);
    if (error) setErro(error.message);
    else if (!silencioso) avisar("Perfil salvo");
  }

  if (!perfil) return <Carregando />;

  return (
    <main className="pagina" style={{ maxWidth: 760 }}>
      <div className="cabecalho">
        <div>
          <h1>Meu perfil</h1>
          <p>Estes dados aparecem no cartão do corretor, no fim de cada avaliação enviada.</p>
        </div>
      </div>
      <form className="painel" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
        <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
          <button type="button" onClick={() => arquivo.current?.click()} aria-label="Trocar foto"
            style={{ width: 104, height: 104, borderRadius: "50%", border: "2px solid var(--linha)", background: "var(--off)", overflow: "hidden", cursor: "pointer", padding: 0, position: "relative", flex: "none" }}>
            {perfil.photo_url
              ? <img src={perfil.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <Camera size={28} color="var(--sub)" />}
            {enviandoFoto && <span className="carregando" style={{ position: "absolute", inset: 0, minHeight: 0, background: "rgba(255,255,255,.7)" }}><span className="giro" /></span>}
          </button>
          <input ref={arquivo} type="file" accept="image/*" hidden onChange={trocarFoto} />
          <div>
            <b>Foto do corretor</b>
            <p className="dica" style={{ margin: "2px 0 8px" }}>Foto de rosto, fundo neutro. Ela aparece na capa e no cartão final.</p>
            <button type="button" className="btn btn-sec btn-sm" onClick={() => arquivo.current?.click()}>{perfil.photo_url ? "Trocar foto" : "Enviar foto"}</button>
          </div>
        </div>
        <div className="grade g2">
          <Campo rotulo="Nome de exibição" className="span2"><input className="input" value={perfil.name} onChange={set("name")} required /></Campo>
          <Campo rotulo="CRECI"><input className="input" value={perfil.creci_number} onChange={set("creci_number")} placeholder="Ex.: 12345-DF" /></Campo>
          <Campo rotulo="CNAI" dica="Cadastro Nacional de Avaliadores Imobiliários, se tiver."><input className="input" value={perfil.cnai_number} onChange={set("cnai_number")} /></Campo>
          <Campo rotulo="WhatsApp" dica="Com DDD. O botão “Falar no WhatsApp” usa este número." className="span2">
            <input className="input" type="tel" value={perfil.phone} onChange={set("phone")} placeholder="(61) 99999-9999" />
          </Campo>
        </div>
        {erro && <div className="erro-msg" style={{ marginTop: 14 }}>{erro}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20, alignItems: "center" }}>
          {perfil.phone && <span className="dica" style={{ display: "inline-flex", gap: 6, alignItems: "center", marginRight: "auto" }}><MessageCircle size={14} /> O cliente fala com você direto pelo link.</span>}
          <button className="btn" disabled={salvando}>{salvando ? "Salvando…" : "Salvar perfil"}</button>
        </div>
      </form>
      {toast}
    </main>
  );
}
