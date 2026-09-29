import React, { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Campo, InputNumero } from "../ui";
import { buscarCep, buscarRuas, geocodificar } from "../../lib/enderecos";
import { fmtCep, onlyDigits, TIPOS_IMOVEL, montarEndereco } from "../../lib/format";
import LazyMap from "../LazyMap";
import { TipoLaudo, DadosCadastrais } from "./DadosLaudo";

export default function TabImovel({ f, set, setVarios }) {
  const [cepStatus, setCepStatus] = useState("");
  const [ruas, setRuas] = useState([]);
  const [abrirRuas, setAbrirRuas] = useState(false);
  const [geo, setGeo] = useState("");
  const tRua = useRef();

  async function aoMudarCep(v) {
    set("property_cep", fmtCep(v));
    if (onlyDigits(v).length !== 8) { setCepStatus(""); return; }
    setCepStatus("buscando");
    try {
      const r = await buscarCep(v);
      if (!r) { setCepStatus("nao"); return; }
      setVarios({
        property_street: r.street || f.property_street,
        property_neighborhood: r.neighborhood || f.property_neighborhood,
        property_city: r.city || f.property_city,
        property_state: r.state || f.property_state,
        property_complement: f.property_complement || r.complement || "",
      });
      setCepStatus("ok");
    } catch { setCepStatus("erro"); }
  }

  function aoDigitarRua(v) {
    set("property_street", v);
    clearTimeout(tRua.current);
    tRua.current = setTimeout(async () => {
      try {
        const lista = await buscarRuas(f.property_state || "DF", f.property_city || "Brasília", v);
        setRuas(lista); setAbrirRuas(lista.length > 0);
      } catch { setRuas([]); }
    }, 450);
  }
  useEffect(() => () => clearTimeout(tRua.current), []);

  function escolherRua(r) {
    setVarios({ property_street: r.logradouro, property_neighborhood: r.bairro || f.property_neighborhood,
      property_cep: r.cep, property_city: r.localidade, property_state: r.uf });
    setAbrirRuas(false);
  }

  async function localizar() {
    setGeo("buscando");
    const r = await geocodificar({ street: f.property_street, number: f.property_number, neighborhood: f.property_neighborhood,
      city: f.property_city, state: f.property_state, cep: f.property_cep });
    if (r) { setVarios({ property_latitude: r.lat, property_longitude: r.lng }); setGeo("ok"); }
    else setGeo("nao");
  }

  const temCoord = f.property_latitude != null && f.property_longitude != null;

  return (
    <>
      <TipoLaudo f={f} set={set} />
      <section className="painel">
        <h2>Cliente e finalidade</h2>
        <p className="dica">O nome do cliente e o título aparecem na capa da apresentação.</p>
        <div className="grade g2">
          <Campo rotulo="Nome do cliente"><input className="input" value={f.client_name || ""} onChange={(e) => set("client_name", e.target.value)} /></Campo>
          <div className="campo">
            <span>Finalidade</span>
            <div className="segmentado" role="radiogroup" aria-label="Finalidade">
              {[["venda", "Venda"], ["aluguel", "Aluguel"]].map(([v, r]) => (
                <label key={v}><input type="radio" name="finalidade" checked={f.evaluation_type === v}
                  onChange={() => setVarios({ evaluation_type: v, title: v === "aluguel" ? "Estudo de Valor de Locação" : "Estudo de Valor de Mercado" })} /><span>{r}</span></label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="painel">
        <h2>Endereço</h2>
        <p className="dica">Em Brasília, comece pelo CEP: ele costuma trazer a quadra completa.</p>
        <div className="grade g4">
          <Campo rotulo="CEP" dica={{ buscando: "Buscando…", ok: "Endereço preenchido", nao: "CEP não encontrado", erro: "Serviço de CEP indisponível" }[cepStatus]}>
            <input className="input num" inputMode="numeric" value={f.property_cep || ""} onChange={(e) => aoMudarCep(e.target.value)} placeholder="70000-000" />
          </Campo>
          <Campo rotulo="Rua / quadra" className="span2" style={{ position: "relative" }}>
            <input className="input" value={f.property_street || ""} onChange={(e) => aoDigitarRua(e.target.value)}
              onBlur={() => setTimeout(() => setAbrirRuas(false), 150)} onFocus={() => ruas.length && setAbrirRuas(true)} autoComplete="off" />
            {abrirRuas && (
              <div className="sugestoes" role="listbox">
                {ruas.map((r) => (
                  <button type="button" key={r.cep} onMouseDown={(e) => e.preventDefault()} onClick={() => escolherRua(r)}>
                    {r.logradouro}<small>{[r.bairro, r.complemento, r.cep].filter(Boolean).join(" · ")}</small>
                  </button>
                ))}
              </div>
            )}
          </Campo>
          <Campo rotulo="Número / bloco"><input className="input" value={f.property_number || ""} onChange={(e) => set("property_number", e.target.value)} /></Campo>
          <Campo rotulo="Complemento"><input className="input" value={f.property_complement || ""} onChange={(e) => set("property_complement", e.target.value)} placeholder="Apto 302" /></Campo>
          <Campo rotulo="Bairro / setor"><input className="input" value={f.property_neighborhood || ""} onChange={(e) => set("property_neighborhood", e.target.value)} /></Campo>
          <Campo rotulo="Cidade"><input className="input" value={f.property_city || ""} onChange={(e) => set("property_city", e.target.value)} /></Campo>
          <Campo rotulo="UF"><input className="input" maxLength={2} value={f.property_state || ""} onChange={(e) => set("property_state", e.target.value.toUpperCase())} /></Campo>
          <Campo rotulo="Condomínio / edifício" className="span2"><input className="input" value={f.property_condo_name || ""} onChange={(e) => set("property_condo_name", e.target.value)} /></Campo>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <button type="button" className="btn btn-sec btn-sm" onClick={localizar} disabled={geo === "buscando"}>
              <Search size={15} /> {geo === "buscando" ? "Localizando…" : temCoord ? "Localizar de novo" : "Localizar no mapa"}
            </button>
            {!temCoord && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setVarios({ property_latitude: -15.7939, property_longitude: -47.8828 })}>
                <MapPin size={15} /> Marcar manualmente
              </button>
            )}
            <span className="dica">
              {geo === "nao" ? "Endereço não localizado automaticamente. Use “Marcar manualmente” e arraste o pino dourado até o imóvel." :
                temCoord ? <><MapPin size={12} style={{ verticalAlign: "-1px" }} /> <span className="num">{Number(f.property_latitude).toFixed(5)}, {Number(f.property_longitude).toFixed(5)}</span> · arraste o pino dourado para ajustar</> :
                "A posição do imóvel aparece no mapa da apresentação."}
            </span>
          </div>
          {temCoord && (
            <div className="mapa-editor">
              <LazyMap alvo={{ latitude: f.property_latitude, longitude: f.property_longitude, endereco: montarEndereco(f) }}
                onMoverAlvo={(lat, lng) => setVarios({ property_latitude: lat, property_longitude: lng })} altura="320px" />
            </div>
          )}
        </div>
      </section>

      <section className="painel">
        <h2>Características</h2>
        <p className="dica">A área é a base do cálculo de preço por m².</p>
        <div className="grade g4">
          <Campo rotulo="Tipo do imóvel" className="span2">
            <select className="select" value={f.property_type} onChange={(e) => set("property_type", e.target.value)}>
              {TIPOS_IMOVEL.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Área privativa (m²)" className="span2"><InputNumero decimal valor={f.property_area} onChange={(v) => set("property_area", v)} /></Campo>
        </div>
        <div className="grade g6" style={{ marginTop: 16 }}>
          <Campo rotulo="Quartos"><InputNumero valor={f.property_bedrooms} onChange={(v) => set("property_bedrooms", v)} /></Campo>
          <Campo rotulo="Suítes"><InputNumero valor={f.property_suites} onChange={(v) => set("property_suites", v)} /></Campo>
          <Campo rotulo="Banheiros"><InputNumero valor={f.property_bathrooms} onChange={(v) => set("property_bathrooms", v)} /></Campo>
          <Campo rotulo="Vagas"><InputNumero valor={f.property_parking} onChange={(v) => set("property_parking", v)} /></Campo>
          <Campo rotulo="Andar"><InputNumero valor={f.property_floor} onChange={(v) => set("property_floor", v)} /></Campo>
          <Campo rotulo="Elevador">
            <select className="select" value={f.property_elevator == null ? "" : String(f.property_elevator)}
              onChange={(e) => set("property_elevator", e.target.value === "" ? null : e.target.value === "true")}>
              <option value="">—</option><option value="true">Sim</option><option value="false">Não</option>
            </select>
          </Campo>
        </div>
        <Campo rotulo="Descrição do imóvel" style={{ marginTop: 16 }} dica="Acabamentos, estado de conservação, lazer do condomínio… Aparece na seção “O imóvel”.">
          <textarea className="textarea" value={f.property_description || ""} onChange={(e) => set("property_description", e.target.value)} />
        </Campo>
      </section>
      <DadosCadastrais f={f} set={set} />
    </>
  );
}
