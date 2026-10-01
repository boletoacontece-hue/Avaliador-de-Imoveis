// Gera o PDF do laudo no navegador e baixa o arquivo.
// Tudo é carregado sob demanda: o gerador de PDF (~1 MB) só vem quando alguém clica em "Baixar PDF".
import React from "react";
import { supabase } from "../lib/supabase";

const nomeArquivo = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, " ").trim();

// dados exclusivos do PTAM: homogeneização obrigatória, checklist, fotos, selo, croqui, textos
async function extrasPtam(av, comps, corretor, temAssinatura, anexos) {
  const [{ checklistPtam, homogeneizacaoPtam, fotosDaVistoria, METODOLOGIA_PTAM, ressalvasPtam, conclusaoPtam, dataPorExtenso, dataCurtaBr }, { comoDataUrl }, { gerarCroqui }] =
    await Promise.all([import("../lib/ptam"), import("../lib/privado"), import("./croqui")]);
  const homog = homogeneizacaoPtam(av, comps);
  const faltando = checklistPtam(av, comps, { perfil: corretor || {}, temAssinatura }).filter((i) => i.obrigatorio && !i.ok).map((i) => i.rotulo.replace(/\s*\(.*\)$/, "").toLowerCase());
  const lista = fotosDaVistoria(av);
  const fotos = (await Promise.all(lista.map(async (f) => ({ ...f, src: await comoDataUrl(f.path) })))).filter((f) => f.src);
  const selo = av.ptam?.selo_path ? await comoDataUrl(av.ptam.selo_path) : null;
  const pontos = comps.filter((c) => c.price > 0).map((c, i) => ({ lat: c.latitude, lng: c.longitude, n: i + 1 }));
  const croqui = await gerarCroqui(av.property_latitude != null ? { lat: Number(av.property_latitude), lng: Number(av.property_longitude) } : null,
    pontos.filter((p) => p.lat != null).map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) })));
  const dataRef = dataPorExtenso(av.ptam?.data_referencia);
  return {
    homog, faltando, fotos, selo, croqui, dataRef,
    dataVistoria: dataCurtaBr(av.inspection?.data),
    seloNumero: av.ptam?.selo_numero || "",
    incluirDam: av.ptam?.incluir_dam !== false,
    metodologia: METODOLOGIA_PTAM, ressalvas: ressalvasPtam(av),
    conclusao: conclusaoPtam(av, homog.estatistica, dataRef),
    anexos: (anexos || []).map((a) => a.name),
  };
}

export async function montarDadosLaudo(av, comps, anexos = []) {
  const [{ textosFinais, enderecoLaudo }, perfil, assinatura, sessao] = await Promise.all([
    import("../lib/textosLaudo"),
    supabase.from("public_broker_profiles").select("name,creci_number,cnai_number,phone,bio").eq("user_id", av.broker_id).maybeSingle(),
    supabase.from("assinaturas").select("imagem").eq("user_id", av.broker_id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const corretor = perfil.data ? { ...perfil.data } : null;
  if (corretor && sessao.data?.user?.id === av.broker_id) corretor.email = sessao.data.user.email;
  const data = av.report_texts?.data_laudo?.trim()
    || new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const ptam = av.report_type === "ptam";
  // no PTAM a homogeneização é obrigatória: os textos passam a descrevê-la
  const avTextos = ptam ? { ...av, homogenization: { ...(av.homogenization || {}), usarNoLaudo: true } } : av;
  return {
    av, comps, corretor, data,
    assinatura: assinatura.data?.imagem || null,
    textos: textosFinais(avTextos, comps),
    extra: ptam ? await extrasPtam(av, comps, corretor, !!assinatura.data?.imagem, anexos) : null,
    endereco: enderecoLaudo(av),
    logo: new URL(`${import.meta.env.BASE_URL}logo-acontece.png`, window.location.origin).href,
  };
}

export async function gerarLaudoBlob(av, comps, anexos = []) {
  const [{ pdf }, { default: LaudoDocumento }, dados] = await Promise.all([
    import("@react-pdf/renderer"), import("./LaudoPdf"), montarDadosLaudo(av, comps, anexos),
  ]);
  const blob = await pdf(<LaudoDocumento {...dados} />).toBlob();
  if (!anexos.length) return blob;
  // anexa os PDFs escolhidos (certidão, IPTU…) ao final — eles não são guardados no sistema
  const { PDFDocument } = await import("pdf-lib");
  const final = await PDFDocument.load(await blob.arrayBuffer());
  for (const arq of anexos) {
    try {
      const doc = await PDFDocument.load(await arq.arrayBuffer(), { ignoreEncryption: true });
      for (const pg of await final.copyPages(doc, doc.getPageIndices())) final.addPage(pg);
    } catch { throw new Error(`Não consegui anexar “${arq.name}”. Confira se é um PDF válido.`); }
  }
  return new Blob([await final.save()], { type: "application/pdf" });
}

export async function baixarLaudo(av, comps, anexos = []) {
  const blob = await gerarLaudoBlob(av, comps, anexos);
  const tipo = av.report_type === "cliente" ? "Laudo avaliativo" : av.report_type === "ptam" ? "PTAM" : "Avaliacao de imovel";
  const nome = nomeArquivo(`${tipo} - ${av.property_street || av.client_name || "imovel"} - ${new Date().toISOString().slice(0, 10)}`) + ".pdf";
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return nome;
}
