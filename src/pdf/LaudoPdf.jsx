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
import { homogeneizacaoDoLaudo } from "../lib/textosLaudo";
import { ROMANO } from "../lib/homogeneizacao";

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

const f3 = (v) => (v == null ? "—" : v.toFixed(3).replace(".", ","));
const COLS_H = [["#", 0.35], ["R$/m² (anúncio)", 1.25], ["Oferta", 0.8], ["Área", 0.8], ["Vagas/qtos", 0.95], ["Qualitativos", 1], ["Conjunto", 0.9], ["R$/m² homog.", 1.25], ["Situação", 1.4]];
function TabelaHomogeneizacao({ av, comps }) {
  const r = homogeneizacaoDoLaudo(av, comps);
  if (!r) return null;
  const e = r.estatistica, m = r.modelo;
  const origemArea = m?.expoenteArea != null ? `calculado a partir das próprias amostras (expoente ${m.expoenteArea.toFixed(3).replace(".", ",")})`
    : r.config.metodoArea === "nenhum" ? "sem ajuste de área" : "fórmula de Abunahman (expoente 1/4 até 30% de diferença, 1/8 de 30% a 150%)";
  return (
    <View style={s.secao}>
      <View wrap={false}>
        <Text style={s.subtitulo}>Homogeneização por fatores (ABNT NBR 14653-2)</Text>
        <Text style={[s.nota, { marginBottom: 4 }]}>
          Fator oferta {Number(r.config.fatorOferta).toFixed(2).replace(".", ",")} para anúncios; fator área {origemArea}
          {m?.porVaga != null ? `; vagas ${(m.porVaga * 100).toFixed(1).replace(".", ",")}% por vaga, calculado a partir das amostras` : ""}
          {m?.porQuarto != null ? `; quartos ${(m.porQuarto * 100).toFixed(1).replace(".", ",")}% por quarto` : ""}; localização, padrão e conservação por análise do avaliador. Saneamento: ±30% da média.
        </Text>
      </View>
      <View style={s.tabela}>
        <View style={s.tr} fixed>
          {COLS_H.map(([t, fl]) => <Text key={t} style={[s.th, { flex: fl, textAlign: t === "#" || t === "Situação" ? "left" : "right", fontSize: 7.2 }]}>{t}</Text>)}
        </View>
        {r.linhas.map((l, i) => {
          const q = l.fatores.localizacao * l.fatores.padrao * l.fatores.conservacao;
          const cel = (v, fl, al = "right") => <Text style={[al === "right" ? s.tdNum : s.td, { flex: fl, fontSize: 7.4, padding: 4, textAlign: al }]}>{v}</Text>;
          return (
            <View key={l.id} style={[s.tr, i === r.linhas.length - 1 && { borderBottomWidth: 0 }, l.status !== "usada" && { opacity: 0.55 }]} wrap={false}>
              {cel(i + 1, COLS_H[0][1], "left")}{cel(num(Math.round(l.vu)), COLS_H[1][1])}{cel(f3(l.fatores.oferta), COLS_H[2][1])}
              {cel(f3(l.fatores.area), COLS_H[3][1])}{cel(f3(l.fatores.vagas * l.fatores.quartos), COLS_H[4][1])}{cel(f3(q), COLS_H[5][1])}
              {cel(f3(l.conjunto), COLS_H[6][1])}{cel(l.vh ? num(Math.round(l.vh)) : "—", COLS_H[7][1])}
              {cel(l.status === "usada" ? "usada" : l.status.replace("saneamento: ", "descartada: "), COLS_H[8][1], "left")}
            </View>
          );
        })}
      </View>
      <View style={s.tabela} wrap={false}>
        {[
          ["Amostras usadas após o saneamento", `${e.n} de ${r.linhas.length}`],
          ["Valor unitário médio homogeneizado", `R$ ${num(Math.round(e.valorUnitario))}/m²`],
          ["Coeficiente de variação", `${(e.cv * 100).toFixed(1).replace(".", ",")}%`],
          ["Intervalo de confiança de 80% (t de Student)", `R$ ${num(Math.round(e.ic[0]))} a R$ ${num(Math.round(e.ic[1]))}/m²`],
          ["Valor estimado (média × área)", brlDec(e.valorTotal)],
          ["Campo de arbítrio (±15%)", `${brlDec(e.arbitrio[0])} a ${brlDec(e.arbitrio[1])}`],
          ["Grau de precisão · grau de fundamentação", `${ROMANO[e.grauPrecisao]} · ${ROMANO[e.grauFundamentacao]}`],
        ].map(([rot, v], i, arr) => (
          <View key={rot} style={[s.tr, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={[s.td, { flex: 3 }]}>{rot}</Text><Text style={[s.tdNum, { flex: 2 }]}>{v}</Text>
          </View>
        ))}
      </View>
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
      <Secao titulo="Situação documental" texto={textos.documentacao} />
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
          {EMPRESA.unidades.map((u) => <Text key={u.regiao} style={{ fontSize: 8.5, marginTop: 3 }}><Text style={{ fontWeight: 700, color: "#3F5E3F" }}>{u.tipo === "Matriz" ? "SEDE" : "FILIAL"} {u.regiao.toUpperCase()}</Text> — {u.endereco}, {u.edificio}, Brasília – DF</Text>)}
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
        <Secao titulo="Situação documental" texto={textos.documentacao} />
      <Secao titulo="Situação documental" texto={textos.documentacao} />
        <SecaoLonga titulo="Parâmetros de avaliação" texto={textos.parametros} />
        {comps.some((c) => c.price > 0) && (
          <View style={s.secao}>
            <Text style={s.subtitulo}>Tabela de amostras comparativas (mercado ativo)</Text>
            <TabelaAmostras comps={comps} tipo={av.evaluation_type} />
          </View>
        )}
        <TabelaHomogeneizacao av={av} comps={comps} />
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

// ------------------------------------------------------------ modelo 3: PTAM (COFECI)
const sp = StyleSheet.create({
  num: { fontSize: 11, fontWeight: 700, color: VERDE, marginTop: 10, marginBottom: 4 },
  sub: { fontSize: 9.5, fontWeight: 600, color: ESCURO, marginTop: 6, marginBottom: 2 },
  capaTitulo: { fontSize: 26, color: "#34495E", lineHeight: 1.25, marginTop: 60, letterSpacing: 1 },
  capaSub: { fontSize: 12, color: VERDE, letterSpacing: 3, marginTop: 6, marginBottom: 30 },
  rascunho: { position: "absolute", top: 330, left: 40, fontSize: 92, fontWeight: 700, color: "#B03A2E", opacity: 0.1, transform: "rotate(-32deg)" },
  fotos: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  foto: { width: "48.5%", marginBottom: 10 },
  fotoImg: { width: "100%", height: 170, objectFit: "cover", borderRadius: 3 },
  fotoLeg: { fontSize: 8, color: SUB, marginTop: 3 },
  linhaDam: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: "#999", paddingVertical: 5 },
  rotDam: { width: 150, fontSize: 9, color: SUB }, valDam: { flex: 1, fontSize: 9.5 },
});

const Rascunho = ({ ativo }) => (ativo ? <Text style={sp.rascunho} fixed>RASCUNHO</Text> : null);
const Num = ({ n, children }) => <Text style={sp.num} minPresenceAhead={40}>{n}. {children}</Text>;

function TabelaAreas({ av }) {
  const im = av.registry_sheet?.imovel || {};
  const linhas = [
    ["Área privativa", im.area_privativa ?? av.property_area, im.area_privativa != null ? "matrícula" : "informada"],
    ["Área comum", im.area_comum, "matrícula"], ["Área total", im.area_total ?? av.area_total, im.area_total != null ? "matrícula" : "ficha"],
  ].filter(([, v]) => v != null);
  if (!linhas.length && !im.fracao_ideal) return null;
  return (
    <View style={s.tabela} wrap={false}>
      {linhas.map(([r, v, f], i) => (
        <View key={r} style={[s.tr, i === linhas.length - 1 && !im.fracao_ideal && { borderBottomWidth: 0 }]}>
          <Text style={[s.td, { flex: 2 }]}>{r}</Text><Text style={[s.tdNum, { flex: 1 }]}>{num(v)} m²</Text><Text style={[s.td, { flex: 1, color: SUB }]}>{f}</Text>
        </View>
      ))}
      {im.fracao_ideal && <View style={[s.tr, { borderBottomWidth: 0 }]}><Text style={[s.td, { flex: 2 }]}>Fração ideal</Text><Text style={[s.tdNum, { flex: 1 }]}>{im.fracao_ideal}</Text><Text style={[s.td, { flex: 1, color: SUB }]}>matrícula</Text></View>}
    </View>
  );
}

function LaudoPtam(p) {
  const { av, comps, textos, endereco, logo, corretor, assinatura, data, extra } = p;
  const v = av.inspection || {};
  const est = extra.homog?.estatistica;
  const rasc = extra.faltando.length > 0;
  const fontes = comps.filter((c) => c.price > 0).map((c, i) => [i + 1, [c.source_name, c.advertiser].filter(Boolean).join(" · "), c.source_url]).filter(([, f, u]) => f || u);
  const legenda = (av.inspection?.ambientes || []).length;
  return (
    <>
      <Page size="A4" style={s.pagina}>
        <Fundo /><Rascunho ativo={rasc} />
        <Topo logo={logo} invertido />
        <Text style={sp.capaTitulo}>Parecer Técnico de{"\n"}Avaliação Mercadológica</Text>
        <Text style={sp.capaSub}>PTAM{extra.seloNumero ? ` · SELO Nº ${extra.seloNumero}` : ""}</Text>
        <Text style={s.capaRot}>Imóvel avaliado</Text><Text style={[s.capaVal, { color: VERDE }]}>{endereco}</Text>
        <Text style={s.capaRot}>Solicitante</Text><Text style={s.capaVal}>{av.interested_party || "—"}</Text>
        <Text style={s.capaRot}>Finalidade</Text><Text style={s.capaVal}>{av.purpose || (av.evaluation_type === "aluguel" ? "Apurar o valor de mercado para locação" : "Apurar o valor de mercado para venda")}</Text>
        <Text style={s.capaRot}>Data de referência</Text><Text style={s.capaVal}>{extra.dataRef}</Text>
        <Text style={s.capaRot}>Corretor de imóveis avaliador</Text>
        <Text style={s.capaVal}>{corretor?.name || "—"}{corretor?.creci_number ? ` · CRECI/DF ${corretor.creci_number}` : ""}{corretor?.cnai_number ? ` · CNAI ${corretor.cnai_number}` : ""}</Text>
        <View style={{ marginTop: 26 }}>
          <Text style={{ fontSize: 9 }}>Elaborado sob o patrocínio de <Text style={{ fontWeight: 700, color: VERDE }}>{EMPRESA.razaoCompleta}</Text> · CNPJ {EMPRESA.cnpj} · {EMPRESA.creciPj}</Text>
        </View>
        {rasc && <Text style={[s.nota, { marginTop: 24, color: "#B03A2E" }]}>Rascunho: faltam {extra.faltando.join("; ")}.</Text>}
        <Rodape corretor={corretor} />
      </Page>

      <Page size="A4" style={s.pagina}>
        <Fundo /><Rascunho ativo={rasc} />
        <Topo logo={logo} invertido />
        <Num n={1}>SOLICITANTE</Num><Text style={s.paragrafo}>{av.interested_party || "—"}</Text>
        <Num n={2}>FINALIDADE E OBJETIVO</Num>
        <Text style={s.paragrafo}>{av.purpose || (av.evaluation_type === "aluguel" ? "Apurar o valor de mercado para locação do imóvel." : "Apurar o valor de mercado para venda do imóvel.")} O objetivo deste parecer é a determinação do valor de mercado na data de referência ({extra.dataRef}).</Text>
        <Num n={3}>IDENTIFICAÇÃO E CARACTERIZAÇÃO DO IMÓVEL</Num>
        <Text style={sp.sub}>3.1 Localização</Text><Text style={[s.paragrafo, s.destaqueEnd]}>{endereco}</Text>
        <Text style={sp.sub}>3.2 Descrição</Text><Paragrafos texto={textos.descricao} />
        {textos.documentacao && <><Text style={sp.sub}>3.3 Documentação</Text><Paragrafos texto={textos.documentacao} /></>}
        <Text style={sp.sub}>3.4 Áreas</Text><TabelaAreas av={av} />
        <Text style={sp.sub}>3.5 Vistoria</Text>
        <Text style={s.paragrafo}>
          {v.data ? `Vistoria realizada em ${extra.dataVistoria}` : "Data da vistoria não informada"}{v.acompanhante ? `, acompanhada por ${v.acompanhante}` : ""}.
          {v.conservacao ? ` Estado de conservação: ${v.conservacao.toLowerCase()}.` : ""}{v.padrao ? ` Padrão de acabamento: ${v.padrao.toLowerCase()}.` : ""}
          {legenda ? " Relatório fotográfico no Anexo I." : ""}
        </Text>
        {v.observacoes && <Paragrafos texto={v.observacoes} />}
        {textos.ocupacao && <><Text style={sp.sub}>3.6 Ocupação</Text><Paragrafos texto={textos.ocupacao} /></>}

        <Num n={4}>DIAGNÓSTICO DE MERCADO</Num><Paragrafos texto={textos.parametros} />
        <Referencias av={av} />
        <Num n={5}>METODOLOGIA</Num><Text style={s.paragrafo}>{extra.metodologia}</Text>
        <Num n={6}>PESQUISA DE MERCADO</Num>
        <TabelaAmostras comps={comps} tipo={av.evaluation_type} />
        {fontes.length > 0 && (
          <View style={{ marginBottom: 6 }}>
            <Text style={sp.sub}>Fontes das amostras</Text>
            {fontes.map(([n, f, u]) => <Text key={n} style={[s.nota, { fontStyle: "normal" }]}>{n}. {f}{u ? ` — ${u}` : ""}</Text>)}
          </View>
        )}
        <Num n={7}>TRATAMENTO DAS AMOSTRAS (HOMOGENEIZAÇÃO)</Num>
        <TabelaHomogeneizacao av={{ ...av, homogenization: { ...(av.homogenization || {}), usarNoLaudo: true } }} comps={comps} />
        <Num n={8}>CONCLUSÃO</Num>
        <Text style={s.paragrafo}>{extra.conclusao}</Text>
        <CardsValor av={av} />
        <Num n={9}>CONSIDERAÇÕES E RESSALVAS</Num>
        {textos.observacoes && <Paragrafos texto={textos.observacoes} />}
        {extra.ressalvas.map((r, i) => <Text key={i} style={[s.paragrafo, { fontSize: 9 }]}>• {r}</Text>)}

        <View wrap={false}>
          <Num n={10}>IDENTIFICAÇÃO DO AVALIADOR</Num>
          <Text style={s.paragrafo}>{corretor?.name || "—"} — Corretor de Imóveis, CRECI/DF nº {corretor?.creci_number || "—"}, inscrito no Cadastro Nacional de Avaliadores Imobiliários (CNAI) sob o nº {corretor?.cnai_number || "—"}.</Text>
          {corretor?.bio && <Text style={[s.paragrafo, { fontSize: 9 }]}>{corretor.bio}</Text>}
          <Text style={s.data}>{EMPRESA.cidadeLaudo.replace("/DF", "")}, {extra.dataRef}.</Text>
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: 30, marginTop: 10 }}>
            <Assinatura corretor={corretor} assinatura={assinatura} />
            {extra.selo && (
              <View style={{ alignItems: "center" }}>
                <Image src={extra.selo} style={{ width: 110, height: 110, objectFit: "contain" }} />
                <Text style={{ fontSize: 7.5, color: SUB }}>Selo Certificador{extra.seloNumero ? ` nº ${extra.seloNumero}` : ""}</Text>
              </View>
            )}
          </View>
        </View>
        <Rodape corretor={corretor} />
        <Text style={s.pag} fixed render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
      </Page>

      {extra.fotos.length > 0 && (
        <Page size="A4" style={s.pagina}>
          <Fundo /><Rascunho ativo={rasc} />
          <Topo logo={logo} invertido />
          <Text style={sp.num}>ANEXO I — RELATÓRIO FOTOGRÁFICO</Text>
          <Text style={[s.nota, { marginBottom: 8 }]}>Vistoria realizada em {extra.dataVistoria || "—"} · {endereco}</Text>
          <View style={sp.fotos}>
            {extra.fotos.map((f, i) => (
              <View key={i} style={sp.foto} wrap={false}>
                <Image src={f.src} style={sp.fotoImg} />
                <Text style={sp.fotoLeg}>Foto {i + 1} — {f.ambiente}{f.legenda ? `: ${f.legenda}` : ""}</Text>
              </View>
            ))}
          </View>
          <Rodape corretor={corretor} />
          <Text style={s.pag} fixed render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </Page>
      )}

      {extra.croqui && (
        <Page size="A4" style={s.pagina}>
          <Fundo /><Rascunho ativo={rasc} />
          <Topo logo={logo} invertido />
          <Text style={sp.num}>ANEXO II — CROQUI DE LOCALIZAÇÃO</Text>
          <Image src={extra.croqui.dataUrl} style={{ width: "100%", height: 330, objectFit: "contain", marginTop: 6, borderWidth: 1, borderColor: LINHA }} />
          <Text style={[s.nota, { marginTop: 6 }]}>Pino dourado com estrela = imóvel avaliado · pinos verdes numerados = amostras da pesquisa de mercado (item 6).{extra.croqui.comMapa ? " Base cartográfica © colaboradores do OpenStreetMap." : ""}</Text>
          <View style={{ marginTop: 8 }}>
            <Text style={[s.td, { padding: 0, marginBottom: 2 }]}>Imóvel avaliado: {endereco}</Text>
            {comps.filter((c) => c.price > 0).map((c, i) => (c.latitude != null ? <Text key={i} style={[s.nota, { fontStyle: "normal" }]}>{i + 1}. {c.address || "—"}</Text> : null))}
          </View>
          <Rodape corretor={corretor} />
          <Text style={s.pag} fixed render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </Page>
      )}

      {extra.incluirDam && (
        <Page size="A4" style={s.pagina}>
          <Rascunho ativo={rasc} />
          <Text style={{ textAlign: "center", fontSize: 11, fontWeight: 700 }}>C O F E C I</Text>
          <Text style={{ textAlign: "center", fontSize: 10, marginBottom: 14 }}>CRECI 8ª Região / DF</Text>
          <Text style={[sp.num, { textAlign: "center", fontSize: 13 }]}>DECLARAÇÃO DE AVALIAÇÃO MERCADOLÓGICA</Text>
          <Text style={[s.nota, { textAlign: "center", marginBottom: 14 }]}>Anexo III deste PTAM</Text>
          {[["Nome do Corretor de Imóveis", corretor?.name], ["CPF nº", ""], ["RG nº", ""], ["CRECI nº", corretor?.creci_number], ["CNAI nº", corretor?.cnai_number], ["Endereço", ""]].map(([r, val]) => (
            <View key={r} style={sp.linhaDam}><Text style={sp.rotDam}>{r}:</Text><Text style={sp.valDam}>{val || " "}</Text></View>
          ))}
          <Text style={[s.paragrafo, { marginTop: 14 }]}>Declara a emissão de PARECER TÉCNICO DE AVALIAÇÃO MERCADOLÓGICA relativo ao imóvel com as seguintes características:</Text>
          {[["Imóvel", endereco], ["Tipo", av.property_type], ["Área privativa", av.registry_sheet?.imovel?.area_privativa ?? av.property_area ? `${num(av.registry_sheet?.imovel?.area_privativa ?? av.property_area)} m²` : ""],
            ["Matrícula / cartório", [av.registry_sheet?.matricula || av.registry_number, av.registry_sheet?.cartorio].filter(Boolean).join(" — ")],
            ["Por solicitação de", av.interested_party], ["Finalidade", av.purpose || (av.evaluation_type === "aluguel" ? "Valor de mercado para locação" : "Valor de mercado para venda")],
            ["Valor de avaliação", av.market_value ? `${brlDec(av.market_value)} (${porExtenso(av.market_value)})` : ""], ["Data", extra.dataRef],
            ["Selo Certificador nº", extra.seloNumero]].map(([r, val]) => (
            <View key={r} style={sp.linhaDam}><Text style={sp.rotDam}>{r}:</Text><Text style={sp.valDam}>{val || " "}</Text></View>
          ))}
          <Text style={[s.data, { marginTop: 24 }]}>{EMPRESA.cidadeLaudo.replace("/DF", "")}, {extra.dataRef}.</Text>
          <View style={{ alignItems: "center", marginTop: 40 }}><View style={s.assinaturaLinha} /><Text style={s.assinaturaNome}>{corretor?.name || ""}</Text><Text style={s.assinaturaDado}>Corretor de Imóveis Avaliador</Text></View>
        </Page>
      )}

      {extra.anexos.length > 0 && (
        <Page size="A4" style={s.pagina}>
          <Fundo /><Topo logo={logo} invertido />
          <Text style={sp.num}>ANEXO {extra.incluirDam ? "IV" : "III"} — DOCUMENTOS</Text>
          {extra.anexos.map((n, i) => <Text key={i} style={s.paragrafo}>• {n}</Text>)}
          <Text style={s.nota}>Documentos reproduzidos nas páginas seguintes.</Text>
        </Page>
      )}
    </>
  );
}

export default function LaudoDocumento(props) {
  const titulo = `${props.av.report_type === "cliente" ? "Laudo avaliativo" : props.av.report_type === "ptam" ? "Parecer Técnico de Avaliação Mercadológica" : "Avaliação de imóvel urbano"} — ${props.endereco}`;
  return (
    <Document title={titulo} author={props.corretor?.name || EMPRESA.nome} creator="Avaliador de Imóveis · Acontece" language="pt-BR">
      {props.av.report_type === "cliente" ? <LaudoCliente {...props} /> : props.av.report_type === "ptam" && props.extra ? <LaudoPtam {...props} /> : <LaudoCompleto {...props} />}
    </Document>
  );
}
