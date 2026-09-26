import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from "recharts";
import { fmtM2 } from "../lib/format";

// rótulo compacto: venda "14,2 mil" · aluguel "R$ 58,40"
const compacto = (v, tipo) => tipo === "aluguel"
  ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `${(Number(v) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;

const CORES = ["#2B6E2F", "#8FB369", "#C9A961", "#1B3A1B", "#5E8C4A", "#A8C98A", "#8A6B22", "#3F5E3F"];

// Ranking horizontal de bairros por R$/m² (base Acontece, agregada)
export function BairrosChart({ bairros = [], tipo = "venda", destaque }) {
  if (!bairros.length) return null;
  const dados = bairros.map((b) => ({ ...b, valor_m2: Number(b.valor_m2) }));
  const alvo = (destaque || "").trim().toLowerCase();
  return (
    <div style={{ height: Math.max(dados.length * 38 + 30, 180) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 64, left: 0, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="bairro" width={104} tick={{ fontSize: 12, fill: "#1F2A1F" }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: "rgba(43,110,47,.06)" }}
            formatter={(v, _n, p) => [fmtM2(v, tipo), `${p.payload.n} imóveis na base`]}
            contentStyle={{ borderRadius: 10, fontSize: 13 }} />
          <Bar dataKey="valor_m2" radius={[0, 6, 6, 0]} maxBarSize={24}
            label={{ position: "right", fontSize: 11, fontFamily: "IBM Plex Mono", fill: "#5E6B5C", formatter: (v) => compacto(v, tipo) }}>
            {dados.map((d, i) => <Cell key={i} fill={d.bairro.toLowerCase() === alvo ? "#C9A961" : i % 2 ? "#8FB369" : "#2B6E2F"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Distribuição por tipo de imóvel (pizza)
export function TiposPieChart({ tipos = [] }) {
  if (!tipos.length) return null;
  const dados = tipos.map((t) => ({ nome: t.tipo, valor: Number(t.n) }));
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="48%" outerRadius="80%" paddingAngle={2} stroke="none">
            {dados.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
          </Pie>
          <Tooltip formatter={(v, n) => [`${v} imóveis`, n]} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
