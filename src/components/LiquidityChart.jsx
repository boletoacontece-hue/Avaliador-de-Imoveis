import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

// Curva ILUSTRATIVA: atratividade relativa do anúncio ao longo do tempo.
// Substituir por dados de vacância reais da base Imobiliar quando disponíveis.
const DADOS = [
  { dia: 0, v: 100 }, { dia: 7, v: 100 }, { dia: 14, v: 96 }, { dia: 21, v: 88 }, { dia: 30, v: 76 },
  { dia: 45, v: 58 }, { dia: 60, v: 43 }, { dia: 75, v: 31 }, { dia: 90, v: 22 }, { dia: 105, v: 15 }, { dia: 120, v: 10 },
];

export default function LiquidityChart({ claro = false }) {
  const cor = claro ? "#C9A961" : "#2B6E2F";
  const texto = claro ? "rgba(255,255,255,.75)" : "#5E6B5C";
  const grade = claro ? "rgba(255,255,255,.12)" : "#E3DFD6";
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DADOS} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gradLiquidez" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.65} />
              <stop offset="100%" stopColor={cor} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={grade} />
          <XAxis dataKey="dia" tickFormatter={(d) => `${d}d`} ticks={[0, 30, 60, 90, 120]} tick={{ fontSize: 11, fill: texto, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} ticks={[0, 50, 100]} tick={{ fontSize: 11, fill: texto, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${v}%`, "Atratividade relativa"]} labelFormatter={(d) => `${d} dias no mercado`} contentStyle={{ borderRadius: 10, fontSize: 13, color: "#1F2A1F" }} />
          <Area type="monotone" dataKey="v" stroke={cor} strokeWidth={2.5} fill="url(#gradLiquidez)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
