import React, { useRef, useState } from "react";
import { mensagemErro } from "../../lib/versao";
import { FileUp, Trash2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Campo, InputMoeda, InputNumero } from "../ui";
import { brl, brlDec } from "../../lib/format";
import { ListaDinamica } from "./TabPercepcoes";
import { ModalAplicarFicha } from "./DadosLaudo";

// Dados da ficha do Imobiliar, agrupados. tipo: texto | moeda | num | dec | simnao | situacao
const GRUPOS = [
  ["Identificação", [
    ["codigo", "Código no Imobiliar", "texto"], ["tipo_ficha", "Tipo (como na ficha)", "texto"], ["cep", "CEP", "texto"],
    ["endereco_ficha", "Endereço (como na ficha)", "texto", "span2"], ["edificio", "Edifício / condomínio", "texto"],
    ["data_inclusao", "Na carteira desde", "texto"], ["classificacao", "Classificação", "texto"],
    ["para_venda", "Disponível para venda", "simnao"], ["para_locacao", "Disponível para locação", "simnao"],
  ]],
  ["Áreas e composição", [
    ["area_privativa", "Área privativa (m²)", "dec"], ["area_total", "Área total (m²)", "dec"],
    ["dormitorios", "Dormitórios", "num"], ["vagas", "Vagas", "num"], ["andar", "Andar", "num"],
  ]],
  ["Custos mensais", [
    ["condominio", "Condomínio (último boleto)", "moeda"], ["condominio_inicial", "Condomínio inicial", "moeda"],
    ["iptu_parcela", "IPTU (parcela)", "moeda"], ["seguro_incendio", "Seguro incêndio", "moeda"],
    ["administradora_condominio", "Administradora do condomínio", "texto"],
  ]],
  ["Documentação", [
    ["inscricao_iptu", "Inscrição do IPTU", "texto"], ["matricula", "Matrícula (cartório)", "texto"], ["zona_registro", "Zona / cartório", "texto"],
  ]],
  ["Locação", [
    ["situacao", "Situação", "situacao"], ["aluguel_atual", "Aluguel atual", "moeda"], ["aluguel_pretendido", "Aluguel pretendido", "moeda"],
    ["vigencia_inicio", "Contrato desde", "texto"], ["vigencia_fim", "Contrato até", "texto"], ["prazo_contrato_meses", "Prazo (meses)", "num"],
    ["indice_reajuste", "Índice de reajuste", "texto"], ["periodicidade_reajuste", "Periodicidade", "texto"], ["proximo_reajuste", "Próximo reajuste", "texto"],
    ["garantia", "Garantia", "texto"], ["aluguel_faturado", "Aluguel faturado no período", "moeda"], ["aluguel_faturado_periodo", "Período", "texto"],
  ]],
];

