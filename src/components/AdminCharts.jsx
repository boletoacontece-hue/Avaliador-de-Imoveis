import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { brl } from "../lib/format";

const compacto = (v) => v >= 1e6
  ? `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`
  : `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
const tick = { fontSize: 11, fontFamily: "IBM Plex Mono", fill: "#5E6B5C" };

// Distribuição de avaliações por faixa de valor (barras)
export function FaixasChart({ dados }) {
  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E3DFD6" />
          <XAxis dataKey="faixa" tick={{ ...tick, fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: "#E3DFD6" }} interval={0} />
          <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [`${v} avaliações`, "Quantidade"]} contentStyle={{ borderRadius: 10, fontSize: 13 }} cursor={{ fill: "rgba(43,110,47,.06)" }} />
          <Bar dataKey="n" radius={[6, 6, 0, 0]} maxBarSize={52} label={{ position: "top", fontSize: 11, fontFamily: "IBM Plex Mono", fill: "#1F2A1F" }}>
            {dados.map((_, i) => <Cell key={i} fill={i % 2 ? "#8FB369" : "#2B6E2F"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Top 10 bairros por valor médio sugerido (barras horizontais)
export function BairrosValorChart({ dados, aluguel }) {
  return (
    <div style={{ height: Math.max(dados.length * 36 + 24, 160) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 70, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="bairro" width={110} tick={{ fontSize: 12, fill: "#1F2A1F" }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v, _n, p) => [`${brl(v)}${aluguel ? "/mês" : ""}`, `média de ${p.payload.n} avaliações`]}
            contentStyle={{ borderRadius: 10, fontSize: 13 }} cursor={{ fill: "rgba(43,110,47,.06)" }} />
          <Bar dataKey="media" radius={[0, 6, 6, 0]} maxBarSize={22}
            label={{ position: "right", fontSize: 11, fontFamily: "IBM Plex Mono", fill: "#5E6B5C", formatter: (v) => compacto(v) }}>
            {dados.map((_, i) => <Cell key={i} fill={i === 0 ? "#C9A961" : i % 2 ? "#8FB369" : "#2B6E2F"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
