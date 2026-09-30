import React, { useEffect, useMemo, useState } from "react";
import { FileDown, Eye, Sparkles, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { SECOES_LAUDO, textosPadrao } from "../../lib/textosLaudo";
import { TIPOS_LAUDO } from "./DadosLaudo";

export default function TabLaudo({ f, set, comps, salvarAntes }) {
  const [perfil, setPerfil] = useState(null);
  const [temAssinatura, setTemAssinatura] = useState(null);
  const [gerando, setGerando] = useState("");
  const [erro, setErro] = useState("");
  const tipoReal = f.report_type || "completo";
  const ptam = tipoReal === "ptam";
  // enquanto o PDF do PTAM não existe, o PTAM sai no modelo completo
  const tipo = ptam ? "completo" : tipoReal;
  const av = ptam ? { ...f, report_type: "completo" } : f;
  const padrao = useMemo(() => textosPadrao(f, comps), [f, comps]);
  const editados = f.report_texts || {};
  const secoes = SECOES_LAUDO.filter(([, , tipos]) => tipos.includes(tipo));

  useEffect(() => {
    supabase.from("public_broker_profiles").select("name,creci_number,cnai_number").eq("user_id", f.broker_id).maybeSingle()
      .then(({ data }) => setPerfil(data || {}));
    supabase.from("assinaturas").select("user_id").eq("user_id", f.broker_id).maybeSingle()
      .then(({ data }) => setTemAssinatura(!!data));
  }, [f.broker_id]);

  const setTexto = (k, v) => {
    const novo = { ...editados, [k]: v };
    if (v == null) delete novo[k];
    set("report_texts", novo);
  };

  const conferencia = [
    [!!f.property_street, "Endereço do imóvel", "aba Imóvel"],
    [f.property_area > 0, "Área privativa", "aba Imóvel"],
    [f.market_value > 0, "Valor de mercado", "aba Valor"],
    [f.suggested_value > 0, "Valor estratégico de oferta", "aba Valor"],
    [!!perfil?.name && !!perfil?.creci_number, "Nome e CRECI do corretor", "Meu perfil"],
    [temAssinatura, "Assinatura digitalizada", "Meu perfil (opcional: sem ela, fica a linha para assinar à mão)", true],
    ...(tipo === "completo" ? [
      [comps.filter((c) => c.price > 0 && c.area > 0).length >= 3, "Ao menos 3 amostras com preço e área", "aba Comparativos"],
      [!!f.interested_party, "Interessado (capa)", "aba Imóvel → Dados do laudo", true],
    ] : []),
  ];
  const faltando = conferencia.filter(([ok, , , opcional]) => !ok && !opcional);

  async function pdf(acao) {
    setErro(""); setGerando(acao);
    try {
      const { baixarLaudo, gerarLaudoBlob } = await import("../../pdf/gerarLaudo");
      if (acao === "baixar") await baixarLaudo(av, comps);
      else {
        const aba = window.open("", "_blank");
        const url = URL.createObjectURL(await gerarLaudoBlob(av, comps));
        if (aba) aba.location.href = url; else window.location.href = url;
      }
    } catch (e) { console.error(e); setErro(`Não foi possível gerar o PDF: ${e.message}`); }
    setGerando("");
  }

  async function redigirComIa() {
    if (Object.keys(editados).some((k) => k !== "data_laudo" && editados[k]) &&
        !window.confirm("A IA vai reescrever os textos do laudo, inclusive os que você editou. Continuar?")) return;
    setErro(""); setGerando("ia");
    try {
      if (!(await salvarAntes())) throw new Error("Salve as alterações pendentes antes.");
      const { data, error } = await supabase.functions.invoke("gerar-estrategia", { body: { evaluation_id: f.id, modo: "laudo", tipo, base: Object.fromEntries(secoes.map(([k]) => [k, (editados[k] || "").trim() || padrao[k] || ""]).filter(([, v]) => v)) } });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context.json()).erro || msg; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      if (!data?.textos) throw new Error("A IA não devolveu os textos. Tente de novo.");
      const novos = { ...editados };
      for (const [k] of secoes) if (typeof data.textos[k] === "string" && data.textos[k].trim()) novos[k] = data.textos[k].trim();
      set("report_texts", novos);
    } catch (e) { setErro(e.message); }
    setGerando("");
  }

  return (
    <>
      <section className="painel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h2>Laudo em PDF · {TIPOS_LAUDO.find(([v]) => v === tipoReal)?.[1]}</h2>
            <p className="dica" style={{ margin: 0, maxWidth: 560 }}>
              {tipo === "cliente" ? "Modelo de uma página, para imóvel da carteira." : "Modelo completo: capa, apresentação, tabela de amostras, indicadores e valores."}
              {" "}O tipo de laudo muda na aba Imóvel. O estudo com link para o cliente continua disponível em “Copiar link”.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sec" disabled={!!gerando} onClick={() => pdf("ver")}><Eye size={16} /> {gerando === "ver" ? "Gerando…" : "Pré-visualizar"}</button>
            <button type="button" className="btn" disabled={!!gerando} onClick={() => pdf("baixar")}><FileDown size={16} /> {gerando === "baixar" ? "Gerando…" : "Baixar PDF"}</button>
          </div>
        </div>
        {ptam && (
          <p className="aviso aviso-ambar" style={{ marginTop: 12 }}>
            O PDF próprio do PTAM (homogeneização, croqui, fotos da vistoria e anexos) chega na próxima etapa. Por enquanto, o PTAM sai no modelo de avaliação completa.
          </p>
        )}
        <ul className="conferencia">
          {conferencia.map(([ok, rotulo, onde, opcional]) => (
            <li key={rotulo} className={ok ? "ok" : opcional ? "opcional" : "falta"}>
              {ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              <span>{rotulo}</span>{!ok && <small>{onde}</small>}
            </li>
          ))}
        </ul>
        {faltando.length > 0 && <p className="dica" style={{ marginTop: 6 }}>Dá para gerar o PDF mesmo assim; os itens em falta ficam em branco no documento.</p>}
        {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}
      </section>

      <section className="painel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h2>Textos do laudo</h2>
            <p className="dica" style={{ margin: 0, maxWidth: 600 }}>
              Os textos automáticos se atualizam com os dados da avaliação (ficha, IPTU, estudo, amostras e valores). Ao editar, a seção passa a usar o seu texto.
              A IA pode redigir tudo de uma vez, usando só os números da avaliação.
            </p>
          </div>
          <button type="button" className="btn btn-sec" disabled={!!gerando} onClick={redigirComIa}>
            <Sparkles size={16} /> {gerando === "ia" ? "Redigindo…" : "Redigir com IA"}
          </button>
        </div>
        <div className="grade g2" style={{ marginTop: 14 }}>
          <label className="campo">
            <span>Data do laudo</span>
            <input className="input" value={editados.data_laudo || ""} placeholder={new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
              onChange={(e) => setTexto("data_laudo", e.target.value || null)} />
          </label>
        </div>
        {secoes.map(([k, rotulo]) => {
          const editado = typeof editados[k] === "string" && editados[k].trim() !== "";
          return (
            <div key={k} className="texto-laudo">
              <div className="cab">
                <b>{rotulo}</b>
                <span className={`selo ${editado ? "editado" : ""}`}>{editado ? "editado" : "automático"}</span>
                {editado && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTexto(k, null)}><RotateCcw size={14} /> Voltar ao automático</button>}
              </div>
              <textarea className="textarea" rows={Math.min(12, Math.max(3, Math.ceil(((editado ? editados[k] : padrao[k]) || "").length / 110)))}
                value={editado ? editados[k] : padrao[k] || ""} placeholder="Sem dados suficientes para o texto automático. Escreva aqui."
                onChange={(e) => setTexto(k, e.target.value)} />
            </div>
          );
        })}
      </section>
    </>
  );
}
