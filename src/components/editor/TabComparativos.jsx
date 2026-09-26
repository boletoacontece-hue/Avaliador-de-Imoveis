import React, { useRef, useState } from "react";
import { Plus, FileJson, GripVertical, Trash2, Search, ExternalLink } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Campo, InputMoeda, InputNumero, InputCoord, Modal } from "../ui";
import FotoSlot from "./FotoSlot";
import LazyMap from "../LazyMap";
import { lerComparativos } from "./importarJson";
import { geocodificar } from "../../lib/enderecos";
import { brl, fmtM2, precoM2, mediana, montarEndereco } from "../../lib/format";

const PORTAIS = ["DFImóveis", "ZAP Imóveis", "Viva Real", "OLX", "Chaves na Mão", "Imovelweb", "Wimóveis", "Site de imobiliária", "Indicação"];

function CardComparativo({ c, n, tipo, cidade, uf, onAlterar, onFoto, onRemoverFoto, onExcluir }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const [geo, setGeo] = useState("");
  const m2 = precoM2(c.price, c.area);
  const set = (k) => (v) => onAlterar(c.id, { [k]: v });
  const setTxt = (k) => (e) => onAlterar(c.id, { [k]: e.target.value });

  async function localizar() {
    if (!c.address) { setGeo("sem"); return; }
    setGeo("buscando");
    const r = await geocodificar({ texto: [c.address, cidade, uf].filter(Boolean).join(", ") });
    if (r) { onAlterar(c.id, { latitude: r.lat, longitude: r.lng }); setGeo(""); } else setGeo("nao");
  }

  return (
    <div ref={setNodeRef} className={`comp ${isDragging ? "arrastando" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: "relative" }}>
      <button type="button" className="alca" {...attributes} {...listeners} aria-label={`Reordenar amostra ${n}`}><GripVertical size={20} /></button>
      <div className="comp-fotos">
        <FotoSlot url={c.thumbnail_url} rotulo="Foto" onEnviar={(f) => onFoto(c.id, "thumbnail_url", f)} onRemover={() => onRemoverFoto(c.id, "thumbnail_url")} />
        <FotoSlot url={c.facade_url} rotulo="Fachada" onEnviar={(f) => onFoto(c.id, "facade_url", f)} onRemover={() => onRemoverFoto(c.id, "facade_url")} />
      </div>
      <div>
        <div className="comp-topo">
          <span className="indice">Amostra {n}</span>
          <span className="m2">{m2 ? fmtM2(m2, tipo) : ""}</span>
        </div>
        <div className="grade g4">
          <Campo rotulo="Endereço" className="span-all"><input className="input" value={c.address || ""} onChange={setTxt("address")} /></Campo>
          <Campo rotulo={tipo === "aluguel" ? "Aluguel (R$/mês)" : "Preço (R$)"}><InputMoeda valor={c.price} onChange={set("price")} className="input num" /></Campo>
          <Campo rotulo="Área (m²)"><InputNumero decimal valor={c.area} onChange={set("area")} /></Campo>
          <Campo rotulo="Quartos"><InputNumero valor={c.bedrooms} onChange={set("bedrooms")} /></Campo>
          <Campo rotulo="Suítes"><InputNumero valor={c.suites} onChange={set("suites")} /></Campo>
          <Campo rotulo="Vagas"><InputNumero valor={c.parking} onChange={set("parking")} /></Campo>
          <Campo rotulo="Portal">
            <input className="input" list="lista-portais" value={c.source_name || ""} onChange={setTxt("source_name")} />
          </Campo>
          <Campo rotulo="Link do anúncio" className="span2">
            <div style={{ display: "flex", gap: 6 }}>
              <input className="input" type="url" value={c.source_url || ""} onChange={setTxt("source_url")} placeholder="https://" />
              {c.source_url && <a className="btn btn-sec btn-icone" href={c.source_url} target="_blank" rel="noreferrer" aria-label="Abrir anúncio"><ExternalLink size={16} /></a>}
            </div>
          </Campo>
          <Campo rotulo="Latitude"><InputCoord valor={c.latitude} onChange={set("latitude")} placeholder="-15.79" /></Campo>
          <Campo rotulo="Longitude"><InputCoord valor={c.longitude} onChange={set("longitude")} placeholder="-47.88" /></Campo>
          <div className="campo span2" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-sec" onClick={localizar} disabled={geo === "buscando"}>
              <Search size={15} /> {geo === "buscando" ? "Localizando…" : "Localizar pelo endereço"}
            </button>
            {geo === "nao" && <small className="dica">Não localizado. Informe as coordenadas manualmente.</small>}
            {geo === "sem" && <small className="dica">Preencha o endereço primeiro.</small>}
          </div>
          <Campo rotulo="Observações do corretor" className="span-all" dica="Aparece no card da amostra: diferenças em relação ao imóvel avaliado.">
            <textarea className="textarea" style={{ minHeight: 70 }} value={c.broker_observations || ""} onChange={setTxt("broker_observations")} />
          </Campo>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" className="btn btn-perigo btn-sm" onClick={() => onExcluir(c)}><Trash2 size={15} /> Excluir amostra</button>
        </div>
      </div>
    </div>
  );
}

export default function TabComparativos({ f, comps, vendidas, acoes }) {
  const [importacao, setImportacao] = useState(null);
  const [erroImport, setErroImport] = useState("");
  const arquivoJson = useRef(null);
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function aoSoltar({ active, over }) {
    if (!over || active.id === over.id) return;
    const de = comps.findIndex((c) => c.id === active.id), para = comps.findIndex((c) => c.id === over.id);
    acoes.reordenar(arrayMove(comps, de, para));
  }

  async function lerArquivo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErroImport("");
    try { setImportacao(lerComparativos(await file.text(), file.name, comps.map((c) => c.source_url))); }
    catch (err) { setErroImport(err.message); }
  }

  const tipo = f.evaluation_type;

  return (
    <>
      <datalist id="lista-portais">{PORTAIS.map((p) => <option key={p} value={p} />)}</datalist>

      <section className="painel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <h2>Amostras comparativas</h2>
            <p className="dica" style={{ margin: 0 }}>Imóveis semelhantes anunciados na região. Arraste pela alça para mudar a ordem.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sec" onClick={() => arquivoJson.current?.click()}><FileJson size={17} /> Importar JSON/CSV</button>
            <button type="button" className="btn" onClick={acoes.adicionar}><Plus size={17} /> Adicionar amostra</button>
            <input ref={arquivoJson} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={lerArquivo} />
          </div>
        </div>
        {erroImport && <div className="erro-msg" style={{ marginTop: 10 }}>{erroImport}</div>}
      </section>

      {comps.length === 0 ? (
        <div className="vazio" style={{ marginTop: 16 }}>
          <h3>Nenhuma amostra ainda</h3>
          <p>Adicione pelo menos 3 imóveis comparáveis para o gráfico de preço/m² ficar representativo.</p>
          <button type="button" className="btn" onClick={acoes.adicionar}><Plus size={17} /> Adicionar amostra</button>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
            <SortableContext items={comps.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {comps.map((c, i) => (
                <CardComparativo key={c.id} c={c} n={i + 1} tipo={tipo} cidade={f.property_city} uf={f.property_state}
                  onAlterar={acoes.alterar} onFoto={acoes.enviarFoto} onRemoverFoto={acoes.removerFoto} onExcluir={acoes.excluir} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {(comps.some((c) => c.latitude != null && c.longitude != null) || f.property_latitude != null) && (
        <section className="painel" style={{ marginTop: 16 }}>
          <h2>Mapa das amostras</h2>
          <p className="dica">Verde: amostras numeradas. Dourado: imóvel avaliado.</p>
          <div className="mapa-editor" style={{ height: 380 }}>
            <LazyMap comparativos={comps} tipo={tipo}
              alvo={f.property_latitude != null ? { latitude: f.property_latitude, longitude: f.property_longitude, endereco: montarEndereco(f) } : null}
              altura="380px" />
          </div>
        </section>
      )}

      <section className="painel" style={{ marginTop: 16 }}>
        <h2>Imóveis já {tipo === "aluguel" ? "alugados" : "vendidos"} na região</h2>
        <p className="dica">Prints ou fotos de negócios fechados: a prova de mercado mais forte da apresentação.</p>
        <div className="vendidas-grade">
          {vendidas.map((v) => (
            <div key={v.id}>
              <FotoSlot url={v.image_url} rotulo="Print" onEnviar={(file) => acoes.trocarVendida(v.id, file)} />
              <input className="input" style={{ marginTop: 6, fontSize: 13.5 }} placeholder="Legenda (ex.: SQS 308, 3q, R$ 1,4 mi)"
                value={v.caption || ""} onChange={(e) => acoes.legendaVendida(v.id, e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 2, color: "var(--vermelho)" }} onClick={() => acoes.excluirVendida(v)}>
                <Trash2 size={14} /> Remover
              </button>
            </div>
          ))}
          <FotoSlot url={null} rotulo="Adicionar print" onEnviar={acoes.adicionarVendida} />
        </div>
      </section>

      {importacao && (
        <SelecaoImportacao importacao={importacao} tipo={tipo} onFechar={() => setImportacao(null)}
          onImportar={async (itens) => { await acoes.importar(itens); setImportacao(null); }} />
      )}
    </>
  );
}

// Escolha das amostras a importar: o coletor traz dezenas de anúncios, a apresentação usa poucos.
// Repetidos, fora da curva e já existentes vêm desmarcados, com o motivo ao lado.
function SelecaoImportacao({ importacao, tipo, onFechar, onImportar }) {
  const itens = importacao.validos;
  const [marcados, setMarcados] = useState(() => new Set(itens.map((it, i) => (it.alerta ? null : i)).filter((i) => i !== null)));
  const [importando, setImportando] = useState(false);
  const alternar = (i) => setMarcados((m) => { const n = new Set(m); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const escolhidos = [...marcados].sort((a, b) => a - b).map((i) => itens[i]);
  const mdn = mediana(escolhidos.map((c) => precoM2(c.price, c.area)));
  const nAlertas = itens.filter((it) => it.alerta).length;

  return (
    <Modal titulo="Escolher amostras para importar" onFechar={onFechar} largo>
      <p className="dica" style={{ margin: "6px 0 10px" }}>
        <b className="num">{itens.length}</b> anúncios lidos{nAlertas ? <>, <b className="num">{nAlertas}</b> desmarcados para conferência</> : ""}.
        Para a apresentação, fique com as <b>5 a 10</b> mais parecidas com o imóvel avaliado.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <button type="button" className="btn btn-sec btn-sm" onClick={() => setMarcados(new Set(itens.map((it, i) => (it.alerta ? null : i)).filter((i) => i !== null)))}>Marcar os sem alerta</button>
        <button type="button" className="btn btn-sec btn-sm" onClick={() => setMarcados(new Set())}>Desmarcar todos</button>
      </div>
      <div className="selecao-lista">
        <table className="tabela">
          <thead><tr><th /><th>Amostra</th><th className="num">{tipo === "aluguel" ? "Aluguel" : "Preço"}</th><th className="num">Área</th><th className="num">R$/m²</th></tr></thead>
          <tbody>
            {itens.map((it, i) => (
              <tr key={i} className={marcados.has(i) ? "sel" : ""} onClick={() => alternar(i)}>
                <td><input type="checkbox" checked={marcados.has(i)} onChange={() => alternar(i)} onClick={(e) => e.stopPropagation()} aria-label={`Importar ${it.address || `item ${i + 1}`}`} /></td>
                <td>
                  <b>{it.address || "Endereço não informado"}</b>
                  <small className="dica" style={{ display: "block" }}>{it.source_name}{it.source_url && <> · <a href={it.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>ver anúncio</a></>}</small>
                  {it.alerta && <small className="alerta-linha">⚠ {it.alerta}</small>}
                </td>
                <td className="num">{brl(it.price)}</td>
                <td className="num">{it.area ? `${Number(it.area).toLocaleString("pt-BR")} m²` : "—"}</td>
                <td className="num">{fmtM2(precoM2(it.price, it.area), tipo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {importacao.erros.length > 0 && (
        <details className="dica" style={{ marginTop: 10 }}>
          <summary>{importacao.erros.length} itens do arquivo foram ignorados (sem preço ou área)</summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {importacao.erros.map((e) => <li key={e.linha}>Item {e.linha}{e.endereco ? ` (${e.endereco})` : ""}: {e.msg}</li>)}
          </ul>
        </details>
      )}
      <div className="rodape-modal" style={{ alignItems: "center" }}>
        <span className="dica" style={{ marginRight: "auto" }}>
          {escolhidos.length} selecionadas{mdn ? <> · mediana <b className="num">{fmtM2(mdn, tipo)}</b></> : ""}
          {escolhidos.length > 12 && " · muitas amostras deixam a apresentação cansativa"}
        </span>
        <button className="btn btn-sec" onClick={onFechar}>Cancelar</button>
        <button className="btn" disabled={!escolhidos.length || importando}
          onClick={async () => { setImportando(true); await onImportar(escolhidos.map(({ alerta, ...c }) => c)); }}>
          {importando ? "Importando…" : `Importar ${escolhidos.length}`}
        </button>
      </div>
    </Modal>
  );
}
