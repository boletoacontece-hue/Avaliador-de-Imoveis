import React, { useRef, useState } from "react";
import { mensagemErro } from "../../lib/versao";
import { FileUp, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { brl, brlDec } from "../../lib/format";

const pct = (v) => `${Number(v).toFixed(2).replace(".", ",")}%`;
const soDigitos = (s) => String(s || "").replace(/\D/g, "");

export default function SecaoIptu({ f, set, setVarios }) {
  const input = useRef();
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [todos, setTodos] = useState(false);
  const t = f.tax_sheet;

  // aceita a Pauta IPTU/TLP (Receita do DF) e a Ficha de Cadastro Imobiliário (GDF), juntas ou separadas
  async function ler(arquivos) {
    setErro(""); setLendo(true);
    try {
      const { itensDoPdf, lerDocumentoGdf } = await import("../../lib/leitorPdf");
      let atual = f.tax_sheet || null;
      const preencher = {};
      for (const file of arquivos) {
        let doc;
        try { doc = lerDocumentoGdf(await itensDoPdf(file)); }
        catch (e) { setErro(mensagemErro(e).startsWith("O Avaliador foi atualizado") ? mensagemErro(e) : `${file.name}: ${e.message}`); continue; }
        const quando = new Date().toISOString();
        if (doc.tipo === "pauta") atual = { ...doc.dados, importado_em: quando, ...(atual?.cadastro ? { cadastro: atual.cadastro } : {}) };
        else atual = { ...(atual || {}), cadastro: { ...doc.dados, importado_em: quando } };
        const d = doc.dados;
        if (!f.iptu_registration && d.inscricao) preencher.iptu_registration = d.inscricao;
        if (!f.registry_number && d.matricula) preencher.registry_number = d.matricula;
        if (!f.property_cep && d.cep) preencher.property_cep = d.cep;
      }
      if (atual) set("tax_sheet", atual);
      if (Object.keys(preencher).length) setVarios(preencher);
    } catch (e) { setErro(mensagemErro(e, "Não consegui ler o PDF.")); }
    setLendo(false);
  }
  const cad = t?.cadastro;
  const temPauta = (t?.historico || []).length > 0;

  // conferência com o que já está na avaliação / ficha do Imobiliar
  const refInscricao = f.iptu_registration || f.property_sheet?.inscricao_iptu;
  const confere = t?.inscricao && refInscricao ? soDigitos(t.inscricao) === soDigitos(refInscricao) : null;
  const historico = t?.historico || [];
  const linhas = todos ? historico : historico.slice(0, 6);

  return (
    <>
      <section className="painel">
        <div className="importar-ficha">
          <div>
            <b><FileUp size={17} /> IPTU e cadastro imobiliário (GDF)</b>
            <span className="dica">
              Importe a “Pauta IPTU/TLP por imóvel” (valor venal, IPTU, TLP e histórico) e/ou a “Ficha de Cadastro Imobiliário” do GDF
              (habite-se, área construída, matrícula, título de aquisição); pode selecionar os dois PDFs de uma vez. Os dados
              entram como referência fiscal no laudo.
            </span>
            <span className="selo-privacidade"><ShieldCheck size={14} /> Lido no navegador. Nome e CPF/CNPJ do proprietário não são lidos.</span>
          </div>
          <button type="button" className="btn btn-sec" disabled={lendo} onClick={() => input.current?.click()}>
            {lendo ? "Lendo…" : t ? "Adicionar documento" : "Importar IPTU / cadastro (PDF)"}
          </button>
          <input ref={input} type="file" accept="application/pdf,.pdf" hidden multiple
            onChange={(ev) => { const a = [...(ev.target.files || [])]; ev.target.value = ""; if (a.length) ler(a); }} />
        </div>
        {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}
      </section>

      {cad && <BlocoCadastro cad={cad} f={f} onRemover={() => { const { cadastro, ...resto } = t; set("tax_sheet", temPauta ? resto : null); }} />}

      {t && temPauta && (
        <section className="painel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <h2>IPTU {t.ano} · inscrição {t.inscricao}</h2>
              <p className="dica" style={{ margin: 0 }}>Endereço fiscal: {t.endereco_fiscal || "—"}{t.emitida_em ? ` · emitida em ${t.emitida_em}` : ""}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm("Remover a pauta de IPTU desta avaliação?")) set("tax_sheet", cad ? { cadastro: cad } : null); }}>
              <Trash2 size={15} /> Remover
            </button>
          </div>

          {confere !== null && (
            <p className={`conferencia-linha ${confere ? "ok" : "falta"}`}>
              {confere ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              {confere ? `A inscrição confere com a do imóvel (${refInscricao}).` : `A inscrição do IPTU (${t.inscricao}) é diferente da cadastrada no imóvel (${refInscricao}). Confira se o documento é do imóvel certo.`}
            </p>
          )}

          <div className="referencia" style={{ marginTop: 12 }}>
            <div><span>Valor venal {t.ano}</span><b>{brl(t.valor_venal)}</b><small className="dica" style={{ display: "block" }}>base de cálculo do IPTU</small></div>
            <div><span>IPTU {t.ano}</span><b>{brlDec(t.iptu_anual)}</b><small className="dica" style={{ display: "block" }}>alíquota {pct(t.aliquota)}</small></div>
            <div><span>TLP {t.ano}</span><b>{brlDec(t.tlp_anual)}</b><small className="dica" style={{ display: "block" }}>taxa de limpeza pública</small></div>
            {t.variacao_venal_5a != null && <div><span>Valor venal em 5 anos</span><b>{t.variacao_venal_5a >= 0 ? "+" : ""}{String(t.variacao_venal_5a).replace(".", ",")}%</b></div>}
          </div>
          {t.mudanca_aliquota && (
            <p className="aviso aviso-ambar" style={{ marginTop: 12 }}>
              A alíquota mudou de {pct(t.mudanca_aliquota.de)} para {pct(t.mudanca_aliquota.para)} em {t.mudanca_aliquota.ano} — em geral, sinal de reclassificação do uso do imóvel. Entra nas observações do laudo.
            </p>
          )}
          <p className="dica" style={{ marginTop: 10 }}>O valor venal é fiscal e costuma ficar abaixo do valor de mercado; no laudo ele aparece só como referência.</p>

          <div className="rolagem-x" style={{ marginTop: 10 }}>
            <table className="tabela">
              <thead><tr><th>Ano</th><th className="num">Valor venal</th><th className="num">Alíquota</th><th className="num">IPTU</th><th className="num">TLP</th></tr></thead>
              <tbody>
                {linhas.map((h) => (
                  <tr key={h.ano}><td className="num">{h.ano}</td><td className="num">{brlDec(h.base_calculo)}</td><td className="num">{pct(h.aliquota)}</td><td className="num">{brlDec(h.iptu)}</td><td className="num">{brlDec(h.tlp)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {historico.length > 6 && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setTodos(!todos)}>
              {todos ? "Mostrar menos" : `Ver os ${historico.length} anos`}
            </button>
          )}
        </section>
      )}
    </>
  );
}

// ------------------------------------------------------------ Ficha de Cadastro Imobiliário (GDF)
function BlocoCadastro({ cad, f, onRemover }) {
  const num2 = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 4 }));
  // confere só contra OUTRA fonte (a matrícula da avaliação pode ter vindo deste próprio cadastro)
  const refMat = f.registry_sheet?.matricula || f.property_sheet?.matricula;
  const confMat = cad.matricula && refMat ? soDigitos(cad.matricula) === soDigitos(refMat) : null;
  const linhas = [
    ["Situação", cad.situacao], ["Endereço fiscal", cad.endereco_fiscal], ["Localidade · CEP", [cad.localidade, cad.cep].filter(Boolean).join(" · ")],
    ["Classificação", cad.classificacao], ["Natureza", cad.natureza],
    ["Habite-se", cad.habite_se_numero ? `nº ${cad.habite_se_numero}${cad.habite_se_data ? ` de ${cad.habite_se_data}` : ""}` : null],
    ["Área do habite-se", cad.habite_se_area != null ? `${num2(cad.habite_se_area)} m²` : null],
    ["Área do terreno · fração ideal", [cad.area_terreno != null && `${num2(cad.area_terreno)} m²`, cad.fracao_ideal != null && `${num2(cad.fracao_ideal)}%`].filter(Boolean).join(" · ") || null],
    ["Título de aquisição", cad.titulo ? `${cad.titulo}${cad.titulo_data ? ` em ${cad.titulo_data}` : ""}${cad.titulo_livro ? ` (livro ${cad.titulo_livro}, folha ${cad.titulo_folha || "—"})` : ""}` : null],
    ["Registro", cad.matricula ? `Matrícula ${cad.matricula}${cad.averbacao ? ` · ${cad.averbacao}` : ""}${cad.cartorio_registro ? ` · ${(cad.cartorio_registro.match(/(\d+)\s*o?\s*oficio/i) || [])[1] ? `${Number(cad.cartorio_registro.match(/(\d+)\s*o?\s*oficio/i)[1])}º Ofício de Registro de Imóveis` : cad.cartorio_registro}` : ""}${cad.registro_data ? ` · ${cad.registro_data}` : ""}` : null],
    ["Coeficientes (KT · KC)", cad.kt != null ? `${num2(cad.kt)} · ${num2(cad.kc)}` : null],
  ].filter(([, v]) => v);
  return (
    <section className="painel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h2>Cadastro imobiliário · inscrição {cad.inscricao}</h2>
          <p className="dica" style={{ margin: 0 }}>{cad.fonte}{cad.emitida_em ? ` · emitida em ${cad.emitida_em}` : ""}. Nome e CPF do proprietário não são lidos.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm("Remover a ficha de cadastro desta avaliação?")) onRemover(); }}><Trash2 size={15} /> Remover</button>
      </div>
      {confMat !== null && (
        <p className={`conferencia-linha ${confMat ? "ok" : "falta"}`}>
          {confMat ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {confMat ? `A matrícula confere com a da ${f.registry_sheet?.matricula ? "certidão" : "ficha do Imobiliar"} (${refMat}).` : `A matrícula do cadastro (${cad.matricula}) é diferente da ${f.registry_sheet?.matricula ? "certidão" : "ficha do Imobiliar"} (${refMat}). Confira os documentos.`}
        </p>
      )}
      <table className="tabela" style={{ marginTop: 12 }}>
        <tbody>{linhas.map(([r, v]) => <tr key={r}><td style={{ width: "34%" }}><b>{r}</b></td><td>{v}</td></tr>)}</tbody>
      </table>
      {cad.habite_se_area && f.property_area && Math.abs(cad.habite_se_area - f.property_area) > 0.5 && (
        <p className="dica" style={{ marginTop: 8 }}>A área do habite-se ({num2(cad.habite_se_area)} m²) difere da área privativa usada na avaliação ({num2(f.property_area)} m²). O habite-se costuma registrar a área construída da unidade; a área privativa da matrícula prevalece no laudo.</p>
      )}
    </section>
  );
}