const ROTULO_CAMPO = Object.fromEntries(GRUPOS.flatMap(([, campos]) => campos.map(([k, r, tipo]) => [k, r])));
const TIPO_CAMPO = Object.fromEntries(GRUPOS.flatMap(([, campos]) => campos.map(([k, , tipo]) => [k, tipo])));
const mostrarValor = (k, v) => (v == null ? "—" : TIPO_CAMPO[k] === "moeda" ? brlDec(v) : typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v));
const paraData = (s) => { const m = (s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; };
const dias = (d) => Math.round((d - new Date(new Date().toDateString())) / 86400000);

export default function TabFicha({ f, set, setVarios }) {
  const input = useRef();
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [aplicar, setAplicar] = useState(null);
  const ficha = f.property_sheet;
  // edição manual vira "edição" e sobrevive a novas fichas somadas
  const setK = async (k, v) => {
    const { fontesDaFicha, mesclarFichas } = await import("../../lib/leitorPdf");
    set("property_sheet", mesclarFichas(fontesDaFicha(ficha), { ...(ficha?.edicoes || {}), [k]: v }));
  };

  // aceita uma ou as duas fichas (completa e consulta), juntas ou em momentos diferentes
  async function ler(arquivos) {
    setErro(""); setLendo(true);
    try {
      const { itensDoPdf, lerFichaImobiliar, adicionarFicha, fichaParaAvaliacao: mapear } = await import("../../lib/leitorPdf");
      let ps = ficha, lidas = 0;
      for (const file of arquivos) {
        let nova;
        try { nova = lerFichaImobiliar(await itensDoPdf(file)); }
        catch (e) { setErro(mensagemErro(e).startsWith("O Avaliador foi atualizado") ? mensagemErro(e) : `${file.name}: ${e.message}`); continue; }
        const codigoAtual = ps?.codigo;
        if (codigoAtual && nova.codigo && nova.codigo !== codigoAtual &&
            !window.confirm(`A ficha “${file.name}” é do imóvel código ${nova.codigo}, mas a atual é do código ${codigoAtual}.\n\nOK = substituir pela ficha nova (outro imóvel) · Cancelar = ignorar este arquivo`)) continue;
        if (codigoAtual && nova.codigo && nova.codigo !== codigoAtual) ps = null;
        ps = adicionarFicha(ps, nova); lidas++;
      }
      if (lidas) { set("property_sheet", ps); setAplicar(mapear(ps)); }
    } catch (e) { setErro(mensagemErro(e, "Não consegui ler o PDF.")); }
    setLendo(false);
  }

  async function removerFonte(fonte) {
    const { fontesDaFicha, mesclarFichas } = await import("../../lib/leitorPdf");
    const resto = fontesDaFicha(ficha).filter((x) => x !== fonte && !(x.formato === fonte.formato && x.emitida_em === fonte.emitida_em));
    set("property_sheet", resto.length ? mesclarFichas(resto, ficha.edicoes || {}) : null);
  }

  async function reaplicar() {
    const { fichaParaAvaliacao: mapear } = await import("../../lib/leitorPdf");
    setAplicar(mapear(ficha));
  }

  const campo = ([k, rotulo, tipo, classe]) => (
    <Campo key={k} rotulo={rotulo} className={classe}>
      {tipo === "moeda" ? <InputMoeda centavos valor={ficha?.[k]} onChange={(v) => setK(k, v)} />
        : tipo === "num" || tipo === "dec" ? <InputNumero decimal={tipo === "dec"} valor={ficha?.[k]} onChange={(v) => setK(k, v)} />
        : tipo === "simnao" ? (
          <select className="select" value={ficha?.[k] == null ? "" : String(ficha[k])} onChange={(e) => setK(k, e.target.value === "" ? null : e.target.value === "true")}>
            <option value="">—</option><option value="true">Sim</option><option value="false">Não</option>
          </select>)
        : tipo === "situacao" ? (
          <select className="select" value={ficha?.[k] || ""} onChange={(e) => setK(k, e.target.value || null)}>
            <option value="">—</option><option value="alugado">Alugado</option><option value="desocupado">Desocupado</option>
          </select>)
        : <input className="input" value={ficha?.[k] ?? ""} onChange={(e) => setK(k, e.target.value)} />}
    </Campo>
  );

  // leitura para o laudo: o que a ficha diz sobre renda e contrato
  const fimContrato = paraData(ficha?.vigencia_fim);
  const restam = fimContrato ? dias(fimContrato) : null;
  const oferta = Number(f.suggested_value) || null;
  const rendaAno = ficha?.aluguel_faturado_meses >= 12 ? ficha.aluguel_faturado : ficha?.aluguel_atual ? ficha.aluguel_atual * 12 : null;

  return (
    <>
      <section className="painel">
        <div className="importar-ficha">
          <div>
            <b><FileUp size={17} /> Ficha do imóvel (Imobiliar)</b>
            <span className="dica">
              Importe a ficha completa, a consulta de imóveis ou as duas (pode selecionar os dois PDFs de uma vez, ou somar depois).
              As fichas se completam: tudo o que o laudo usa sobre o imóvel sai daqui — identificação, áreas, custos, documentação, contrato de locação e aluguel faturado.
            </span>
            <span className="selo-privacidade"><ShieldCheck size={14} /> O PDF é lido no navegador e não é enviado. Nomes, CPF, RG, contatos e contas de proprietário e inquilino nunca são lidos.</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sec" disabled={lendo} onClick={() => input.current?.click()}>
              {lendo ? "Lendo…" : ficha ? "Adicionar ficha" : "Importar ficha (PDF)"}
            </button>
          </div>
          <input ref={input} type="file" accept="application/pdf,.pdf" hidden multiple
            onChange={(ev) => { const a = [...(ev.target.files || [])]; ev.target.value = ""; if (a.length) ler(a); }} />
        </div>
        {erro && <div className="erro-msg" style={{ marginTop: 10 }}>{erro}</div>}
      </section>

      {!ficha && (
        <section className="painel">
          <p className="dica" style={{ margin: 0 }}>
            Para imóveis que ainda não são da carteira, não há ficha: preencha direto na aba Imóvel.
          </p>
        </section>
      )}

      {ficha && (
        <>
          <section className="painel">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <h2>Ficha do imóvel{ficha.codigo ? ` · código ${ficha.codigo}` : ""}</h2>
                <div className="fontes-ficha">
                  {(ficha.fontes || [{ formato: ficha.formato, emitida_em: ficha.emitida_em }]).map((fo) => (
                    <span key={`${fo.formato}${fo.emitida_em}`} className="fonte-chip">
                      {fo.formato}{fo.emitida_em ? ` · ${fo.emitida_em}` : ""}
                      {ficha.fontes?.length > 1 && <button type="button" aria-label={`Remover ${fo.formato}`} onClick={() => removerFonte(fo)}>×</button>}
                    </span>
                  ))}
                  {(ficha.fontes?.length || 1) < 2 && <span className="dica">Pode somar a {/consulta/i.test(ficha.formato || "") ? "ficha completa" : "consulta de imóveis"} em “Adicionar ficha”.</span>}
                </div>
                <p className="dica" style={{ margin: "6px 0 0" }}>Confira e ajuste o que for preciso; os dados ficam salvos na avaliação e não vão para o link do cliente.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={reaplicar}><ClipboardCheck size={16} /> Aplicar ao imóvel</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm("Remover a ficha desta avaliação? Os campos já aplicados ao imóvel continuam.")) set("property_sheet", null); }}>
                  <Trash2 size={15} /> Remover ficha
                </button>
              </div>
            </div>
          </section>

          {ficha.conflitos?.length > 0 && (
            <section className="painel">
              <h2>Diferenças entre as fichas</h2>
              <p className="dica">Os dados abaixo vieram diferentes nas duas fichas. Por padrão vale o da ficha mais recente; troque se for o caso.</p>
              <div className="rolagem-x">
                <table className="tabela">
                  <thead><tr><th>Campo</th><th>Em uso</th><th>Na outra ficha</th><th /></tr></thead>
                  <tbody>
                    {ficha.conflitos.map((c) => (
                      <tr key={c.campo}>
                        <td><b>{ROTULO_CAMPO[c.campo] || c.campo}</b></td>
                        <td>{mostrarValor(c.campo, c.usado)}<small className="dica" style={{ display: "block" }}>{c.usado_de}</small></td>
                        <td>{mostrarValor(c.campo, c.outro)}<small className="dica" style={{ display: "block" }}>{c.outro_de}</small></td>
                        <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => setK(c.campo, c.outro)}>Usar este</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(ficha.situacao === "alugado" || ficha.aluguel_atual) && (
            <section className="painel leitura-ficha">
              <h2>Leitura para o laudo</h2>
              <ul>
                {ficha.aluguel_atual > 0 && <li>Imóvel <b>alugado</b> por <b className="num">{brlDec(ficha.aluguel_atual)}</b>/mês{ficha.garantia ? `, com garantia ${ficha.garantia}` : ""}.</li>}
                {ficha.aluguel_faturado > 0 && <li>Aluguel faturado de <b className="num">{brlDec(ficha.aluguel_faturado)}</b> em {ficha.aluguel_faturado_meses} meses ({ficha.aluguel_faturado_periodo}).</li>}
                {rendaAno && oferta && f.evaluation_type !== "aluguel" && (
                  <li>Rentabilidade bruta de <b className="num">{((rendaAno / oferta) * 100).toFixed(1).replace(".", ",")}% ao ano</b> sobre o valor de oferta ({brl(oferta)}).</li>
                )}
                {fimContrato && (
                  <li>Contrato {ficha.vigencia_inicio ? `de ${ficha.vigencia_inicio} ` : ""}até <b>{ficha.vigencia_fim}</b>
                    {restam != null && (restam < 0 ? <> — <b className="alerta-texto">vencido há {Math.abs(restam)} dias</b> (verifique se foi renovado)</>
                      : restam <= 90 ? <> — <b className="alerta-texto">vence em {restam} dias</b>: pesa na negociação com investidor</> : <> — {restam} dias restantes</>)}.
                  </li>
                )}
                {ficha.indice_reajuste && <li>Reajuste pelo {ficha.indice_reajuste.replace(/IGPM/i, "IGP-M").replace(/\bANO\b/i, "(anual)")}{ficha.proximo_reajuste ? `, próximo em ${ficha.proximo_reajuste}` : ""}.</li>}
                {ficha.aluguel_pretendido > 0 && ficha.aluguel_atual > 0 && Math.abs(ficha.aluguel_pretendido - ficha.aluguel_atual) > 1 && (
                  <li className="dica">Aluguel pretendido cadastrado: {brlDec(ficha.aluguel_pretendido)} (difere do atual; confira se está desatualizado).</li>
                )}
              </ul>
            </section>
          )}

          {GRUPOS.map(([titulo, campos]) => (
            <section className="painel" key={titulo}>
              <h2>{titulo}</h2>
              <div className="grade g3" style={{ marginTop: 10 }}>{campos.map(campo)}</div>
            </section>
          ))}

          <section className="painel">
            <ListaDinamica titulo="Características (ficha)" cor="var(--dourado)" embutida
              dica="Como vieram do Imobiliar. Ao aplicar, entram na lista de características do imóvel."
              itens={ficha.caracteristicas || []} onChange={(v) => setK("caracteristicas", v)} sugestoes={[]} />
            <div style={{ marginTop: 18 }}>
              <ListaDinamica titulo="Descrição (ficha)" cor="var(--verde)" embutida
                dica="Texto de anúncio da consulta de imóveis. A IA usa para redigir a descrição do laudo."
                itens={ficha.descricao || []} onChange={(v) => setK("descricao", v)} sugestoes={[]} />
            </div>
          </section>
        </>
      )}

      {aplicar && (
        <ModalAplicarFicha f={f} dados={aplicar} onFechar={() => setAplicar(null)}
          onAplicar={(novo) => { setVarios(novo); setAplicar(null); }} />
      )}
    </>
  );
}
