import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { montarEndereco } from "../lib/format";
import { EMPRESA } from "../config/empresa";
import Hero from "./Hero";
import { QuemSomos, OImovel, Percepcoes, Comparativos, Vendidas, InteligenciaMercado, EducacaoMercado, ValorSugerido, CartaoCorretor } from "./Secoes";
import NaoEncontrado from "../pages/NaoEncontrado";
import { Carregando } from "../components/ui";
import "./publica.css";

export default function PaginaPublica({ codigo }) {
  const [dados, setDados] = useState(undefined); // undefined = carregando, null = não existe
  const [erro, setErro] = useState("");

  useEffect(() => {
    supabase.rpc("avaliacao_publica", { p_codigo: codigo }).then(({ data, error }) => {
      if (error) setErro(error.message);
      setDados(data ?? null);
    });
  }, [codigo]);

  useEffect(() => {
    if (dados?.ativa) {
      const end = montarEndereco(dados.avaliacao);
      document.title = `${dados.avaliacao.evaluation_type === "aluguel" ? "Estudo de valor de locação" : "Estudo de valor de mercado"}${end ? ` · ${end}` : ""}`;
    }
  }, [dados]);

  if (dados === undefined) return <Carregando texto="Abrindo o estudo…" />;
  if (erro) return (
    <div className="inativa-tela"><div className="box"><h1>Não foi possível abrir o estudo</h1><p>Verifique sua conexão e tente novamente.</p>
      <button className="btn" onClick={() => window.location.reload()}>Tentar novamente</button></div></div>
  );
  if (!dados) return <NaoEncontrado />;

  const base = import.meta.env.BASE_URL;

  if (!dados.ativa) return (
    <div className="pub inativa-tela">
      <div className="box">
        <img src={`${base}logo-acontece.png`} alt="Acontece Imobiliária" />
        <h1>Esta avaliação foi desativada</h1>
        <p>Fale com o corretor para receber uma versão atualizada.</p>
        <CartaoCorretor corretor={dados.corretor} sozinho />
      </div>
    </div>
  );

  const av = dados.avaliacao;
  const endereco = montarEndereco(av);
  const comps = dados.comparativos || [];
  const vendidas = dados.vendidas || [];

  return (
    <div className="pub">
      <Hero av={av} corretor={dados.corretor} endereco={endereco} />
      <QuemSomos corretor={dados.corretor} />
      <OImovel av={av} endereco={endereco} />
      <Percepcoes av={av} />
      <Comparativos av={av} comps={comps} endereco={endereco} />
      <Vendidas av={av} vendidas={vendidas} />
      <InteligenciaMercado mercado={dados.mercado} av={av} fundo={vendidas.length ? "clara" : "branca"} />
      <EducacaoMercado av={av} />
      <ValorSugerido av={av} corretor={dados.corretor} />
      <CartaoCorretor corretor={dados.corretor} endereco={endereco} />
      <footer className="pub-rodape">
        <img src={`${base}logo-acontece.png`} alt="" />
        {EMPRESA.razao} · {EMPRESA.creci}
      </footer>
    </div>
  );
}
