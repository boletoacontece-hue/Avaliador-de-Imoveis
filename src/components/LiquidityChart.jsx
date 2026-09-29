import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

// Curva ILUSTRATIVA: atratividade relativa do anúncio ao longo do tempo.
// Quando há estudo do portal, uma linha marca o tempo médio REAL de venda do segmento.
const BASE = [
  { dia: 0, v: 100 }, { dia: 7, v: 100 }, { dia: 14, v: 96 }, { dia: 21, v: 88 }, { dia: 30, v: 76 },
  { dia: 45, v: 58 }, { dia: 60, v: 43 }, { dia: 75, v: 31 }, { dia: 90, v: 22 }, { dia: 105, v: 15 }, { dia: 120, v: 10 },
];

export default function LiquidityChart({ claro = false, diasVendaReal = null }) {
  const cor = claro ? "#C9A961" : "#2B6E2F";
  const texto = claro ? "rgba(255,255,255,.75)" : "#5E6B5C";
  const grade = claro ? "rgba(255,255,255,.12)" : "#E3DFD6";
  const fim = Math.max(120, Math.ceil(((diasVendaReal || 0) + 20) / 30) * 30);
  const dados = [...BASE];
  for (let d = 150; d <= fim; d += 30) dados.push({ dia: d, v: Math.max(3, Math.round(10 * Math.exp(-(d - 120) / 60))) });
  const ticks = []; for (let d = 0; d <= fim; d += 30) ticks.push(d);
  return (
    <div style={{ height: 250 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 22, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gradLiquidez" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.65} />
              <stop offset="100%" stopColor={cor} stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={grade} />
          <XAxis dataKey="dia" type="number" domain={[0, fim]} tickFormatter={(d) => `${d}d`} ticks={ticks} tick={{ fontSize: 11, fill: texto, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} ticks={[0, 50, 100]} tick={{ fontSize: 11, fill: texto, fontFamily: "IBM Plex Mono" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${v}%`, "Atratividade relativa"]} labelFormatter={(d) => `${d} dias no mercado`} contentStyle={{ borderRadius: 10, fontSize: 13, color: "#1F2A1F" }} />
          <Area type="monotone" dataKey="v" stroke={cor} strokeWidth={2.5} fill="url(#gradLiquidez)" />
          {diasVendaReal > 0 && (
            <ReferenceLine x={diasVendaReal} stroke={claro ? "#fff" : "#1B3A1B"} strokeDasharray="5 4" strokeWidth={1.5}
              label={{ value: `venda média: ${Math.round(diasVendaReal)} dias`, position: "top", fill: claro ? "#fff" : "#1B3A1B", fontSize: 11, fontFamily: "IBM Plex Mono" }} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
