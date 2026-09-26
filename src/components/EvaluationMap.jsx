import React, { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { brl, fmtM2, precoM2 } from "../lib/format";

// Marcadores próprios (divIcon): evitam o bug dos ícones padrão do Leaflet com o Vite
// e diferenciam pela cor — verde = comparativo, dourado = imóvel avaliado.
const iconeComp = (n) => L.divIcon({
  className: "", html: `<div class="pino pino-comp"><span>${n}</span></div>`,
  iconSize: [30, 30], iconAnchor: [4, 30], popupAnchor: [11, -28],
});
const iconeAlvo = L.divIcon({
  className: "", html: `<div class="pino pino-alvo"><span>★</span></div>`,
  iconSize: [36, 36], iconAnchor: [5, 36], popupAnchor: [13, -34],
});

const temCoord = (lat, lng) => lat != null && lng != null && lat !== "" && lng !== "" && !isNaN(lat) && !isNaN(lng);

function Enquadrar({ pontos }) {
  const map = useMap();
  const chave = pontos.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (!pontos.length) return;
    if (pontos.length === 1) map.setView(pontos[0], 15);
    else map.fitBounds(pontos, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return null;
}

/**
 * props:
 *  comparativos: [{address, price, area, latitude, longitude}]
 *  alvo: {latitude, longitude, endereco} | null
 *  tipo: "venda" | "aluguel"
 *  onMoverAlvo(lat, lng): opcional — torna o pino dourado arrastável (editor)
 *  altura: css height
 */
export default function EvaluationMap({ comparativos = [], alvo = null, tipo = "venda", onMoverAlvo, altura = "100%", rolagem = false }) {
  const comps = useMemo(
    () => comparativos.map((c, i) => ({ ...c, n: i + 1 })).filter((c) => temCoord(c.latitude, c.longitude)),
    [comparativos]
  );
  const alvoOk = alvo && temCoord(alvo.latitude, alvo.longitude);
  const pontos = [
    ...comps.map((c) => [Number(c.latitude), Number(c.longitude)]),
    ...(alvoOk ? [[Number(alvo.latitude), Number(alvo.longitude)]] : []),
  ];
  // centro inicial = média das coordenadas (o Enquadrar ajusta o zoom em seguida)
  const centro = pontos.length
    ? [pontos.reduce((s, p) => s + p[0], 0) / pontos.length, pontos.reduce((s, p) => s + p[1], 0) / pontos.length]
    : [-15.7939, -47.8828]; // Brasília

  return (
    <MapContainer center={centro} zoom={pontos.length ? 14 : 11} scrollWheelZoom={rolagem} style={{ height: altura, width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Enquadrar pontos={pontos} />
      {comps.map((c) => {
        const m2 = precoM2(c.price, c.area);
        return (
          <Marker key={c.id || c.n} position={[Number(c.latitude), Number(c.longitude)]} icon={iconeComp(c.n)}>
            <Popup>
              <div><b>Amostra {c.n}</b></div>
              <div>{c.address || "Endereço não informado"}</div>
              <div className="popup-preco">{brl(c.price)}{tipo === "aluguel" ? "/mês" : ""}</div>
              <div>{fmtM2(m2, tipo)}</div>
            </Popup>
          </Marker>
        );
      })}
      {alvoOk && (
        <Marker
          position={[Number(alvo.latitude), Number(alvo.longitude)]}
          icon={iconeAlvo}
          draggable={Boolean(onMoverAlvo)}
          zIndexOffset={1000}
          eventHandlers={onMoverAlvo ? {
            dragend: (e) => { const p = e.target.getLatLng(); onMoverAlvo(Number(p.lat.toFixed(7)), Number(p.lng.toFixed(7))); },
          } : undefined}
        >
          <Popup><b>Imóvel avaliado</b><div>{alvo.endereco}</div>{onMoverAlvo && <div className="dica">Arraste o pino para ajustar a posição.</div>}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
