import React from "react";
import { ehVersaoNova, AVISO_VERSAO } from "../lib/versao";

// Se uma tela não carregar (ex.: versão nova publicada com a aba aberta),
// mostra uma orientação com botão de recarregar em vez de tela em branco.
export default class ErroCarregamento extends React.Component {
  constructor(props) { super(props); this.state = { erro: null }; }
  static getDerivedStateFromError(erro) { return { erro }; }
  componentDidCatch(erro) { console.error(erro); }
  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    const versao = ehVersaoNova(erro);
    return (
      <div className="tela-aviso" style={{ minHeight: "60vh" }}>
        <h2>{versao ? "Há uma versão nova do Avaliador" : "Algo deu errado ao abrir esta tela"}</h2>
        <p>{versao ? AVISO_VERSAO : "Recarregue a página e tente de novo. Se o problema continuar, avise a equipe."}</p>
        <div className="acoes-aviso"><button className="btn" onClick={() => window.location.reload()}>Recarregar a página</button></div>
      </div>
    );
  }
}
