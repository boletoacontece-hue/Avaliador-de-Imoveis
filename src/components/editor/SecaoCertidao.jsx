import React, { useRef, useState } from "react";
import { mensagemErro } from "../../lib/versao";
import { FileSearch, Trash2, ShieldCheck, ShieldAlert, AlertTriangle, Info, OctagonAlert, CheckCircle2, Lock, ClipboardCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { brlDec, num } from "../../lib/format";
import { ModalAplicarFicha } from "./DadosLaudo";

const ICONE = { impeditivo: OctagonAlert, atencao: AlertTriangle, informativo: Info };
const dataBr = (s) => { const m = String(s || "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
const soDig = (s) => String(s || "").replace(/\D/g, "");

/** Situação de validade da certidão (em regra, 30 dias da emissão). */
export function validadeCertidao(c) {
  const emissao = dataBr(c?.emitida_em);
  if (!emissao) return null;
  const vence = new Date(emissao); vence.setDate(vence.getDate() + (Number(c.validade_dias) || 30));
  const hoje = new Date(new Date().toDateString());
  const dias = Math.round((vence - hoje) / 86400000);
  return { vence: vence.toLocaleDateString("pt-BR"), dias, vencida: dias < 0 };
}

export default function SecaoCertidao({ f, set, setVarios, salvarAntes }) {
  const input = useRef();
  const [etapa, setEtapa] = useState("");
  const [erro, setErro] = useState("");
  const [aplicar, setAplicar] = useState(null);
  const c = f.registry_sheet;

  async function ler(file) {
    setErro("");
    try {
      if (!(await salvarAntes())) throw new Error("Salve as alterações pendentes antes.");
      setEtapa("Preparando as páginas…");
      const { paginasComoImagens } = await import("../../lib/leitorPdf");
      const { paginas, total, cortado } = await paginasComoImagens(file);
      setEtapa(`Lendo ${paginas.length} ${paginas.length === 1 ? "página" : "páginas"} com IA… (cerca de 30 segundos)`);
      const { data, error } = await supabase.functions.invoke("gerar-estrategia", { body: { evaluation_id: f.id, modo: "certidao", paginas } });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context.json()).erro || msg; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      if (!data?.certidao) throw new Error("A IA não devolveu os dados da certidão.");
      set("registry_sheet", { ...data.certidao, arquivo: file.name, paginas_lidas: paginas.length, paginas_total: total, importado_em: new Date().toISOString(), ...(cortado ? { aviso: `Só as primeiras ${paginas.length} de ${total} páginas foram lidas.` } : {}) });
    } catch (e) { setErro(mensagemErro(e, "Não consegui ler a certidão.")); }
    setEtapa("");
  }

  function paraAvaliacao() {
    const im = c.imovel || {};
    const a = { registry_number: c.matricula, area_total: im.area_total, property_area: im.area_privativa };
    for (const k of Object.keys(a)) if (a[k] == null || a[k] === "") delete a[k];
    setAplicar(a);
  }

  const val = validadeCertidao(c);
  const alertas = c?.alertas || [];
  const onusVigentes = (c?.onus || []).filter((o) => o.situacao !== "cancelado");

  return (
    <>
      <section className="painel">
        <div className="importar-ficha">
          <div>
            <b><FileSearch size={17} /> Certidão de matrícula / ônus (leitura por IA)</b>
            <span className="dica">
              Envie o PDF da certidão de inteiro teor, ônus e situação jurídica (pode ser escaneada). A IA extrai matrícula, cartório, áreas registradas,
              histórico de atos e ônus, e aponta o que merece atenção na venda ou locação.
            </span>
            <span className="selo-privacidade"><ShieldCheck size={14} /> As páginas são enviadas à IA só para leitura e o PDF não é guardado. Nomes, CPF e RG de pessoas físicas não são registrados.</span>
          </div>
          <button type="button" className="btn btn-sec" disabled={!!etapa} onClick={() => input.current?.click()}>
            {etapa ? "Lendo…" : c ? "Ler outra certidão" : "Ler certidão (PDF)"}
          </button>
          <input ref={input} type="file" accept="application/pdf,.pdf" hidden
            onChange={(ev) => { const a = ev.target.files?.[0]; ev.target.value = ""; if (a) ler(a); }} />
        </div>
        {etapa && <p className="dica" style={{ marginTop: 10 }}><span className="giro-mini" /> {etapa}</p>}
        {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}
      </section>

      {c && (
        <section className="painel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <h2>Matrícula {c.matricula || "—"}{c.cartorio ? ` · ${c.cartorio}` : ""}</h2>
              <p className="dica" style={{ margin: 0 }}>
                {c.tipo_documento || "Certidão"}{c.emitida_em ? ` emitida em ${c.emitida_em}` : ""}{c.situacao_ate ? ` (situação até ${c.situacao_ate})` : ""}
                {c.ultimo_ato ? ` · último ato ${c.ultimo_ato}` : ""}{c.aviso ? ` · ${c.aviso}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" onClick={paraAvaliacao}><ClipboardCheck size={16} /> Aplicar ao imóvel</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm("Remover a certidão desta avaliação?")) set("registry_sheet", null); }}>
                <Trash2 size={15} /> Remover
              </button>
            </div>
          </div>

          <div className="cert-status">
            <div className={`cert-selo ${c.situacao_juridica?.livre ? "livre" : "restrito"}`}>
              {c.situacao_juridica?.livre ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
              <div>
                <b>{c.situacao_juridica?.livre ? "Livre de ônus e restrições" : `${onusVigentes.length || "Há"} ônus/restrição vigente`}</b>
                <span>{c.situacao_juridica?.texto_certificado || "—"}</span>
              </div>
            </div>
            {val && (
              <div className={`cert-selo ${val.vencida ? "restrito" : val.dias <= 7 ? "aviso" : "livre"}`}>
                {val.vencida ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
                <div>
                  <b>{val.vencida ? `Certidão vencida desde ${val.vence}` : `Válida até ${val.vence}`}</b>
                  <span>{val.vencida ? "Peça uma certidão atualizada antes de emitir o laudo ou fechar negócio." : `${val.dias} dias restantes (validade usual de 30 dias).`}</span>
                </div>
              </div>
            )}
          </div>

          {alertas.length > 0 && (
            <div className="cert-alertas">
              <h3 className="sub-titulo">Pontos de atenção para o negócio</h3>
              {alertas.map((a, i) => {
                const Ic = ICONE[a.nivel] || Info;
                return (
                  <div key={i} className={`cert-alerta ${a.nivel || "informativo"}`}>
                    <Ic size={18} />
                    <div>
                      <b>{a.titulo}{a.sensivel && <span className="selo-interno"><Lock size={11} /> só para o corretor</span>}</b>
                      {a.detalhe && <p>{a.detalhe}</p>}
                      {a.base_legal && <small>Base: {a.base_legal}</small>}
                    </div>
                  </div>
                );
              })}
              <p className="dica" style={{ marginTop: 6 }}>
                Alertas gerados por IA a partir da certidão, para orientar o corretor; não substituem a análise jurídica. Os marcados “só para o corretor” nunca vão para o laudo, para a estratégia nem para o link do cliente.
              </p>
            </div>
          )}

          <div className="referencia" style={{ marginTop: 14 }}>
            {c.imovel?.area_privativa != null && <div><span>Área privativa registrada</span><b>{num(c.imovel.area_privativa)} m²</b></div>}
            {c.imovel?.area_comum != null && <div><span>Área comum</span><b>{num(c.imovel.area_comum)} m²</b></div>}
            {c.imovel?.area_total != null && <div><span>Área total</span><b>{num(c.imovel.area_total)} m²</b></div>}
            {c.imovel?.fracao_ideal && <div><span>Fração ideal</span><b>{c.imovel.fracao_ideal}</b></div>}
          </div>
          {(c.imovel?.denominacao_atual || c.imovel?.descricao) && (
            <p style={{ marginTop: 12, lineHeight: 1.6 }}><b>Imóvel:</b> {c.imovel.denominacao_atual || c.imovel.descricao}
              {c.imovel?.habite_se ? ` · Habite-se ${c.imovel.habite_se}` : ""}</p>
          )}
          {c.titularidade && (
            <p className="dica" style={{ marginTop: 4 }}>
              Titularidade atual: {c.titularidade.quantidade_titulares ?? "?"} {c.titularidade.tipo_titulares || "titular(es)"}
              {c.titularidade.fracoes ? ` (${c.titularidade.fracoes})` : ""}{c.titularidade.forma_aquisicao ? `, por ${c.titularidade.forma_aquisicao}` : ""}
              {c.titularidade.ato ? ` — ${c.titularidade.ato}` : ""}{c.titularidade.data ? ` de ${c.titularidade.data}` : ""}.
            </p>
          )}

          {c.atos?.length > 0 && (
            <details style={{ marginTop: 12 }} open>
              <summary className="sub-titulo" style={{ cursor: "pointer" }}>Histórico da matrícula ({c.atos.length} atos)</summary>
              <div className="rolagem-x" style={{ marginTop: 8 }}>
                <table className="tabela">
                  <thead><tr><th>Ato</th><th>Data</th><th>Natureza</th><th>Resumo</th><th className="num">Valor</th></tr></thead>
                  <tbody>
                    {c.atos.map((a, i) => (
                      <tr key={i}><td className="num">{a.ato}</td><td className="num">{a.data || "—"}</td><td>{a.natureza}</td><td style={{ minWidth: 260 }}>{a.resumo}</td><td className="num">{a.valor ? brlDec(a.valor) : "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="dica" style={{ marginTop: 6 }}>Valores de atos antigos são históricos (e, em partilhas, valores atribuídos): servem de contexto, não de amostra de mercado.</p>
            </details>
          )}
        </section>
      )}

      <ConsolidacaoDocumental f={f} />

      {aplicar && (
        <ModalAplicarFicha f={f} dados={aplicar} onFechar={() => setAplicar(null)}
          onAplicar={(novo) => { const { report_type, ...resto } = novo; setVarios(resto); setAplicar(null); }} />
      )}
    </>
  );
}

// ------------------------------------------------------------ conferência documental
function ConsolidacaoDocumental({ f }) {
  const ficha = f.property_sheet, iptu = f.tax_sheet, cert = f.registry_sheet;
  const fontes = [ficha && "ficha", iptu && "IPTU", cert && "certidão"].filter(Boolean);
  if (fontes.length < 2) return null;

  const linhas = [];
  const cmpNum = (a, b, tol) => (a == null || b == null ? null : Math.abs(a - b) <= tol);
  // matrícula
  if (cert?.matricula) {
    const aval = f.registry_number;
    linhas.push(["Matrícula", ficha?.matricula || "—", "—", cert.matricula, aval ? soDig(aval) === soDig(cert.matricula) : null,
      aval && soDig(aval) !== soDig(cert.matricula) ? `A avaliação usa ${aval}.` : null]);
  }
  // inscrição do IPTU
  if (iptu?.inscricao) {
    const ref = ficha?.inscricao_iptu || cert?.imovel?.inscricao_iptu;
    linhas.push(["Inscrição do IPTU", ficha?.inscricao_iptu || "—", iptu.inscricao, cert?.imovel?.inscricao_iptu || "—", ref ? soDig(ref) === soDig(iptu.inscricao) : null, null]);
  }
  // área privativa
  const aFicha = ficha?.area_privativa, aCert = cert?.imovel?.area_privativa;
  if (aFicha != null || aCert != null) {
    const ok = cmpNum(aFicha, aCert, 0.1);
    linhas.push(["Área privativa (m²)", aFicha != null ? num(aFicha) : "—", "—", aCert != null ? num(aCert) : "—", ok,
      ok === false ? `Diferença de ${num(Math.abs(aFicha - aCert).toFixed(2))} m²: no laudo, prevalece a área registrada na matrícula.` : null]);
  }
  // área total
  const tFicha = ficha?.area_total, tCert = cert?.imovel?.area_total;
  if (tFicha != null || tCert != null) linhas.push(["Área total (m²)", tFicha != null ? num(tFicha) : "—", "—", tCert != null ? num(tCert) : "—", cmpNum(tFicha, tCert, 0.1), null]);
  // endereço (unidade/bloco/quadra)
  const chaves = (s) => { const t = String(s || "").toUpperCase(); return { q: (t.match(/(?:CLSW|SW|SQSW|SHCSW\s*CL\s*SW|CLS|SQS|CLN|SQN)\s*-?\s*(\d{3})/) || [])[1], u: (t.match(/\b(?:KIT|KS|SALA|APTO?|LOJA|UNIDADE)\.?\s*(?:ST[UÚ]DIO\s*)?(?:N[ºO°.]?\s*)?(\d{2,4})\b/) || [])[1] }; };
  const eFicha = ficha?.endereco_ficha, eIptu = iptu?.endereco_fiscal, eCert = cert?.imovel?.denominacao_atual || cert?.imovel?.endereco || cert?.imovel?.descricao;
  if ([eFicha, eIptu, eCert].filter(Boolean).length >= 2) {
    const ks = [eFicha, eIptu, eCert].filter(Boolean).map(chaves);
    const qs = new Set(ks.map((k) => k.q).filter(Boolean)), us = new Set(ks.map((k) => k.u).filter(Boolean));
    const ok = qs.size <= 1 && us.size <= 1 && (qs.size + us.size) > 0 ? true : qs.size > 1 || us.size > 1 ? false : null;
    linhas.push(["Endereço / unidade", eFicha || "—", eIptu || "—", eCert || "—", ok, ok === false ? "Quadra ou número da unidade não bate entre os documentos." : null]);
  }
  // locação x certidão
  if (f.occupancy === "alugado" && cert?.situacao_juridica) {
    linhas.push(["Locação", ficha?.vigencia_fim ? `alugado até ${ficha.vigencia_fim}` : "alugado", "—",
      cert.situacao_juridica.locacao_registrada ? "registrada" : "não registrada", null,
      cert.situacao_juridica.locacao_registrada ? null : "Contrato sem registro na matrícula: o comprador pode denunciar a locação (Lei 8.245/91, art. 8º); o inquilino tem preferência (art. 27)."]);
  }
  if (!linhas.length) return null;

  const divergencias = linhas.filter((l) => l[4] === false).length;
  return (
    <section className="painel">
      <h2>Conferência documental</h2>
      <p className="dica">Cruza {fontes.join(", ")}. {divergencias ? `${divergencias} ${divergencias === 1 ? "divergência encontrada" : "divergências encontradas"}.` : "Nenhuma divergência nos dados comparáveis."}</p>
      <div className="rolagem-x">
        <table className="tabela tabela-consolidacao">
          <thead><tr><th>Dado</th><th>Ficha Imobiliar</th><th>IPTU (Receita DF)</th><th>Certidão</th><th>Situação</th></tr></thead>
          <tbody>
            {linhas.map(([rot, a, b, c, ok, nota]) => (
              <tr key={rot}>
                <td><b>{rot}</b></td><td>{a}</td><td>{b}</td><td>{c}</td>
                <td className={ok === false ? "alerta-texto" : ok ? "ok-texto" : ""}>
                  {ok === true ? <><CheckCircle2 size={14} /> confere</> : ok === false ? <><AlertTriangle size={14} /> diverge</> : "—"}
                  {nota && <small style={{ display: "block", minWidth: 220, whiteSpace: "normal" }}>{nota}</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
