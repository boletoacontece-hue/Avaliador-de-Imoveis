import React, { useEffect, useMemo, useRef, useState } from "react";
import { ehApp } from "../../lib/nativo";
import { mensagemErro } from "../../lib/versao";
import { FileDown, Eye, Sparkles, RotateCcw, CheckCircle2, AlertTriangle, BadgeCheck, Paperclip, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { SECOES_LAUDO, textosPadrao } from "../../lib/textosLaudo";
import { TIPOS_LAUDO } from "./DadosLaudo";
import { checklistPtam } from "../../lib/ptam";
import { comprimirJpeg, enviarPrivado, linksTemporarios, removerPrivado } from "../../lib/privado";

export default function TabLaudo({ f, set, comps, salvarAntes }) {
  const [perfil, setPerfil] = useState(null);
  const [temAssinatura, setTemAssinatura] = useState(null);
  const [gerando, setGerando] = useState("");
  const [erro, setErro] = useState("");
  const tipoReal = f.report_type || "completo";
  const ptam = tipoReal === "ptam";
  const tipo = tipoReal;
  const av = f;
  const [anexos, setAnexos] = useState([]);
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

  const conferenciaPadrao = [
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
  const conferencia = ptam
    ? checklistPtam(f, comps, { perfil: perfil || {}, temAssinatura }).map((i) => [i.ok, i.rotulo, i.onde, !i.obrigatorio])
    : conferenciaPadrao;
  const faltando = conferencia.filter(([ok, , , opcional]) => !ok && !opcional);

  async function pdf(acao) {
    setErro(""); setGerando(acao);
    try {
      const { baixarLaudo, gerarLaudoBlob } = await import("../../pdf/gerarLaudo");
      if (acao === "baixar") await baixarLaudo(av, comps, ptam ? anexos : []);
      else if (ehApp) {   // app: abre no leitor de PDF do celular
        const { pdfNoAparelho } = await import("../../lib/nativo");
        await pdfNoAparelho(await gerarLaudoBlob(av, comps, ptam ? anexos : []), `previa-${f.id}.pdf`, { abrir: true });
      } else {
        const aba = window.open("", "_blank");
        const url = URL.createObjectURL(await gerarLaudoBlob(av, comps, ptam ? anexos : []));
        if (aba) aba.location.href = url; else window.location.href = url;
      }
    } catch (e) { console.error(e); setErro(mensagemErro(e).startsWith("O Avaliador foi atualizado") ? mensagemErro(e) : `Não foi possível gerar o PDF: ${e.message}`); }
    setGerando("");
  }

  async function redigirComIa() {
    if (Object.keys(editados).some((k) => k !== "data_laudo" && editados[k]) &&
        !window.confirm("A IA vai reescrever os textos do laudo, inclusive os que você editou. Continuar?")) return;
    setErro(""); setGerando("ia");
    try {
      if (!(await salvarAntes())) throw new Error("Salve as alterações pendentes antes.");
      const { data, error } = await supabase.functions.invoke("gerar-estrategia", { body: { evaluation_id: f.id, modo: "laudo", tipo, homogeneizado: !!f.homogenization?.usarNoLaudo, base: Object.fromEntries(secoes.map(([k]) => [k, (editados[k] || "").trim() || padrao[k] || ""]).filter(([, v]) => v)) } });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context.json()).erro || msg; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      if (!data?.textos) throw new Error("A IA não devolveu os textos. Tente de novo.");
      const novos = { ...editados };
      for (const [k] of secoes) if (typeof data.textos[k] === "string" && data.textos[k].trim()) novos[k] = data.textos[k].trim();
      set("report_texts", novos);
    } catch (e) { setErro(mensagemErro(e)); }
    setGerando("");
  }

  return (
    <>
      <section className="painel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h2>Laudo em PDF · {TIPOS_LAUDO.find(([v]) => v === tipoReal)?.[1]}</h2>
            <p className="dica" style={{ margin: 0, maxWidth: 560 }}>
              {tipo === "cliente" ? "Modelo de uma página, para imóvel da carteira."
                : ptam ? "Parecer Técnico de Avaliação Mercadológica no roteiro do COFECI: itens 1 a 10, relatório fotográfico, croqui e anexos."
                : "Modelo completo: capa, apresentação, tabela de amostras, indicadores e valores."}
              {" "}O tipo de laudo muda na aba Imóvel. O estudo com link para o cliente continua disponível em “Copiar link”.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sec" disabled={!!gerando} onClick={() => pdf("ver")}><Eye size={16} /> {gerando === "ver" ? "Gerando…" : "Pré-visualizar"}</button>
            <button type="button" className="btn" disabled={!!gerando} onClick={() => pdf("baixar")}><FileDown size={16} /> {gerando === "baixar" ? "Gerando…" : "Baixar PDF"}</button>
          </div>
        </div>
        {ptam && faltando.length > 0 && (
          <p className="aviso aviso-ambar" style={{ marginTop: 12 }}>
            Faltam {faltando.length} {faltando.length === 1 ? "item obrigatório" : "itens obrigatórios"} do roteiro do PTAM. Dá para gerar, mas o PDF sai marcado como RASCUNHO até tudo estar preenchido.
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

      {ptam && <PainelPtam f={f} set={set} anexos={anexos} setAnexos={setAnexos} />}

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

// ------------------------------------------------------------ opções do PTAM
function PainelPtam({ f, set, anexos, setAnexos }) {
  const pt = f.ptam || {};
  const salvar = (patch) => set("ptam", { ...pt, ...patch });
  const [seloUrl, setSeloUrl] = useState(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const inSelo = useRef(), inAnexo = useRef();

  useEffect(() => {
    if (pt.selo_path) linksTemporarios([pt.selo_path]).then((l) => setSeloUrl(l[pt.selo_path] || null));
    else setSeloUrl(null);
  }, [pt.selo_path]);

  async function enviarSelo(arq) {
    setErro(""); setEnviando(true);
    try {
      let imagem = arq;
      if (/pdf/i.test(arq.type) || /\.pdf$/i.test(arq.name)) {   // selo digital em PDF → 1ª página vira imagem
        const { paginasComoImagens } = await import("../../lib/leitorPdf");
        const { paginas } = await paginasComoImagens(arq, { maxPaginas: 1, larguraMax: 900, qualidade: 0.9 });
        imagem = await (await fetch(`data:image/jpeg;base64,${paginas[0]}`)).blob();
      }
      const caminho = await enviarPrivado(await comprimirJpeg(imagem, 900, 0.9), `${f.id}/selo`);
      if (pt.selo_path) removerPrivado([pt.selo_path]).catch(() => {});
      salvar({ selo_path: caminho });
    } catch (e) { setErro(mensagemErro(e)); }
    setEnviando(false);
  }

  return (
    <section className="painel">
      <h2 style={{ display: "flex", gap: 8, alignItems: "center" }}><BadgeCheck size={19} /> PTAM: selo, declaração e anexos</h2>
      <div className="grade g2" style={{ marginTop: 12, alignItems: "start" }}>
        <div>
          <span className="rotulo-campo">Selo Certificador</span>
          <p className="dica" style={{ margin: "2px 0 8px" }}>Cada PTAM tem um selo próprio, numerado, emitido pelo CRECI ou pela plataforma do Sistema Cofeci-Creci a partir da DAM. Envie a imagem ou o PDF do selo.</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div className="selo-previa">{seloUrl ? <img src={seloUrl} alt="Selo Certificador" /> : <span className="dica">sem selo</span>}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" className="btn btn-sec btn-sm" disabled={enviando} onClick={() => inSelo.current?.click()}>{enviando ? "Enviando…" : pt.selo_path ? "Trocar selo" : "Enviar selo"}</button>
              <input className="input" placeholder="Nº do selo" value={pt.selo_numero || ""} onChange={(e) => salvar({ selo_numero: e.target.value })} style={{ maxWidth: 180 }} />
            </div>
            <input ref={inSelo} type="file" accept="image/*,application/pdf,.pdf" hidden onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ""; if (a) enviarSelo(a); }} />
          </div>
        </div>
        <div>
          <label className="campo"><span>Data de referência do valor</span>
            <input type="date" className="input" value={pt.data_referencia || ""} onChange={(e) => salvar({ data_referencia: e.target.value })} style={{ maxWidth: 200 }} />
            <small className="dica">Em branco, usa a data de emissão do PDF.</small>
          </label>
          <label className="interruptor-linha">
            <input type="checkbox" checked={pt.incluir_dam !== false} onChange={(e) => salvar({ incluir_dam: e.target.checked })} />
            <span><b>Incluir a Declaração de Avaliação Mercadológica (DAM)</b><br />
              <small className="dica">Página com a DAM preenchida (CPF, RG e endereço do corretor ficam para preencher à mão). Desligue se a DAM for emitida só pela plataforma do Cofeci-Creci.</small></span>
          </label>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <span className="rotulo-campo">Documentos anexos (ao final do PDF)</span>
        <p className="dica" style={{ margin: "2px 0 8px" }}>Certidão de matrícula atualizada, IPTU e outros PDFs. Eles são juntados ao PTAM na hora de gerar e não ficam guardados no sistema; escolha de novo a cada download.</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {anexos.map((a, i) => (
            <span key={i} className="fonte-chip"><Paperclip size={12} /> {a.name}
              <button type="button" aria-label={`Remover ${a.name}`} onClick={() => setAnexos(anexos.filter((_, k) => k !== i))}><X size={12} /></button></span>
          ))}
          <button type="button" className="btn btn-sec btn-sm" onClick={() => inAnexo.current?.click()}><Paperclip size={14} /> Anexar PDFs</button>
          <input ref={inAnexo} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => { const a = [...(e.target.files || [])]; e.target.value = ""; setAnexos([...anexos, ...a]); }} />
        </div>
      </div>
      {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}
    </section>
  );
}
