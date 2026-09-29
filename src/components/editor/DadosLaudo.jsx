import React, { useEffect, useState } from "react";
import { FileCheck2, BadgeCheck, Lock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Campo, InputMoeda, InputNumero, Modal } from "../ui";
import { brl, num } from "../../lib/format";
import { ListaDinamica } from "./TabPercepcoes";

export const TIPOS_LAUDO = [
  ["cliente", "Cliente da carteira", "Uma página, direto ao ponto. Dados puxados da ficha do Imobiliar."],
  ["completo", "Avaliação completa", "Capa, apresentação da Acontece, tabela de amostras e estratégia. Para quem ainda não é cliente."],
  ["ptam", "PTAM", "Parecer Técnico de Avaliação Mercadológica, com homogeneização das amostras. Exige CNAI."],
];

const ROTULOS = {
  property_code: "Código no Imobiliar", property_type: "Tipo", property_street: "Endereço", property_complement: "Complemento",
  property_neighborhood: "Bairro", property_city: "Cidade", property_state: "UF", property_cep: "CEP",
  property_condo_name: "Condomínio / edifício", property_area: "Área privativa (m²)", area_total: "Área total (m²)",
  property_bedrooms: "Quartos", property_parking: "Vagas", property_floor: "Andar", occupancy: "Ocupação", current_rent: "Aluguel atual",
  condo_fee: "Condomínio (R$)", iptu_value: "IPTU (parcela)", iptu_registration: "Inscrição do IPTU",
  registry_number: "Matrícula", features: "Características",
};
const OCUPACAO = { desocupado: "Desocupado", alugado: "Alugado", proprietario: "Ocupado pelo proprietário" };
const MOEDA = new Set(["current_rent", "condo_fee", "iptu_value"]);
const mostrar = (k, v) => (k === "features" ? `${v.length} itens` : k === "occupancy" ? OCUPACAO[v] : MOEDA.has(k) ? brl(v) : typeof v === "number" ? num(v) : v);

// ------------------------------------------------------------ tipo de laudo
export function TipoLaudo({ f, set }) {
  const [cnai, setCnai] = useState(null);
  useEffect(() => {
    supabase.from("public_broker_profiles").select("cnai_number").eq("user_id", f.broker_id).maybeSingle()
      .then(({ data }) => setCnai((data?.cnai_number || "").trim()));
  }, [f.broker_id]);
  const tipo = f.report_type || "completo";
  return (
    <section className="painel">
      <h2>Tipo de laudo</h2>
      <p className="dica">Define os campos pedidos e o documento gerado. Dá para trocar a qualquer momento.</p>
      <div className="cartoes-laudo" role="radiogroup" aria-label="Tipo de laudo">
        {TIPOS_LAUDO.map(([v, nome, desc]) => {
          const bloqueado = v === "ptam" && cnai !== null && !cnai;
          return (
            <label key={v} className={`cartao-laudo ${tipo === v ? "ativo" : ""} ${bloqueado ? "bloqueado" : ""}`}>
              <input type="radio" name="tipo-laudo" checked={tipo === v} disabled={bloqueado} onChange={() => set("report_type", v)} />
              <b>{v === "ptam" && (bloqueado ? <Lock size={14} /> : <BadgeCheck size={15} />)} {nome}</b>
              <span>{bloqueado ? "Disponível para corretor com CNAI. Preencha o número em Meu perfil." : desc}</span>
            </label>
          );
        })}
      </div>
      {tipo === "ptam" && (
        <p className="aviso aviso-ambar" style={{ marginTop: 12 }}>
          A homogeneização das amostras e o checklist do PTAM chegam na próxima etapa. Por enquanto, preencha normalmente os dados do imóvel e as amostras.
        </p>
      )}
    </section>
  );
}

