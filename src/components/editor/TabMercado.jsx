import React, { useRef, useState } from "react";
import { mensagemErro } from "../../lib/versao";
import { FileUp, Trash2, PencilLine } from "lucide-react";
import { Campo, InputMoeda, InputNumero } from "../ui";
import { brl, num } from "../../lib/format";

// Indicadores do estudo, agrupados como no relatório do portal.
// tipo: "moeda" | "num" | "dec" | "pct" | "meses"
const GRUPOS = [
  ["Preços do segmento", [
    ["preco_medio", "Preço médio", "moeda"], ["preco_m2_medio", "Preço médio por m²", "moeda"],
    ["anuncios", "Imóveis anunciados", "num"], ["area_media", "Área média (m²)", "dec"],
    ["menor_valor", "Menor valor", "moeda"], ["maior_valor", "Maior valor", "moeda"],
  ]],
  ["Demanda", [
    ["leads_12m", "Leads em 12 meses", "num"], ["acessos", "Acessos aos anúncios", "num"],
    ["leads_por_oferta", "Leads por anúncio", "dec"], ["pct_indicacao", "Contatos por indicação (%)", "pct"],
  ]],
  ["Liquidez e valorização", [
    ["tempo_venda_meses", "Tempo médio até vender (meses)", "meses"], ["tempo_ativos_meses", "Tempo dos anúncios ativos (meses)", "meses"],
    ["valor_medio_saida", "Valor médio dos vendidos", "moeda"], ["valorizacao_ano", "Valorização em 12 meses (%)", "pct"],
    ["valorizacao_bairro", "Valorização do bairro (%)", "pct"], ["valorizacao_trimestre", "Último trimestre (%)", "pct"],
  ]],
  ["Perfil da região", [
    ["habitantes", "Habitantes", "num"], ["renda_media", "Renda média do domicílio", "moeda"],
  ]],
];

export default function TabMercado({ f, set }) {
  const input = useRef();
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const e = f.portal_study;
  const setE = (k, v) => set("portal_study", { ...(e || {}), [k]: v });

  async function ler(file) {
    setErro(""); setLendo(true);
    try {
      const { itensDoPdf, lerEstudoPortal } = await import("../../lib/leitorPdf");
      const lido = lerEstudoPortal(await itensDoPdf(file));
      if (lido.finalidade && lido.finalidade !== f.evaluation_type)
        setErro(`Atenção: o estudo é de ${lido.finalidade} e esta avaliação é de ${f.evaluation_type}. Os dados foram importados mesmo assim.`);
      set("portal_study", { ...lido, importado_em: new Date().toISOString() });
    } catch (err) { setErro(mensagemErro(err, "Não consegui ler o PDF.")); }
    setLendo(false);
  }

  const campo = ([k, rotulo, tipo]) => (
    <Campo key={k} rotulo={rotulo}>
      {tipo === "moeda"
        ? <InputMoeda valor={e?.[k]} onChange={(v) => setE(k, v)} />
        : <InputNumero decimal={tipo !== "num"} valor={e?.[k]} onChange={(v) => setE(k, v)} />}
    </Campo>
  );

  return (
    <>
      <section className="painel">
        <div className="importar-ficha">
          <div>
            <b><FileUp size={17} /> Estudo de mercado do portal</b>
            <span className="dica">
              Importe o PDF do Estudo de Mercado do DFImóveis: preços do segmento, demanda, tempo de venda e valorização entram
              na apresentação e no laudo, com a fonte citada. O tempo médio de venda passa a ser o dado real da curva de liquidez.
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sec" disabled={lendo} onClick={() => input.current?.click()}>
              {lendo ? "Lendo…" : e ? "Importar outro" : "Importar estudo (PDF)"}
            </button>
            {!e && <button type="button" className="btn btn-ghost" onClick={() => set("portal_study", { fonte: "" })}><PencilLine size={16} /> Preencher à mão</button>}
          </div>
          <input ref={input} type="file" accept="application/pdf,.pdf" hidden
            onChange={(ev) => { const a = ev.target.files?.[0]; ev.target.value = ""; if (a) ler(a); }} />
        </div>
        {erro && <div className={e ? "aviso aviso-ambar" : "erro-msg"} style={{ marginTop: 10 }}>{erro}</div>}
      </section>

      {e && (
        <>
          <section className="painel">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <h2>Segmento analisado</h2>
                <p className="dica" style={{ margin: 0 }}>Confira se o recorte do estudo corresponde ao imóvel avaliado.</p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (window.confirm("Remover o estudo desta avaliação?")) set("portal_study", null); }}>
                <Trash2 size={15} /> Remover estudo
              </button>
            </div>
            <div className="grade g2" style={{ marginTop: 14 }}>
              <Campo rotulo="Fonte"><input className="input" value={e.fonte || ""} placeholder="Ex.: DFImóveis.com (TIMIPRO)" onChange={(ev) => setE("fonte", ev.target.value)} /></Campo>
              <Campo rotulo="Segmento"><input className="input" value={e.segmento || ""} placeholder="Ex.: Noroeste, Apartamento, 1 quarto (últimos 12 meses)" onChange={(ev) => setE("segmento", ev.target.value)} /></Campo>
              <Campo rotulo="Amostra (imóveis)"><InputNumero valor={e.amostra} onChange={(v) => setE("amostra", v)} /></Campo>
              <Campo rotulo="Referência (mês/ano)"><input className="input num" value={e.referencia || ""} placeholder="08/2026" onChange={(ev) => setE("referencia", ev.target.value)} /></Campo>
            </div>
          </section>
          {GRUPOS.map(([titulo, campos]) => (
            <section className="painel" key={titulo}>
              <h2>{titulo}</h2>
              <div className="grade g3" style={{ marginTop: 10 }}>{campos.map(campo)}</div>
              {titulo === "Liquidez e valorização" && e.ranking_valorizacao?.length > 0 && (
                <p className="dica" style={{ marginTop: 12 }}>
                  Ranking de valorização: {e.ranking_valorizacao.map((r) => `${r.bairro} ${num(r.pct)}%`).join(" · ")}
                </p>
              )}
            </section>
          ))}
          {e.preco_m2_medio > 0 && f.property_area > 0 && (
            <section className="painel">
              <h2>Leitura rápida</h2>
              <p style={{ margin: "6px 0 0", lineHeight: 1.7 }}>
                Pelo preço médio do m² do segmento ({brl(e.preco_m2_medio)}), um imóvel de {num(f.property_area)} m² ficaria em torno de{" "}
                <b className="num">{brl(e.preco_m2_medio * f.property_area)}</b>.
                {e.tempo_venda_meses ? <> Os imóveis do segmento levaram em média <b className="num">{num(e.tempo_venda_meses)} meses</b> para sair do portal.</> : null}
                {" "}É só uma referência de média: o valor da avaliação vem das amostras comparáveis.
              </p>
            </section>
          )}
        </>
      )}
    </>
  );
}
