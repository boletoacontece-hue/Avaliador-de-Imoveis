import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font, Svg, Defs, LinearGradient, Stop, Rect } from "@react-pdf/renderer";
// fontes TTF (o motor do PDF não lê bem WOFF compactado) — licença OFL, repositório google/fonts
import p400 from "./fontes/Poppins-Regular.ttf?url";
import p400i from "./fontes/Poppins-Italic.ttf?url";
import p500 from "./fontes/Poppins-Medium.ttf?url";
import p600 from "./fontes/Poppins-SemiBold.ttf?url";
import p700 from "./fontes/Poppins-Bold.ttf?url";
import m400 from "./fontes/IBMPlexMono-Regular.ttf?url";
import m500 from "./fontes/IBMPlexMono-Medium.ttf?url";
import { EMPRESA } from "../config/empresa";
import { brlDec, num, precoM2 } from "../lib/format";
import { porExtenso } from "../lib/extenso";

Font.register({ family: "Poppins", fonts: [
  { src: p400 }, { src: p400i, fontStyle: "italic" }, { src: p500, fontWeight: 500 }, { src: p600, fontWeight: 600 }, { src: p700, fontWeight: 700 },
] });
Font.register({ family: "Plex", fonts: [{ src: m400 }, { src: m500, fontWeight: 500 }] });
Font.registerHyphenationCallback((palavra) => [palavra]); // sem hifenização automática (pt-BR)

const VERDE = "#2B6E2F", ESCURO = "#1B3A1B", TEXTO = "#1F2A1F", SUB = "#5E6B5C", DOURADO = "#C9A961", LINHA = "#D9DED3";

