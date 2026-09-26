import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useSpring, useReducedMotion } from "framer-motion";

// Seção com fade-up ao entrar na tela.
// amount pequeno: seções mais altas que a tela do celular também disparam.
export function Reveal({ as = "section", children, className, id, style }) {
  const reduz = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp id={id} className={className} style={style}
      initial={{ opacity: 0, y: reduz ? 0 : 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: reduz ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </Comp>
  );
}

// Container + itens com stagger
export function Stagger({ children, className, style }) {
  return (
    <motion.div className={className} style={style} initial="oculto" whileInView="visivel" viewport={{ once: true, amount: 0.08 }}
      variants={{ oculto: {}, visivel: { transition: { staggerChildren: 0.08 } } }}>
      {children}
    </motion.div>
  );
}
export function StaggerItem({ children, className, style, as = "div" }) {
  const reduz = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp className={className} style={style}
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
  const reduz = useReducedMotion();
  const mola = useSpring(0, { stiffness: 50, damping: 20, restDelta: 0.5 });
  const [texto, setTexto] = useState(reduz ? fmt.format(valor) : "0");

  useEffect(() => {
    if (reduz) { setTexto(fmt.format(valor)); return; }
    if (visivel) mola.set(valor);
  }, [visivel, valor, reduz, mola]);
  useEffect(() => {
    const a = mola.on("change", (v) => setTexto(fmt.format(Math.round(v))));
    // a mola para "perto" do alvo (restDelta): ao terminar, crava o valor exato
    const b = mola.on("animationComplete", () => setTexto(fmt.format(valor)));
    return () => { a(); b(); };
  }, [mola, valor]);

  return <span ref={ref} className={`num ${className || ""}`}>{prefixo}{texto}{sufixo}</span>;
}
