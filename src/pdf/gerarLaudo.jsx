// Gera o PDF do laudo no navegador e baixa o arquivo.
// Tudo é carregado sob demanda: o gerador de PDF (~1 MB) só vem quando alguém clica em "Baixar PDF".
import React from "react";
import { supabase } from "../lib/supabase";

const nomeArquivo = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s.-]/g, "").replace(/\s+/g, " ").trim();

export async function montarDadosLaudo(av, comps) {
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
  return {
    av, comps, corretor, data,
    assinatura: assinatura.data?.imagem || null,
    textos: textosFinais(av, comps),
    endereco: enderecoLaudo(av),
    logo: new URL(`${import.meta.env.BASE_URL}logo-acontece.png`, window.location.origin).href,
  };
}

export async function gerarLaudoBlob(av, comps) {
  const [{ pdf }, { default: LaudoDocumento }, dados] = await Promise.all([
    import("@react-pdf/renderer"), import("./LaudoPdf"), montarDadosLaudo(av, comps),
  ]);
  return pdf(<LaudoDocumento {...dados} />).toBlob();
}

export async function baixarLaudo(av, comps) {
  const blob = await gerarLaudoBlob(av, comps);
  const tipo = av.report_type === "cliente" ? "Laudo avaliativo" : "Avaliacao de imovel";
  const nome = nomeArquivo(`${tipo} - ${av.property_street || av.client_name || "imovel"} - ${new Date().toISOString().slice(0, 10)}`) + ".pdf";
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return nome;
}