const s = StyleSheet.create({
  pagina: { fontFamily: "Poppins", fontSize: 10, color: TEXTO, paddingTop: 42, paddingBottom: 70, paddingHorizontal: 48, lineHeight: 1.5 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  razao: { fontSize: 9.5, color: SUB }, creci: { fontSize: 10, fontWeight: 600, color: VERDE },
  logo: { width: 62, height: 55, objectFit: "contain" },
  tituloDoc: { textAlign: "center", fontSize: 15, fontWeight: 500, color: VERDE, letterSpacing: 1, marginBottom: 14 },
  secao: { marginBottom: 11 },
  secaoTitulo: { fontSize: 10, fontWeight: 700, color: ESCURO, marginBottom: 3, textTransform: "uppercase" },
  paragrafo: { textAlign: "justify", marginBottom: 5 },
  destaqueEnd: { color: VERDE, fontWeight: 500 },
  valores: { flexDirection: "row", gap: 10, marginVertical: 8 },
  valorCard: { flex: 1, borderWidth: 1, borderColor: LINHA, borderRadius: 6, padding: 10, backgroundColor: "#FAFBF8" },
  valorCardOferta: { backgroundColor: "#F2F7EE", borderColor: "#BFD5B3" },
  valorRot: { fontSize: 8, color: SUB, textTransform: "uppercase", letterSpacing: 0.5 },
  valorNum: { fontFamily: "Plex", fontWeight: 500, fontSize: 16, color: ESCURO, marginTop: 3, lineHeight: 1.15 },
  valorExt: { fontSize: 7.5, color: SUB, marginTop: 4, lineHeight: 1.3 },
  data: { textAlign: "right", fontStyle: "italic", fontWeight: 600, marginTop: 10 },
  assinatura: { alignItems: "center", marginTop: 18 },
  assinaturaImg: { width: 150, height: 60, objectFit: "contain", marginBottom: -6 },
  assinaturaLinha: { width: 190, borderTopWidth: 0.8, borderTopColor: TEXTO, marginBottom: 3 },
  assinaturaNome: { fontWeight: 600, fontSize: 10 }, assinaturaDado: { fontSize: 9 },
  rodape: { position: "absolute", bottom: 22, left: 48, right: 48, textAlign: "center", fontSize: 7.5, color: SUB },
  rodapeNota: { fontStyle: "italic", fontSize: 7.5, color: "#556B2F", marginBottom: 4, textAlign: "center" },
  pag: { position: "absolute", bottom: 10, right: 48, fontSize: 7.5, color: SUB },
  tabela: { borderWidth: 1, borderColor: LINHA, borderRadius: 4, marginVertical: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINHA },
  th: { fontSize: 8, fontWeight: 600, color: ESCURO, padding: 5, backgroundColor: "#EEF3EA" },
  td: { fontSize: 8.5, padding: 5 },
  tdNum: { fontFamily: "Plex", fontSize: 8.5, padding: 5, textAlign: "right" },
  subtitulo: { fontSize: 9.5, fontWeight: 600, color: VERDE, marginTop: 4, marginBottom: 2 },
  nota: { fontSize: 7.5, color: SUB, fontStyle: "italic" },
  // capa (modelo completo)
  capaTitulo: { fontSize: 46, color: "#34495E", letterSpacing: 3, marginTop: 70, lineHeight: 1.25 },
  capaSub: { fontSize: 24, color: VERDE, letterSpacing: 4, marginTop: 4, marginBottom: 26 },
  capaRot: { fontSize: 9.5, fontWeight: 700, color: "#3F5E3F", textTransform: "uppercase", marginTop: 9 },
  capaVal: { fontSize: 10.5, color: TEXTO },
});

const COLS = [["#", 0.35], ["LOCALIZAÇÃO / ANUNCIANTE", 3.2], ["PREÇO (R$)", 1.35], ["ÁREA PRIV.", 0.95], ["VALOR M² (R$)", 1.2], ["VAGAS", 0.65]];

function Fundo() {
  return (
    <Svg fixed style={{ position: "absolute", top: 0, left: 0, width: 595.28, height: 841.89 }}>
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#DCE8D0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="595.28" height="841.89" fill="url(#g)" />
    </Svg>
  );
}

function Topo({ logo, invertido }) {
  const empresa = (
    <View style={{ alignItems: invertido ? "flex-end" : "flex-start" }}>
      <Text style={s.razao}>{EMPRESA.razaoCompleta}</Text>
      <Text style={s.creci}>{EMPRESA.creciPj}</Text>
    </View>
  );
  return (
    <View style={s.topo} fixed>
      {invertido ? <Image src={logo} style={s.logo} /> : empresa}
      {invertido ? empresa : <Image src={logo} style={s.logo} />}
    </View>
  );
}

function Rodape({ corretor, nota }) {
  const contato = [EMPRESA.rodapeLaudo, corretor?.phone ? `WhatsApp ${corretor.phone}` : null, corretor?.email].filter(Boolean).join(" · ");
  return (
    <View style={s.rodape} fixed>
      {nota && <Text style={s.rodapeNota}>Nota técnica: {EMPRESA.notaTecnica}</Text>}
      <Text>{contato}</Text>
    </View>
  );
}

const Paragrafos = ({ texto }) => (texto || "").split(/\n\s*\n/).filter((p) => p.trim())
  .map((p, i) => <Text key={i} style={s.paragrafo}>{p.trim()}</Text>);

function Secao({ titulo, texto, children, destaque }) {
  if (!texto && !children) return null;
  return (
    <View style={s.secao} wrap={false}>
      <Text style={s.secaoTitulo}>{titulo}:</Text>
      {destaque ? <Text style={[s.paragrafo, s.destaqueEnd]}>{texto}</Text> : texto ? <Paragrafos texto={texto} /> : null}
      {children}
    </View>
  );
}
// seção longa pode quebrar página (só o título fica preso ao primeiro parágrafo)
function SecaoLonga({ titulo, texto }) {
  if (!texto) return null;
  const partes = texto.split(/\n\s*\n/).filter((p) => p.trim());
  return (
    <View style={s.secao}>
      <View wrap={false}><Text style={s.secaoTitulo}>{titulo}:</Text><Text style={s.paragrafo}>{partes[0]}</Text></View>
      {partes.slice(1).map((p, i) => <Text key={i} style={s.paragrafo}>{p}</Text>)}
    </View>
  );
}

function CardsValor({ av }) {
  const area = Number(av.property_area) || null;
  const cards = [
    av.market_value && ["Valor de mercado", av.market_value, false],
    av.suggested_value && [av.evaluation_type === "aluguel" ? "Aluguel de oferta" : "Valor estratégico de oferta", av.suggested_value, true],
  ].filter(Boolean);
  if (!cards.length) return null;
  return (
    <View style={s.valores} wrap={false}>
      {cards.map(([rot, v, oferta]) => (
        <View key={rot} style={[s.valorCard, oferta && s.valorCardOferta]}>
          <Text style={s.valorRot}>{rot}</Text>
          <Text style={s.valorNum}>{brlDec(v)}{av.evaluation_type === "aluguel" ? "/mês" : ""}</Text>
          <Text style={s.valorExt}>{porExtenso(v)}{area ? ` · R$ ${num(Math.round(v / area))}/m²` : ""}</Text>
        </View>
      ))}
    </View>
  );
}

function Assinatura({ corretor, assinatura }) {
  if (!corretor?.name) return null;
  return (
    <View style={s.assinatura} wrap={false}>
      {assinatura ? <Image src={assinatura} style={s.assinaturaImg} /> : <View style={{ height: 36 }} />}
      <View style={s.assinaturaLinha} />
      <Text style={s.assinaturaNome}>{corretor.name}</Text>
      {corretor.creci_number && <Text style={s.assinaturaDado}>CRECI/DF nº {corretor.creci_number}</Text>}
      {corretor.cnai_number && <Text style={s.assinaturaDado}>CNAI nº {corretor.cnai_number}</Text>}
    </View>
  );
}

function TabelaAmostras({ comps, tipo }) {
  const linhas = comps.filter((c) => c.price > 0);
  if (!linhas.length) return null;
  return (
    <View style={s.tabela}>
      <View style={s.tr} fixed>
        {COLS.map(([t, f]) => <Text key={t} style={[s.th, { flex: f, textAlign: t === "#" || t.startsWith("LOCAL") ? "left" : "right" }]}>{t}</Text>)}
      </View>
      {linhas.map((c, i) => (
        <View key={c.id || i} style={[s.tr, i === linhas.length - 1 && { borderBottomWidth: 0 }]} wrap={false}>
          <Text style={[s.td, { flex: COLS[0][1] }]}>{i + 1}</Text>
          <Text style={[s.td, { flex: COLS[1][1] }]}>{c.address || "—"}{c.advertiser ? ` (${c.advertiser})` : c.source_name ? ` (${c.source_name})` : ""}</Text>
          <Text style={[s.tdNum, { flex: COLS[2][1] }]}>{brlDec(c.price).replace("R$", "").trim()}</Text>
          <Text style={[s.tdNum, { flex: COLS[3][1] }]}>{c.area ? `${num(c.area)} m²` : "—"}</Text>
          <Text style={[s.tdNum, { flex: COLS[4][1] }]}>{c.area ? num(Math.round(precoM2(c.price, c.area))) : "—"}</Text>
          <Text style={[s.tdNum, { flex: COLS[5][1] }]}>{c.parking ?? "—"}</Text>
        </View>
      ))}
      {tipo === "aluguel" && <Text style={[s.nota, { padding: 5 }]}>Valores de aluguel mensal.</Text>}
    </View>
  );
}

function Referencias({ av }) {
  const e = av.portal_study, t = av.tax_sheet;
  const itens = [];
  if (e?.preco_m2_medio) itens.push(["Preço médio do m² no segmento", `R$ ${num(Math.round(e.preco_m2_medio))}/m²`]);
  if (e?.tempo_venda_meses) itens.push(["Tempo médio até a venda", `${num(e.tempo_venda_meses)} meses`]);
  if (e?.leads_por_oferta) itens.push(["Contatos por anúncio (12 meses)", num(e.leads_por_oferta)]);
  if (e?.valorizacao_ano != null) itens.push(["Valorização do m² em 12 meses", `${num(e.valorizacao_ano)}%`]);
  if (t?.valor_venal) itens.push([`Valor venal fiscal ${t.ano} (Receita do DF)`, brlDec(t.valor_venal)]);
  if (t?.iptu_anual != null) itens.push([`IPTU + TLP ${t.ano}`, brlDec((t.iptu_anual || 0) + (t.tlp_anual || 0))]);
  if (!itens.length) return null;
  const fontes = [e && (e.fonte ? `${e.fonte}${e.referencia ? `, ${e.referencia}` : ""}${e.segmento ? ` — ${e.segmento}` : ""}` : null), t && "Receita do DF — Pauta IPTU/TLP"].filter(Boolean);
  return (
    <View style={s.secao} wrap={false}>
      <Text style={s.subtitulo}>Indicadores de referência</Text>
      <View style={s.tabela}>
        {itens.map(([r, v], i) => (
          <View key={r} style={[s.tr, i === itens.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={[s.td, { flex: 3 }]}>{r}</Text><Text style={[s.tdNum, { flex: 1.4 }]}>{v}</Text>
          </View>
        ))}
      </View>
      <Text style={s.nota}>Fontes: {fontes.join("; ")}. Indicadores de média; o valor deste laudo vem da análise das amostras comparáveis.</Text>
    </View>
  );
}

const Data = ({ data }) => <Text style={s.data}>{EMPRESA.cidadeLaudo.replace("/DF", "")}, {data}.</Text>;

// ------------------------------------------------------------ modelo 1: cliente da carteira
function LaudoCliente(p) {
  const { av, textos, endereco, logo, corretor, assinatura, data } = p;
  return (
    <Page size="A4" style={s.pagina}>
      <Topo logo={logo} />
      <Text style={s.tituloDoc}>LAUDO AVALIATIVO</Text>
      <Secao titulo="Imóvel avaliado" texto={endereco} destaque />
      <Secao titulo="Descrição do imóvel" texto={textos.descricao} />
      <Secao titulo="Ocupação" texto={textos.ocupacao} />
      <SecaoLonga titulo="Parâmetros de avaliação" texto={textos.parametros} />
      <CardsValor av={av} />
      <Secao titulo="Valor de mercado" texto={textos.valor_mercado} />
      <Secao titulo="Valor estratégico de oferta" texto={textos.valor_oferta} />
      <SecaoLonga titulo="Observações" texto={textos.observacoes} />
      <Data data={data} />
      <Assinatura corretor={corretor} assinatura={assinatura} />
      <Rodape corretor={corretor} nota />
      <Text style={s.pag} fixed render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber}/${totalPages}` : "")} />
    </Page>
  );
}

// ------------------------------------------------------------ modelo 2: avaliação completa
function LaudoCompleto(p) {
  const { av, comps, textos, endereco, logo, corretor, assinatura, data } = p;
  const aluguel = av.evaluation_type === "aluguel";
  return (
    <>
      <Page size="A4" style={s.pagina}>
        <Fundo />
        <Topo logo={logo} invertido />
        <Text style={s.capaTitulo}>Avaliação</Text>
        <Text style={s.capaSub}>DE IMÓVEL URBANO</Text>
        <Text style={s.capaRot}>Objeto da avaliação</Text>
        <Text style={[s.capaVal, { color: VERDE }]}>{endereco}</Text>
        {av.interested_party && <><Text style={s.capaRot}>Interessado</Text><Text style={s.capaVal}>{av.interested_party}</Text></>}
        <Text style={s.capaRot}>Finalidade</Text>
        <Text style={s.capaVal}>{av.purpose || (aluguel ? "Apurar o valor de mercado para locação do imóvel" : "Apurar o valor de mercado para venda do imóvel")}</Text>
        <Text style={s.capaRot}>Apresentação</Text>
        <Paragrafos texto={textos.apresentacao} />
        {corretor?.name && (
          <Text style={[s.paragrafo, { fontStyle: "italic" }]}>
            Este trabalho foi elaborado pelo corretor e avaliador de imóveis {corretor.name}, da Acontece Imobiliária, com base em dados obtidos no mercado e em nossa interpretação destes dados.
          </Text>
        )}
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 9.5 }}><Text style={{ fontWeight: 700, color: VERDE }}>ACONTECE</Text> ASSESSORIA E PLANEJAMENTO IMOBILIÁRIO LTDA</Text>
          <Text style={{ fontSize: 9 }}>CNPJ {EMPRESA.cnpj}   <Text style={{ fontWeight: 700, color: VERDE }}>{EMPRESA.creciPj}</Text></Text>
          {EMPRESA.unidades.map(([u, e]) => <Text key={u} style={{ fontSize: 8.5, marginTop: 3 }}><Text style={{ fontWeight: 700, color: "#3F5E3F" }}>{u}</Text> — {e}</Text>)}
        </View>
        <Assinatura corretor={corretor} assinatura={assinatura} />
        <Rodape corretor={corretor} />
      </Page>
      <Page size="A4" style={s.pagina}>
        <Fundo />
        <Topo logo={logo} invertido />
        <Secao titulo="Imóvel avaliado" texto={endereco} destaque />
        <Secao titulo="Descrição do imóvel" texto={textos.descricao} />
        <Secao titulo="Ocupação" texto={textos.ocupacao} />
        <SecaoLonga titulo="Parâmetros de avaliação" texto={textos.parametros} />
        {comps.some((c) => c.price > 0) && (
          <View style={s.secao}>
            <Text style={s.subtitulo}>Tabela de amostras comparativas (mercado ativo)</Text>
            <TabelaAmostras comps={comps} tipo={av.evaluation_type} />
          </View>
        )}
        <Referencias av={av} />
        <View break={false}>
          <CardsValor av={av} />
        </View>
        <Secao titulo="Valor de mercado" texto={textos.valor_mercado} />
        <Secao titulo="Valor estratégico de oferta" texto={textos.valor_oferta} />
        <SecaoLonga titulo="Observações" texto={textos.observacoes} />
        {textos.comercial && <Paragrafos texto={textos.comercial} />}
        <Data data={data} />
        <Assinatura corretor={corretor} assinatura={assinatura} />
        <Rodape corretor={corretor} />
        <Text style={s.pag} fixed render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
      </Page>
    </>
  );
}

export default function LaudoDocumento(props) {
  const titulo = `${props.av.report_type === "cliente" ? "Laudo avaliativo" : "Avaliação de imóvel urbano"} — ${props.endereco}`;
  return (
    <Document title={titulo} author={props.corretor?.name || EMPRESA.nome} creator="Avaliador de Imóveis · Acontece" language="pt-BR">
      {props.av.report_type === "cliente" ? <LaudoCliente {...props} /> : <LaudoCompleto {...props} />}
    </Document>
  );
}
