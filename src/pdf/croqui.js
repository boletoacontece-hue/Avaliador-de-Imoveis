// Croqui de localização para o PTAM: imóvel avaliado + amostras numeradas, escala e norte,
// desenhado num canvas a partir dos blocos do OpenStreetMap (crédito obrigatório no rodapé).
// Sem os blocos (offline/bloqueio), desenha os pontos sobre uma grade — o croqui nunca falha.

const TILE = 256;
const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z * TILE;
const lat2y = (lat, z) => { const r = (lat * Math.PI) / 180; return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z * TILE; };

function carregar(url) {
  return new Promise((ok) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(() => ok(null), 6000);
    img.onload = () => { clearTimeout(t); ok(img); };
    img.onerror = () => { clearTimeout(t); ok(null); };
    img.src = url;
  });
}

/**
 * @param alvo    { lat, lng }
 * @param pontos  [{ lat, lng, n }]  (n = número da amostra na tabela)
 * @returns { dataUrl, comMapa, zoom } | null (sem coordenadas)
 */
export async function gerarCroqui(alvo, pontos = [], { largura = 1100, altura = 720 } = {}) {
  const todos = [...(alvo?.lat != null ? [{ ...alvo, alvo: true }] : []), ...pontos.filter((p) => p.lat != null && p.lng != null)];
  if (!todos.length) return null;

  // zoom que enquadra todos os pontos com margem
  const margem = 90;
  let z = 18;
  for (; z > 3; z--) {
    const xs = todos.map((p) => lon2x(p.lng, z)), ys = todos.map((p) => lat2y(p.lat, z));
    if (Math.max(...xs) - Math.min(...xs) <= largura - 2 * margem && Math.max(...ys) - Math.min(...ys) <= altura - 2 * margem) break;
  }
  if (todos.length === 1) z = Math.min(z, 16);
  const xs = todos.map((p) => lon2x(p.lng, z)), ys = todos.map((p) => lat2y(p.lat, z));
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const x0 = cx - largura / 2, y0 = cy - altura / 2;

  const canvas = document.createElement("canvas");
  canvas.width = largura; canvas.height = altura;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#EEF1EA"; ctx.fillRect(0, 0, largura, altura);

  // blocos do mapa
  const tx0 = Math.floor(x0 / TILE), ty0 = Math.floor(y0 / TILE);
  const tx1 = Math.floor((x0 + largura) / TILE), ty1 = Math.floor((y0 + altura) / TILE);
  const pedidos = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    pedidos.push(carregar(`https://tile.openstreetmap.org/${z}/${tx}/${ty}.png`).then((img) => ({ img, tx, ty })));
  }
  const blocos = await Promise.all(pedidos);
  const comMapa = blocos.some((b) => b.img);
  if (comMapa) {
    for (const { img, tx, ty } of blocos) if (img) ctx.drawImage(img, tx * TILE - x0, ty * TILE - y0, TILE, TILE);
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(0, 0, largura, altura); // clareia para destacar os pinos
  } else {
    ctx.strokeStyle = "#D5DCCD"; ctx.lineWidth = 1;
    for (let x = 0; x < largura; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, altura); ctx.stroke(); }
    for (let y = 0; y < altura; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(largura, y); ctx.stroke(); }
  }

  // pinos: amostras numeradas (verde) e imóvel avaliado (dourado, por cima)
  const pino = (x, y, cor, texto, raio) => {
    ctx.beginPath(); ctx.arc(x, y, raio, 0, 2 * Math.PI);
    ctx.fillStyle = cor; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `bold ${raio > 16 ? 18 : 14}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(texto, x, y + 1);
  };
  for (const p of todos.filter((p) => !p.alvo)) pino(lon2x(p.lng, z) - x0, lat2y(p.lat, z) - y0, "#2B6E2F", String(p.n), 15);
  const a = todos.find((p) => p.alvo);
  if (a) pino(lon2x(a.lng, z) - x0, lat2y(a.lat, z) - y0, "#C9A961", "★", 19);

  // escala gráfica (metros por pixel na latitude central)
  const latC = a?.lat ?? todos[0].lat;
  const mpp = (156543.03392 * Math.cos((latC * Math.PI) / 180)) / 2 ** z;
  const alvoM = [20, 50, 100, 200, 500, 1000, 2000, 5000].find((m) => m / mpp >= 90) || 5000;
  const px = alvoM / mpp;
  ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillRect(16, altura - 52, px + 70, 38);
  ctx.strokeStyle = "#1F2A1F"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(26, altura - 24); ctx.lineTo(26 + px, altura - 24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(26, altura - 30); ctx.lineTo(26, altura - 18); ctx.moveTo(26 + px, altura - 30); ctx.lineTo(26 + px, altura - 18); ctx.stroke();
  ctx.fillStyle = "#1F2A1F"; ctx.font = "bold 14px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText(alvoM >= 1000 ? `${alvoM / 1000} km` : `${alvoM} m`, 34 + px, altura - 19);

  // seta do norte
  ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.beginPath(); ctx.arc(largura - 44, 46, 28, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = "#1F2A1F"; ctx.beginPath(); ctx.moveTo(largura - 44, 24); ctx.lineTo(largura - 54, 54); ctx.lineTo(largura - 44, 48); ctx.lineTo(largura - 34, 54); ctx.closePath(); ctx.fill();
  ctx.font = "bold 13px Arial"; ctx.textAlign = "center"; ctx.fillText("N", largura - 44, 68);

  // crédito do mapa
  const credito = comMapa ? "© colaboradores do OpenStreetMap" : "Mapa-base indisponível: posições relativas";
  ctx.font = "12px Arial"; ctx.textAlign = "right";
  const w = ctx.measureText(credito).width + 12;
  ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillRect(largura - w - 8, altura - 26, w, 20);
  ctx.fillStyle = "#333"; ctx.fillText(credito, largura - 14, altura - 11);

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), comMapa, zoom: z };
}
