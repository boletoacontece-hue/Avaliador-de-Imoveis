import React, { useRef, useState } from "react";
import { mensagemErro } from "../../lib/versao";
import { FileUp, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { brl, brlDec } from "../../lib/format";

const pct = (v) => `${Number(v).toFixed(2).replace(".", ",")}%`;
const soDigitos = (s) => String(s || "").replace(/\D/g, "");

export default function SecaoIptu({ f, set }) {
  const input = useRef();
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [todos, setTodos] = useState(false);
  const t = f.tax_sheet;

  async function ler(file) {
    setErro(""); setLendo(true);
    try {
      const { itensDoPdf, lerFichaIptu } = await import("../../lib/leitorPdf");
      const lida = { ...lerFichaIptu(await itensDoPdf(file)), importado_em: new Date().toISOString() };
      set("tax_sheet", lida);
      if (!f.iptu_registration && lida.inscricao) set("iptu_registration", lida.inscricao);
    } catch (e) { setErro(mensagemErro(e, "Não consegui ler o PDF.")); }
    setLendo(false);
  }

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
            <b><FileUp size={17} /> Ficha de IPTU (Receita do DF)</b>
            <span className="dica">
              Importe a “Pauta IPTU/TLP por imóvel” baixada no site da Receita do DF: valor venal, IPTU, TLP e o histórico ano a ano
              entram como referência fiscal no laudo.
            </span>
            <span className="selo-privacidade"><ShieldCheck size={14} /> Lido no navegador. Nome e CPF/CNPJ do proprietário não são lidos.</span>
          </div>
          <button type="button" className="btn btn-sec" disabled={lendo} onClick={() => input.current?.click()}>
            {lendo ? "Lendo…" : t ? "Importar outra" : "Importar IPTU (PDF)"}
          </button>
          <input ref={input} type="file" accept="application/pdf,.pdf" hidden
            onChange={(ev) => { const a = ev.target.files?.[0]; ev.target.value = ""; if (a) ler(a); }} />
        </div>
        {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}
      </section>

      {t && (
        <section className="painel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <h2>IPTU {t.ano} · inscrição {t.inscricao}</h2>
              <p className="dica" style={{ margin: 0 }}>Endereço fiscal: {t.endereco_fiscal || "—"}{t.emitida_em ? ` · emitida em ${t.emitida_em}` : ""}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm("Remover a ficha de IPTU desta avaliação?")) set("tax_sheet", null); }}>
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
