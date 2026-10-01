import React, { Suspense, lazy } from "react";
import ErroCarregamento from "./components/ErroCarregamento";
import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Equipe from "./pages/Equipe";
import NaoEncontrado from "./pages/NaoEncontrado";
import AcessoPendente from "./pages/AcessoPendente";
import { Carregando } from "./components/ui";

// telas pesadas carregadas sob demanda
const Editor = lazy(() => import("./pages/Editor"));
const PaginaPublica = lazy(() => import("./public/PaginaPublica"));
const Painel = lazy(() => import("./pages/Painel"));

const CODIGO = /^[a-hjkmnp-z2-9]{6}$/i; // mesmo alfabeto do banco (sem 0/o, 1/l/i)

function Protegido() {
  const { user, loading, membro } = useAuth();
  if (loading) return <Carregando />;
  if (!user) return <Navigate to="/" replace />;
  if (!membro) return <AcessoPendente />;
  return <Shell><ErroCarregamento><Suspense fallback={<Carregando />}><Outlet /></Suspense></ErroCarregamento></Shell>;
}

function SoGestor({ children }) {
  const { gestor } = useAuth();
  return gestor ? children : <Navigate to="/dashboard" replace />;
}

function Inicio() {
  const { user, loading } = useAuth();
  if (loading) return <Carregando />;
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
}

function RotaCodigo() {
  const { codigo } = useParams();
  if (!CODIGO.test(codigo)) return <NaoEncontrado />;
  return <PaginaPublica codigo={codigo.toLowerCase()} />;
}
function RotaUuid() {
  const { publicId } = useParams();
  return <PaginaPublica codigo={publicId} />;
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <BrowserRouter basename={base}>
      <AuthProvider>
        <ErroCarregamento>
        <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route element={<Protegido />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/evaluation/:id" element={<Editor />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/painel" element={<SoGestor><Painel /></SoGestor>} />
              <Route path="/equipe" element={<SoGestor><Equipe /></SoGestor>} />
            </Route>
            <Route path="/a/:publicId" element={<RotaUuid />} />
            <Route path="/:codigo" element={<RotaCodigo />} />
            <Route path="*" element={<NaoEncontrado />} />
          </Routes>
        </Suspense>
        </ErroCarregamento>
      </AuthProvider>
    </BrowserRouter>
  );
}
