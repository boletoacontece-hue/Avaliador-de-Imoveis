const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export const brl = (v) => (v == null || v === "" || isNaN(v) ? "—" : brlFmt.format(Number(v)));
export const brlDec = (v) => (v == null || v === "" || isNaN(v) ? "—" : brlCents.format(Number(v)));
export const num = (v) => (v == null || v === "" || isNaN(v) ? "—" : numFmt.format(Number(v)));
export const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

export function precoM2(preco, area) {
  const p = Number(preco), a = Number(area);
  return p > 0 && a > 0 ? p / a : null;
}
// venda: R$/m² inteiro; aluguel: R$/m² com centavos e "/mês"
export const fmtM2 = (v, tipo) =>
  v == null ? "—" : tipo === "aluguel" ? `${brlDec(v)}/m² mês` : `${brl(v)}/m²`;

export const dataCurta = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
export const dataLonga = (d) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : "";
export const hora = (d) => (d ? new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "");

export const fmtCep = (c) => { const d = onlyDigits(c).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

export function montarEndereco(e) {
  const linha1 = [e.property_street, e.property_number].filter(Boolean).join(", ");
  const partes = [linha1, e.property_complement, e.property_neighborhood,
    [e.property_city, e.property_state].filter(Boolean).join("/")].filter(Boolean);
  return partes.join(", ");
}

export function mediana(valores) {
  const v = valores.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
export const media = (valores) => {
  const v = valores.filter((x) => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

// Endereço público do site. No aplicativo (Capacitor) a página roda em https://localhost,
// então o link do cliente precisa vir da configuração (VITE_SITE_URL), não da página atual.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || `${window.location.origin}${import.meta.env.BASE_URL}`).replace(/\/?$/, "/");

export function linkPublico(shortCode) {
  return `${SITE_URL}${shortCode}`;
}

export function linkWhatsApp(phone, mensagem) {
  let d = onlyDigits(phone);
  if (!d) return null;
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensagem)}`;
}

export const TIPOS_IMOVEL = ["Apartamento", "Kitnete", "Casa", "Casa em Condomínio", "Cobertura", "Garden", "Studio",
  "Sala Comercial", "Loja", "Galpão", "Terreno"];
