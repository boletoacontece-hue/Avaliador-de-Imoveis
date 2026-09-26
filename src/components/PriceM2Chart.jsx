import React from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell, CartesianGrid } from "recharts";
import { brl, fmtM2, precoM2, media, mediana, num } from "../lib/format";

const CORES = ["#2B6E2F", "#8FB369"]; // alternadas
const DOURADO = "#C9A961";

function Dica({ active, payload, tipo }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid #E3DFD6", borderRadius: 10, padding: "10px 12px", maxWidth: 260, boxShadow: "0 6px 20px rgba(0,0,0,.12)", fontSize: 13 }}>
      <b>{d.alvo ? "Seu imóvel (valor sugerido)" : `Amostra ${d.n}`}</b>
      {d.endereco && <div style={{ color: "#5E6B5C", margin: "2px 0 6px" }}>{d.endereco}</div>}
      <div>Preço total: <b className="num">{brl(d.preco)}{tipo === "aluguel" ? "/mês" : ""}</b></div>
      <div>Área: <span className="num">{num(d.area)} m²</span></div>
      <div>Preço/m²: <b className="num">{fmtM2(d.m2, tipo)}</b></div>
    </div>
  );
}

export default function PriceM2Chart({ comparativos = [], alvo, tipo = "venda" }) {
  const dados = comparativos
    .map((c, i) => ({ n: i + 1, rotulo: `A${i + 1}`, endereco: c.address, preco: c.price, area: c.area, m2: precoM2(c.price, c.area) }))
    .filter((d) => d.m2 != null);
  if (!dados.length) return null;

  const valores = dados.map((d) => d.m2);
  const med = media(valores), mdn = mediana(valores);
  const m2Alvo = alvo ? precoM2(alvo.preco, alvo.area) : null;
  const serie = m2Alvo ? [...dados, { rotulo: "Seu", alvo: true, endereco: alvo.endereco, preco: alvo.preco, area: alvo.area, m2: m2Alvo }] : dados;

  const fmtEixo = (v) => tipo === "aluguel" ? `R$ ${num(Math.round(v))}` : v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : Math.round(v);
  const largura = Math.max(serie.length * 64, 320);

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: largura, height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 24, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#E3DFD6" />
              <XAxis dataKey="rotulo" tick={{ fontSize: 12, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={{ stroke: "#E3DFD6" }} />
              <YAxis tickFormatter={fmtEixo} tick={{ fontSize: 11, fontFamily: "IBM Plex Mono" }} width={62} tickLine={false} axisLine={false} />
              <Tooltip content={<Dica tipo={tipo} />} cursor={{ fill: "rgba(43,110,47,.06)" }} />
              <ReferenceLine y={med} stroke="#1B3A1B" strokeDasharray="6 4" label={{ value: "Média", position: "insideTopRight", fontSize: 11, fill: "#1B3A1B" }} />
              {dados.length >= 3 && (
                <ReferenceLine y={mdn} stroke="#C98A1B" strokeDasharray="2 4" label={{ value: "Mediana", position: "insideBottomRight", fontSize: 11, fill: "#8A6B22" }} />
              )}
              <Bar dataKey="m2" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {serie.map((d, i) => <Cell key={i} fill={d.alvo ? DOURADO : CORES[i % 2]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, marginTop: 8, color: "#5E6B5C" }}>
        <span>Média: <b className="num" style={{ color: "#1F2A1F" }}>{fmtM2(med, tipo)}</b></span>
        {dados.length >= 3 && <span>Mediana: <b className="num" style={{ color: "#1F2A1F" }}>{fmtM2(mdn, tipo)}</b></span>}
        {m2Alvo && <span>Seu imóvel: <b className="num" style={{ color: "#8A6B22" }}>{fmtM2(m2Alvo, tipo)}</b></span>}
      </div>
    </div>
  );
}
