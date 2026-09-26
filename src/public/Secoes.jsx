import React, { Suspense, lazy, useState } from "react";
import { Home, Ruler, BedDouble, Bath, Car, Sparkles, Layers, ArrowUpDown, MapPin, Building2,
  CheckCircle2, AlertCircle, ExternalLink, ImageOff, MessageCircle, BadgeCheck, Award } from "lucide-react";
import { Reveal, Stagger, StaggerItem, AnimatedCounter } from "../components/Motion";
import LazyMap from "../components/LazyMap";
import { EMPRESA } from "../config/empresa";
import { brl, num, fmtM2, precoM2, linkWhatsApp } from "../lib/format";

const base = import.meta.env.BASE_URL;

// gráficos (Recharts) em pacote separado: o hero abre sem esperar por eles
const PriceM2Chart = lazy(() => import("../components/PriceM2Chart"));
const LiquidityChart = lazy(() => import("../components/LiquidityChart"));
const BairrosChart = lazy(() => import("../components/MarketCharts").then((m) => ({ default: m.BairrosChart })));
const TiposPieChart = lazy(() => import("../components/MarketCharts").then((m) => ({ default: m.TiposPieChart })));
const EsperaGrafico = ({ h = 240 }) => <div className="carregando" style={{ minHeight: h }}><div className="giro" /></div>;

