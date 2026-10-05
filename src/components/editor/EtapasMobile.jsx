import React, { useMemo, useState } from "react";
import { ChevronDown, CheckCircle2, Circle, CircleDot, X } from "lucide-react";
import { homogeneizar } from "../../lib/homogeneizacao";

// Status de cada etapa: "ok" (pronto), "parcial" (começado) ou null (vazio). Opcionais não pesam no progresso.
export function statusEtapas(f, comps) {
  const fotos = (f.inspection?.ambientes || []).reduce((s, a) => s + (a.fotos?.length || 0), 0);
  const validas = comps.filter((c) => c.price > 0 && c.area > 0).length;
  const h = f.homogenization || {};
  const hom = validas >= 3 ? homogeneizar({ area: f.property_area, vagas: f.property_parking, quartos: f.property_bedrooms }, comps, h.ajustes || {}, h.config || {}).estatistica : null;
  const ptam = f.report_type === "ptam";
  return {
    imovel: f.property_street && f.property_area > 0 ? "ok" : f.property_street || f.property_area ? "parcial" : null,
    ficha: f.registry_sheet || f.property_sheet || f.tax_sheet ? "ok" : null,
    vistoria: f.inspection?.data && fotos > 0 ? "ok" : f.inspection?.data || fotos ? "parcial" : null,
    percepcoes: (f.advantages?.length || 0) + (f.concerns?.length || 0) > 0 ? "ok" : null,
    comparativos: validas >= 3 ? "ok" : comps.length ? "parcial" : null,
    fatores: hom ? "ok" : null,
    mercado: f.portal_study ? "ok" : null,
    valor: f.market_value > 0 && f.suggested_value > 0 ? "ok" : f.market_value > 0 || f.suggested_value > 0 ? "parcial" : null,
    laudo: null,
    _opcionais: ptam ? ["percepcoes", "mercado", "laudo"] : ["ficha", "vistoria", "percepcoes", "fatores", "mercado", "laudo"],
  };
}

const Icone = ({ st }) => (st === "ok" ? <CheckCircle2 size={18} className="et-ok" /> : st === "parcial" ? <CircleDot size={18} className="et-parcial" /> : <Circle size={18} className="et-vazio" />);

export default function EtapasMobile({ abas, aba, setAba, f, comps }) {
  const [aberto, setAberto] = useState(false);
  const st = useMemo(() => statusEtapas(f, comps), [f, comps]);
  const i = abas.findIndex(([k]) => k === aba);
  const obrig = abas.filter(([k]) => k !== "laudo" && !st._opcionais.includes(k));
  const prontas = obrig.filter(([k]) => st[k] === "ok").length;
  return (
    <>
      <button type="button" className="etapas-mobile" onClick={() => setAberto(true)} aria-haspopup="dialog">
        <span className="et-num">{i + 1}/{abas.length}</span>
        <span className="et-nome">{abas[i]?.[1]}</span>
        <span className="et-prog" aria-label={`${prontas} de ${obrig.length} etapas essenciais prontas`}>{prontas}/{obrig.length}</span>
        <ChevronDown size={18} />
        <span className="et-barra"><i style={{ width: `${(prontas / Math.max(1, obrig.length)) * 100}%` }} /></span>
      </button>
      {aberto && (
        <div className="folha-fundo" onClick={() => setAberto(false)}>
          <div className="folha" role="dialog" aria-label="Etapas da avaliação" onClick={(e) => e.stopPropagation()}>
            <div className="folha-topo"><b>Etapas da avaliação</b><button type="button" className="btn btn-ghost btn-icone" onClick={() => setAberto(false)} aria-label="Fechar"><X size={20} /></button></div>
            <p className="dica" style={{ margin: "0 0 8px" }}>{prontas} de {obrig.length} etapas essenciais prontas{f.report_type === "ptam" ? " para o PTAM" : ""}.</p>
            {abas.map(([k, r], n) => (
              <button key={k} type="button" className={`folha-item ${k === aba ? "atual" : ""}`} onClick={() => { setAba(k); setAberto(false); window.scrollTo({ top: 0 }); }}>
                <Icone st={st[k]} />
                <span>{n + 1}. {r}</span>
                {st._opcionais.includes(k) && k !== "laudo" && <small>opcional</small>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
