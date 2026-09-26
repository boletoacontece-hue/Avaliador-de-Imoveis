// Edge Function: gerar-estrategia
// Gera, com a API da Anthropic, uma estratégia de venda/locação para UMA avaliação.
// Lê os dados com o JWT de quem chamou → o RLS garante que só o dono (ou gestor) usa.
//
// Deploy:  supabase functions deploy gerar-estrategia --project-ref <ref>
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   (opcional: ANTHROPIC_MODEL)
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const brl = (v: number | null) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

function mediana(v: number[]) {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta({ erro: "Use POST" }, 405);

  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chave) return resposta({ erro: "ANTHROPIC_API_KEY não configurada nos secrets do Supabase." }, 500);

  let evaluationId = "";
  try { evaluationId = (await req.json())?.evaluation_id; } catch { /* corpo inválido */ }
  if (!evaluationId) return resposta({ erro: "Informe evaluation_id." }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    db: { schema: "avaliador" },
  });

  const { data: av, error } = await supabase.from("evaluations").select("*").eq("id", evaluationId).maybeSingle();
  if (error || !av) return resposta({ erro: "Avaliação não encontrada ou sem permissão." }, 403);
  const { data: comps } = await supabase.from("comparative_properties")
    .select("address,price,area,bedrooms,suites,parking,source_name,broker_observations")
    .eq("evaluation_id", evaluationId).order("sort_order");

  const aluguel = av.evaluation_type === "aluguel";
  const lista = (comps ?? []).filter((c) => Number(c.price) > 0 && Number(c.area) > 0);
  const m2s = lista.map((c) => Number(c.price) / Number(c.area));
  const mdn = mediana(m2s);
  const m2Sug = av.suggested_value && av.property_area ? Number(av.suggested_value) / Number(av.property_area) : null;

  const amostras = lista.map((c, i) =>
    `${i + 1}. ${c.address ?? "endereço não informado"} — ${brl(Number(c.price))}${aluguel ? "/mês" : ""}, ` +
    `${c.area} m² (${brl(Number(c.price) / Number(c.area))}/m²), ${c.bedrooms ?? "?"} quartos, ${c.parking ?? "?"} vagas` +
    (c.broker_observations ? `. Obs.: ${c.broker_observations}` : "")).join("\n");

  const prompt = `Você é consultor sênior de uma imobiliária de Brasília (Acontece Imobiliária, rede RE/MAX).
Escreva uma estratégia de ${aluguel ? "LOCAÇÃO" : "VENDA"} para o imóvel abaixo, dirigida ao proprietário (cliente), em português do Brasil.

Imóvel: ${av.property_type}, ${av.property_area ?? "?"} m², ${av.property_bedrooms ?? "?"} quartos (${av.property_suites ?? 0} suítes), ${av.property_parking ?? "?"} vagas${av.property_floor != null ? `, ${av.property_floor}º andar` : ""}.
Local: ${[av.property_street, av.property_neighborhood, av.property_city].filter(Boolean).join(", ") || "não informado"}${av.property_condo_name ? ` — ${av.property_condo_name}` : ""}.
Descrição: ${av.property_description || "—"}
Pontos fortes: ${(av.advantages ?? []).join("; ") || "—"}
Pontos de atenção: ${(av.concerns ?? []).join("; ") || "—"}
Valor sugerido: ${brl(av.suggested_value)}${aluguel ? "/mês" : ""}${m2Sug ? ` (${brl(m2Sug)}/m²)` : ""}
Mediana das amostras: ${mdn ? `${brl(mdn)}/m²` : "sem amostras suficientes"}
Justificativa do corretor: ${av.suggested_value_description || "—"}

Amostras comparativas:
${amostras || "nenhuma"}

Regras:
- 3 a 5 parágrafos curtos, tom profissional e direto, sem jargão.
- Cubra: posicionamento de preço frente às amostras, público-alvo provável, como destacar os pontos fortes e contornar os de atenção, e plano para as primeiras semanas de anúncio.
- Use apenas os dados acima. Não invente números, estatísticas, prazos garantidos ou promessas de resultado.
- Não use títulos, listas com marcadores nem markdown: apenas parágrafos de texto.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    const detalhe = await r.text();
    console.error("Anthropic", r.status, detalhe);
    return resposta({ erro: `Falha na IA (${r.status}). Tente de novo em instantes.` }, 502);
  }
  const j = await r.json();
  const texto = (j.content ?? []).filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text).join("\n").trim();
  return resposta({ texto });
});