export function QuemSomos({ corretor }) {
  return (
    <Reveal className="pub-sec branca" id="quem-somos">
      <div className="pub-in quem">
        <div>
          <h2 className="pub-titulo">Quem somos</h2>
          <p className="pub-lead" style={{ marginBottom: 0 }}>{EMPRESA.apresentacao}</p>
          <div className="credenciais">
            <span className="credencial"><BadgeCheck size={15} /> {EMPRESA.creci}</span>
            {EMPRESA.rede && <span className="credencial"><Award size={15} /> {EMPRESA.rede}</span>}
            {corretor?.creci_number && <span className="credencial"><BadgeCheck size={15} /> Corretor CRECI {corretor.creci_number}</span>}
            {corretor?.cnai_number && <span className="credencial"><BadgeCheck size={15} /> CNAI {corretor.cnai_number}</span>}
          </div>
        </div>
        <div className="quem-stats">
          {EMPRESA.estatisticas.map((s) => (
            <div key={s.rotulo}><b><AnimatedCounter valor={s.valor} prefixo={s.prefixo} sufixo={s.sufixo} /></b><span>{s.rotulo}</span></div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export function OImovel({ av, endereco }) {
  const itens = [
    { i: Home, v: av.property_type, r: "Tipo", texto: true },
    av.property_area && { i: Ruler, v: `${num(av.property_area)} m²`, r: "Área privativa" },
    av.property_bedrooms != null && { i: BedDouble, v: av.property_bedrooms, r: av.property_bedrooms === 1 ? "Quarto" : "Quartos" },
    av.property_suites != null && { i: Sparkles, v: av.property_suites, r: av.property_suites === 1 ? "Suíte" : "Suítes" },
    av.property_bathrooms != null && { i: Bath, v: av.property_bathrooms, r: av.property_bathrooms === 1 ? "Banheiro" : "Banheiros" },
    av.property_parking != null && { i: Car, v: av.property_parking, r: av.property_parking === 1 ? "Vaga" : "Vagas" },
    av.property_floor != null && { i: Layers, v: `${av.property_floor}º`, r: "Andar" },
    av.property_elevator != null && { i: ArrowUpDown, v: av.property_elevator ? "Sim" : "Não", r: "Elevador", texto: true },
  ].filter(Boolean);
  return (
    <Reveal className="pub-sec">
      <div className="pub-in">
        <span className={`badge ${av.evaluation_type === "aluguel" ? "badge-aluguel" : "badge-venda"}`} style={{ marginBottom: 14 }}>
          {av.evaluation_type === "aluguel" ? "Avaliação para locação" : "Avaliação para venda"}
        </span>
        <h2 className="pub-titulo">O imóvel</h2>
        <Stagger className="ficha">
          {itens.map(({ i: Icone, v, r, texto }) => (
            <StaggerItem key={r} className={`ficha-item ${texto ? "texto" : ""}`}><Icone size={22} /><div><b>{v}</b><span>{r}</span></div></StaggerItem>
          ))}
        </Stagger>
        {endereco && <p className="imovel-endereco"><MapPin size={18} /><span>{endereco}{av.property_condo_name && <><br /><Building2 size={14} style={{ verticalAlign: "-2px" }} /> {av.property_condo_name}</>}</span></p>}
        {av.property_description && <div className="imovel-desc">{av.property_description}</div>}
      </div>
    </Reveal>
  );
}

export function Percepcoes({ av }) {
  const fortes = av.advantages || [], atencao = av.concerns || [];
  if (!fortes.length && !atencao.length) return null;
  return (
    <Reveal className="pub-sec branca">
      <div className="pub-in">
        <h2 className="pub-titulo">Percepções relevantes</h2>
        <p className="pub-lead">O que valoriza o imóvel e o que pesa na negociação, na leitura de quem visitou.</p>
        <div className="percep">
          {fortes.length > 0 && <div className="forte">
            <h3><CheckCircle2 size={22} color="var(--verde)" /> Pontos fortes</h3>
            <Stagger><ul>{fortes.map((t, i) => <StaggerItem as="li" key={i}><CheckCircle2 size={18} />{t}</StaggerItem>)}</ul></Stagger>
          </div>}
          {atencao.length > 0 && <div className="atencao">
            <h3><AlertCircle size={22} color="var(--ambar)" /> Pontos de atenção</h3>
            <Stagger><ul>{atencao.map((t, i) => <StaggerItem as="li" key={i}><AlertCircle size={18} />{t}</StaggerItem>)}</ul></Stagger>
          </div>}
        </div>
      </div>
    </Reveal>
  );
}

// Foto de portal pode ser bloqueada fora do site de origem: se falhar, mostra o marcador "sem foto"
function FotoAmostra({ url, n }) {
  const [falhou, setFalhou] = useState(false);
  if (!url || falhou) return <span className="sem"><ImageOff size={30} /></span>;
  return <img src={url} alt={`Amostra ${n}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />;
}

export function Comparativos({ av, comps, endereco }) {
  if (!comps.length) return null;
  const tipo = av.evaluation_type;
  const temMapa = comps.some((c) => c.latitude != null) || av.property_latitude != null;
  return (
    <Reveal className="pub-sec clara">
      <div className="pub-in">
        <h2 className="pub-titulo">Comparativos de mercado</h2>
        <p className="pub-lead">Imóveis semelhantes {tipo === "aluguel" ? "anunciados para locação" : "à venda"} na região, usados como referência de preço.</p>
        <Stagger className="comps-grade">
          {comps.map((c, i) => {
            const m2 = precoM2(c.price, c.area);
            const foto = c.thumbnail_url || c.facade_url;
            return (
              <StaggerItem key={c.id || i} className="comp-card">
                <div className="comp-foto">
                  <FotoAmostra url={foto} n={i + 1} />
                  <span className="n">{i + 1}</span>
                  {c.source_name && <span className="portal">{c.source_name}</span>}
                </div>
                <div className="comp-corpo">
                  {c.address && <div className="end">{c.address}</div>}
                  <div className="comp-precos"><b>{brl(c.price)}{tipo === "aluguel" ? "/mês" : ""}</b><span>{fmtM2(m2, tipo)}</span></div>
                  <div className="comp-atributos">
                    {c.area && <span><Ruler size={14} /> {num(c.area)} m²</span>}
                    {c.bedrooms != null && <span><BedDouble size={14} /> {c.bedrooms} {c.bedrooms === 1 ? "quarto" : "quartos"}</span>}
                    {c.suites != null && c.suites > 0 && <span><Sparkles size={14} /> {c.suites} {c.suites === 1 ? "suíte" : "suítes"}</span>}
                    {c.parking != null && <span><Car size={14} /> {c.parking} {c.parking === 1 ? "vaga" : "vagas"}</span>}
                  </div>
                  {c.broker_observations && <div className="comp-obs">{c.broker_observations}</div>}
                  {c.source_url && <a className="comp-link" href={c.source_url} target="_blank" rel="noopener noreferrer nofollow">Ver anúncio original <ExternalLink size={14} /></a>}
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>

        <div className="bloco-grafico">
          <h3>Preço por m² das amostras</h3>
          <p>Cada barra é uma amostra; a barra dourada mostra o valor sugerido para o seu imóvel na mesma base.</p>
          <Suspense fallback={<EsperaGrafico h={320} />}>
            <PriceM2Chart comparativos={comps} tipo={tipo}
              alvo={av.suggested_value && av.property_area ? { preco: av.suggested_value, area: av.property_area, endereco } : null} />
          </Suspense>
        </div>

        {temMapa && (
          <div className="bloco-grafico">
            <h3>Onde estão as amostras</h3>
            <p>Pinos verdes numerados: amostras. Pino dourado: o seu imóvel.</p>
            <div className="mapa-pub">
              <LazyMap comparativos={comps} tipo={tipo} altura="100%"
                alvo={av.property_latitude != null ? { latitude: av.property_latitude, longitude: av.property_longitude, endereco } : null} />
            </div>
          </div>
        )}
      </div>
    </Reveal>
  );
}

export function Vendidas({ av, vendidas }) {
  if (!vendidas.length) return null;
  const aluguel = av.evaluation_type === "aluguel";
  return (
    <Reveal className="pub-sec branca">
      <div className="pub-in">
        <h2 className="pub-titulo">{aluguel ? "Imóveis já alugados" : "Imóveis já vendidos"} na região</h2>
        <p className="pub-lead">Negócios concluídos: o preço que o mercado de fato aceitou, não só o que foi anunciado.</p>
        <Stagger className="vend-grade">
          {vendidas.map((v, i) => (
            <StaggerItem as="figure" key={i} className="vend-item">
              <div className="img"><img src={v.image_url} alt={v.caption || "Imóvel negociado"} loading="lazy" /><span className="selo">{aluguel ? "ALUGADO" : "VENDIDO"}</span></div>
              {v.caption && <figcaption>{v.caption}</figcaption>}
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Reveal>
  );
}

// Só aparece com dados reais agregados da base Acontece (tabela mercado_referencia).
// Sem dados, a seção inteira some — nunca exibe número fictício.
export function InteligenciaMercado({ mercado, av, fundo = "clara" }) {
  const bairros = mercado?.bairros || [], tipos = mercado?.tipos || [];
  if (!bairros.length && !tipos.length) return null;
  const aluguel = av.evaluation_type === "aluguel";
  return (
    <Reveal className={`pub-sec ${fundo}`}>
      <div className="pub-in">
        <h2 className="pub-titulo">Inteligência de mercado</h2>
        <p className="pub-lead">
          Números da carteira administrada pela Acontece em Brasília, {aluguel ? "com aluguéis efetivamente contratados" : "na mesma finalidade deste estudo"}.
          Só entram bairros e tipos com volume suficiente para não identificar nenhum imóvel.
        </p>
        <div className="mercado-grade">
          {bairros.length > 0 && (
            <div className="bloco-grafico" style={{ marginTop: 0 }}>
              <h3>Bairros com maior valor por m²</h3>
              <p>{aluguel ? "Aluguel médio por m² ao mês." : "Valor médio por m²."}{av.property_neighborhood ? " Em dourado, o bairro do seu imóvel." : ""}</p>
              <Suspense fallback={<EsperaGrafico h={300} />}>
                <BairrosChart bairros={bairros} tipo={av.evaluation_type} destaque={av.property_neighborhood} />
              </Suspense>
            </div>
          )}
          {tipos.length > 0 && (
            <div className="bloco-grafico" style={{ marginTop: 0 }}>
              <h3>Distribuição por tipo de imóvel</h3>
              <p>Participação de cada tipo na base de referência.</p>
              <Suspense fallback={<EsperaGrafico h={280} />}><TiposPieChart tipos={tipos} /></Suspense>
            </div>
          )}
        </div>
        <p className="nota-fonte">Fonte: base de imóveis administrados pela Acontece, dados agregados e anonimizados.</p>
      </div>
    </Reveal>
  );
}

export function EducacaoMercado({ av }) {
  const aluguel = av.evaluation_type === "aluguel";
  const fotos = EMPRESA.fotoAmadora && EMPRESA.fotoProfissional;
  return (
    <Reveal className="pub-sec edu">
      <div className="pub-in">
        <h2 className="pub-titulo">Como o mercado funciona</h2>
        <p className="pub-lead">Quatro fatores que decidem se um imóvel {aluguel ? "aluga" : "vende"} rápido e pelo melhor valor.</p>
        <Stagger className="edu-grade">
          <StaggerItem className="edu-card">
            <h3>O preço certo desde o primeiro dia</h3>
            <p>Os interessados mais qualificados aparecem nas primeiras semanas de anúncio. Preço acima do mercado afasta justamente esse público, e reduzir depois costuma sair mais caro do que começar certo.</p>
          </StaggerItem>
          <StaggerItem className="edu-card">
            <h3>Anunciar em vários portais</h3>
            <p>Cada portal tem um público diferente. Estar em ZAP, Viva Real, OLX e outros ao mesmo tempo multiplica as visualizações sem custo extra para você.</p>
          </StaggerItem>
          <StaggerItem className="edu-card largo">
            <h3>Quanto mais tempo parado, menos atenção</h3>
            <p>A atratividade de um anúncio é maior no lançamento e cai à medida que ele envelhece nos portais.</p>
            <div style={{ marginTop: 16 }}><Suspense fallback={<EsperaGrafico />}><LiquidityChart claro /></Suspense></div>
            <p className="nota">Curva ilustrativa: dias no mercado × atratividade relativa do anúncio.</p>
          </StaggerItem>
          <StaggerItem className="edu-card largo">
            <h3>Foto profissional faz diferença</h3>
            <p>A foto é o primeiro contato com o imóvel. Luz, enquadramento e arrumação mudam quantas pessoas clicam e quantas pedem visita.</p>
            {fotos && (
              <div className="fotos-lado">
                <figure><img src={`${base}${EMPRESA.fotoAmadora}`} alt="Foto amadora" loading="lazy" /><figcaption>Foto amadora</figcaption></figure>
                <figure><img src={`${base}${EMPRESA.fotoProfissional}`} alt="Foto profissional" loading="lazy" /><figcaption>Foto profissional</figcaption></figure>
              </div>
            )}
          </StaggerItem>
        </Stagger>
      </div>
    </Reveal>
  );
}

export function ValorSugerido({ av, corretor }) {
  const aluguel = av.evaluation_type === "aluguel";
  const m2 = precoM2(av.suggested_value, av.property_area);
  return (
    <Reveal className="pub-sec branca">
      <div className="pub-in">
        {av.suggested_value ? (
          <div className="valor-bloco">
            <div className="valor-rotulo">{aluguel ? "Aluguel mensal sugerido" : "Valor de venda sugerido"}</div>
            <div className="valor-numero"><AnimatedCounter valor={Number(av.suggested_value)} prefixo="R$ " /></div>
            {m2 && <div className="valor-m2">{fmtM2(m2, av.evaluation_type)}</div>}
            {av.suggested_value_description && <div className="valor-texto">{av.suggested_value_description}</div>}
          </div>
        ) : (
          <div className="valor-bloco"><div className="valor-rotulo">O valor sugerido será apresentado pelo seu corretor.</div></div>
        )}
        {av.ai_strategy && (
          <div className="valor-notas">
            <h3>Estratégia {aluguel ? "de locação" : "de venda"} recomendada</h3>
            {av.ai_strategy.split(/\n\s*\n/).filter((p) => p.trim()).map((p, i) => <p key={i}>{p.trim()}</p>)}
          </div>
        )}
        {av.final_notes && <div className="valor-notas"><h3>Considerações finais</h3><p>{av.final_notes}</p></div>}
        <p className="metodologia">
          <b>Metodologia.</b> Este estudo utiliza o método comparativo direto de dados de mercado: o valor é estimado a partir de imóveis
          semelhantes ofertados ou negociados na mesma região, com base nos princípios da ABNT NBR 14653-2. Trata-se de um parecer
          de mercado elaborado por corretor de imóveis para orientar a precificação e não constitui laudo técnico de avaliação nos termos
          da norma. Valores de anúncio podem diferir dos valores efetivamente negociados. Estudo válido para a data de emissão.
          {corretor?.cnai_number ? ` Responsável: corretor inscrito no CNAI nº ${corretor.cnai_number}.` : ""}
        </p>
      </div>
    </Reveal>
  );
}

export function CartaoCorretor({ corretor, endereco, sozinho = false }) {
  if (!corretor) return null;
  const iniciais = (corretor.name || "").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
  const primeiroNome = (corretor.name || "").split(" ")[0];
  const msg = `Olá${primeiroNome ? `, ${primeiroNome}` : ""}! Vi o estudo de valor do imóvel${endereco ? ` em ${endereco}` : ""} e gostaria de conversar.`;
  const wa = linkWhatsApp(corretor.phone, msg);
  const conteudo = (
    <div className="cartao">
      {corretor.photo_url ? <img className="foto" src={corretor.photo_url} alt={corretor.name} /> : <span className="sem-foto">{iniciais}</span>}
      <div>
        <h3>{corretor.name}</h3>
        <div className="regs">
          {corretor.creci_number && <span className="credencial">CRECI {corretor.creci_number}</span>}
          {corretor.cnai_number && <span className="credencial">CNAI {corretor.cnai_number}</span>}
        </div>
        {corretor.phone && <div className="tel">{corretor.phone}</div>}
      </div>
      {wa && <a className="btn btn-whats" href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} /> Falar no WhatsApp</a>}
    </div>
  );
  if (sozinho) return conteudo;
  return (
    <Reveal className="pub-sec" style={{ paddingTop: 40 }}>
      <div className="pub-in">
        <h2 className="pub-titulo" style={{ textAlign: "center", margin: "0 auto 28px" }}>Vamos conversar?</h2>
        {conteudo}
      </div>
    </Reveal>
  );
}
