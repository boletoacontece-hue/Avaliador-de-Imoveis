import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { LogOut, LayoutList, PlusCircle, BarChart3, Users, UserCircle } from "lucide-react";
import { useAuth } from "../lib/auth";
import AssistenteAcontece from "./AssistenteAcontece";

export default function Shell({ children }) {
  const { user, gestor, sair } = useAuth();
  const base = import.meta.env.BASE_URL;
  const { pathname } = useLocation();
  const noEditor = pathname.startsWith("/evaluation/");
  return (
    <>
      <header className="topo">
        <div className="topo-in">
          <Link to="/dashboard" className="marca">
            <img src={`${base}logo-acontece-branco.png`} alt="Acontece" />
            <span>Avaliador<small>de Imóveis</small></span>
          </Link>
          <nav className="nav">
            <NavLink to="/dashboard">Avaliações</NavLink>
            <NavLink to="/profile">Meu perfil</NavLink>
            {gestor && <NavLink to="/painel">Painel</NavLink>}
            {gestor && <NavLink to="/equipe">Equipe</NavLink>}
          </nav>
          <div className="topo-dir">
            <span className="email">{user?.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={sair} title="Sair"><LogOut size={16} /><span className="sr-only">Sair</span></button>
          </div>
        </div>
      </header>
      {children}
      <AssistenteAcontece />
      {/* barra inferior (celular / aplicativo); no editor, a barra é a das etapas */}
      {!noEditor && (
        <nav className="nav-inferior" aria-label="Navegação principal">
          <NavLink to="/dashboard" end><LayoutList size={22} /><span>Avaliações</span></NavLink>
          <Link to="/dashboard?nova=1" className="nova"><PlusCircle size={26} /><span>Nova</span></Link>
          {gestor && <NavLink to="/painel"><BarChart3 size={22} /><span>Painel</span></NavLink>}
          {gestor && <NavLink to="/equipe"><Users size={22} /><span>Equipe</span></NavLink>}
          <NavLink to="/profile"><UserCircle size={22} /><span>Perfil</span></NavLink>
        </nav>
      )}
    </>
  );
}