// ------------------------------------------------------------ aplicar a ficha ao imóvel
// Mostra "na ficha × atual" antes de preencher os campos da avaliação.
export function ModalAplicarFicha({ f, dados, onAplicar, onFechar }) {
  const [marcarCliente, setMarcarCliente] = useState(f.report_type !== "ptam");
  const linhas = Object.entries(dados);
  return (
    <Modal titulo="Aplicar a ficha ao imóvel" onFechar={onFechar} largo>
      <p className="dica" style={{ marginTop: 4 }}>Estes campos da avaliação serão preenchidos com os dados da ficha. As características são somadas às que já existem.</p>
      <div className="selecao-lista" style={{ maxHeight: "48vh" }}>
        <table className="tabela">
          <thead><tr><th>Campo</th><th>Na ficha</th><th>Atual</th></tr></thead>
          <tbody>
            {linhas.map(([k, v]) => (
              <tr key={k} className="sel">
                <td>{ROTULOS[k] || k}</td>
                <td><b>{mostrar(k, v)}</b>{k === "features" && <small className="dica" style={{ display: "block" }}>{v.join(" · ")}</small>}</td>
                <td className="dica">{f[k] == null || f[k] === "" || (Array.isArray(f[k]) && !f[k].length) ? "—" : mostrar(k, f[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {f.report_type !== "ptam" && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <input type="checkbox" checked={marcarCliente} onChange={(e) => setMarcarCliente(e.target.checked)} />
          <span>Usar o laudo de <b>cliente da carteira</b></span>
        </label>
      )}
      <div className="rodape-modal">
        <button className="btn btn-sec" onClick={onFechar}>Agora não</button>
        <button className="btn" onClick={() => {
          const novo = { ...dados };
          if (dados.features) novo.features = [...new Set([...(f.features || []), ...dados.features])];
          if (marcarCliente && f.report_type !== "ptam") novo.report_type = "cliente";
          onAplicar(novo);
        }}><FileCheck2 size={16} /> Aplicar ao imóvel</button>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------ dados cadastrais e ocupação
export function DadosCadastrais({ f, set }) {
  const aluguelFinal = f.evaluation_type === "aluguel";
  return (
    <section className="painel">
      <h2>Dados do laudo</h2>
      <p className="dica">Aparecem no documento. Na avaliação completa e no PTAM, o interessado e a finalidade vão para a capa. Para imóvel da carteira, importe a ficha na aba <b>Ficha Imobiliar</b> e estes campos se preenchem sozinhos.</p>
      <div className="grade g2">
        <Campo rotulo="Interessado" dica="Ex.: Sra. Dilza e família"><input className="input" value={f.interested_party || ""} onChange={(e) => set("interested_party", e.target.value)} /></Campo>
        <Campo rotulo="Finalidade do laudo">
          <input className="input" list="finalidades" value={f.purpose || ""} placeholder={aluguelFinal ? "Apurar o valor de mercado para locação" : "Apurar o valor de mercado para venda"}
            onChange={(e) => set("purpose", e.target.value)} />
          <datalist id="finalidades">
            {["Apurar o valor de mercado para venda", "Apurar o valor de mercado para locação", "Subsidiar partilha de bens",
              "Subsidiar garantia ou financiamento", "Revisão de aluguel", "Planejamento patrimonial"].map((o) => <option key={o} value={o} />)}
          </datalist>
        </Campo>
      </div>
      <div className="grade g4" style={{ marginTop: 16 }}>
        <Campo rotulo="Código no Imobiliar"><input className="input num" value={f.property_code || ""} onChange={(e) => set("property_code", e.target.value)} /></Campo>
        <Campo rotulo="Área total (m²)" dica="Privativa fica em Características."><InputNumero decimal valor={f.area_total} onChange={(v) => set("area_total", v)} /></Campo>
        <Campo rotulo="Condomínio (R$/mês)"><InputMoeda centavos valor={f.condo_fee} onChange={(v) => set("condo_fee", v)} /></Campo>
        <Campo rotulo="IPTU (parcela)"><InputMoeda centavos valor={f.iptu_value} onChange={(v) => set("iptu_value", v)} /></Campo>
        <Campo rotulo="Inscrição do IPTU"><input className="input num" value={f.iptu_registration || ""} onChange={(e) => set("iptu_registration", e.target.value)} /></Campo>
        <Campo rotulo="Matrícula (cartório)"><input className="input num" value={f.registry_number || ""} onChange={(e) => set("registry_number", e.target.value)} /></Campo>
      </div>
      <div className="grade g2" style={{ marginTop: 16, alignItems: "end" }}>
        <div className="campo">
          <span>Ocupação</span>
          <div className="segmentado" role="radiogroup" aria-label="Ocupação">
            {Object.entries(OCUPACAO).map(([v, r]) => (
              <label key={v}><input type="radio" name="ocupacao" checked={f.occupancy === v} onChange={() => set("occupancy", v)} /><span>{r}</span></label>
            ))}
          </div>
        </div>
        {f.occupancy === "alugado" && (
          <Campo rotulo="Aluguel atual (renda mensal)" dica="No laudo aparece como rentabilidade atual do imóvel.">
            <InputMoeda centavos valor={f.current_rent} onChange={(v) => set("current_rent", v)} />
          </Campo>
        )}
      </div>
      <div style={{ marginTop: 18 }}>
        <ListaDinamica titulo="Características do imóvel" cor="var(--dourado)"
          dica="Itens da ficha e o que mais valer destacar. A IA usa esta lista para redigir a descrição do laudo."
          itens={f.features || []} onChange={(v) => set("features", v)} sugestoes={[]} embutida />
      </div>
    </section>
  );
}
