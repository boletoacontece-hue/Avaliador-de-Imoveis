import React from "react";
import { NavLink, Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Shell({ children }) {
  const { user, gestor, sair } = useAuth();
  const base = import.meta.env.BASE_URL;
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
    </>
  );
}
