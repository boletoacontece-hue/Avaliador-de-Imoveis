import React, { useMemo, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { MapPin, ChevronDown } from "lucide-react";
import { dataLonga } from "../lib/format";

// 20 pontos brancos flutuando; posições fixas por sessão (useMemo)
function Particulas() {
  const reduz = useReducedMotion();
  const pontos = useMemo(() => Array.from({ length: 20 }, () => ({
    left: Math.random() * 100, top: Math.random() * 100,
    dx: (Math.random() - 0.5) * 120, dy: (Math.random() - 0.5) * 120,
    dur: 12 + Math.random() * 14, op: 0.15 + Math.random() * 0.45, esc: 0.6 + Math.random() * 1.2,
  })), []);
  return (
    <div className="hero-particulas" aria-hidden="true">
      {pontos.map((p, i) => (
        <motion.span key={i}
          style={{ left: `${p.left}%`, top: `${p.top}%`, opacity: p.op, scale: p.esc }}
          animate={reduz ? undefined : { x: [0, p.dx, p.dx * 0.3, 0], y: [0, p.dy, -p.dy * 0.4, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </div>
  );
}

export default function Hero({ av, corretor, endereco }) {
  const ref = useRef(null);
  const reduz = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduz ? 0 : 160]);
  const opacidade = useTransform(scrollYProgress, [0, 0.8], [1, reduz ? 1 : 0]);
  const base = import.meta.env.BASE_URL;
  const aluguel = av.evaluation_type === "aluguel";
  const iniciais = (corretor?.name || "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");

  return (
    <header className="hero" ref={ref}>
      <Particulas />
      <div className="hero-topo">
        <img src={`${base}logo-acontece-branco.png`} alt="Acontece Imobiliária" />
        <span className="data">{dataLonga(av.updated_at || av.created_at)}</span>
      </div>
      <motion.div className="hero-corpo" style={{ y, opacity: opacidade }}>
        <span className="hero-tipo">{aluguel ? "Locação" : "Venda"} · {av.property_type}</span>
        <h1>{aluguel ? "Estudo de valor de locação" : "Estudo de valor de mercado"}</h1>
        {av.client_name && <div className="hero-cliente">Preparado para<b>{av.client_name}</b></div>}
        {endereco && <div className="hero-pilula"><MapPin size={17} /><span>{endereco}</span></div>}
      </motion.div>
      <div className="hero-rodape">
        {corretor?.name ? (
          <div className="hero-corretor">
            {corretor.photo_url ? <img src={corretor.photo_url} alt="" /> : <span className="sem-foto">{iniciais}</span>}
            <div><small>Seu corretor</small>{corretor.name}</div>
          </div>
        ) : <span />}
        <a className="hero-seta" href="#quem-somos" aria-label="Rolar para o conteúdo">
          <span>Ver o estudo</span>
          <motion.span animate={reduz ? undefined : { y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}><ChevronDown size={26} /></motion.span>
        </a>
      </div>
    </header>
  );
}
