import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring, useReducedMotion } from "framer-motion";

// Revela quando o topo do bloco passa da borda inferior da tela — e continua revelado.
// Checagem por posição (não só IntersectionObserver): uma seção que passou "voando"
// (tecla End, arrastar a barra, link âncora) ou que já está acima da tela aparece do mesmo jeito.
function useRevelado(ref) {
  const [revelado, setRevelado] = useState(false);
  useEffect(() => {
    if (revelado) return;
    let quadro = 0;
    const checar = () => {
      quadro = 0;
      const el = ref.current;
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.92) setRevelado(true);
    };
    const agendar = () => { if (!quadro) quadro = requestAnimationFrame(checar); };
    checar();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    window.addEventListener("beforeprint", () => setRevelado(true));
    return () => {
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [revelado, ref]);
  return revelado;
}

// Seção com fade-up ao entrar na tela.
export function Reveal({ as = "section", children, className, id, style }) {
  const reduz = useReducedMotion();
  const ref = useRef(null);
  const revelado = useRevelado(ref);
  const Comp = motion[as];
  return (
    <Comp ref={ref} id={id} className={`${className || ""} revela`} style={style}
      initial={{ opacity: 0, y: reduz ? 0 : 60 }}
      animate={revelado ? { opacity: 1, y: 0 } : { opacity: 0, y: reduz ? 0 : 60 }}
      transition={{ duration: reduz ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </Comp>
  );
}

// Container + itens com stagger (mesma regra de revelação)
export function Stagger({ children, className, style }) {
  const ref = useRef(null);
  const revelado = useRevelado(ref);
  return (
    <motion.div ref={ref} className={`${className || ""} revela`} style={style} initial="oculto" animate={revelado ? "visivel" : "oculto"}
      variants={{ oculto: {}, visivel: { transition: { staggerChildren: 0.08 } } }}>
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className, style, as = "div" }) {
  const reduz = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp className={`${className || ""} revela`} style={style}
      variants={{ oculto: { opacity: 0, y: reduz ? 0 : 24 }, visivel: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}>
      {children}
    </Comp>
  );
}

// Número que conta de 0 até o valor ao entrar na tela (pt-BR, dígitos tabulares)
const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
export function AnimatedCounter({ valor, prefixo = "", sufixo = "", className }) {
  const ref = useRef(null);
  const visivel = useInView(ref, { once: true, amount: 0.5 });
  const passou = useRevelado(ref); // também conta se a pessoa já rolou além do número
  const reduz = useReducedMotion();
  const mola = useSpring(0, { stiffness: 50, damping: 20, restDelta: 0.5 });
  const [texto, setTexto] = useState(reduz ? fmt.format(valor) : "0");

  useEffect(() => {
    if (reduz) { setTexto(fmt.format(valor)); return; }
    if (visivel || passou) mola.set(valor);
  }, [visivel, passou, valor, reduz, mola]);
  useEffect(() => {
    // a mola pode assentar a centavos do alvo: perto do fim, mostra o valor exato
    const a = mola.on("change", (v) => setTexto(fmt.format(Math.abs(v - valor) < Math.max(1, valor * 0.0005) ? valor : Math.round(v))));
    const b = mola.on("animationComplete", () => setTexto(fmt.format(valor)));
    return () => { a(); b(); };
  }, [mola, valor]);

  return <span ref={ref} className={`num ${className || ""}`}>{prefixo}{texto}{sufixo}</span>;
}
