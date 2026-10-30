"use client";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import type { Resposta, Vista } from "@/lib/questoes/tipos";

const LETRAS = "ABCDEF";
const CORES_PAR = ["bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-fuchsia-500", "bg-rose-500", "bg-lime-600"];

type Props<V extends Vista> = {
  vista: V;
  resposta: Extract<Resposta, { tipo: V["tipo"] }>;
  onChange: (r: Extract<Resposta, { tipo: V["tipo"] }>) => void;
  desabilitada?: boolean;
};

/** Área de resposta de uma questão, igual no desafio e na prévia do professor. */
export function QuestaoInterativa({
  vista,
  resposta,
  onChange,
  desabilitada,
}: {
  vista: Vista;
  resposta: Resposta;
  onChange: (r: Resposta) => void;
  desabilitada?: boolean;
}) {
  if (vista.tipo !== resposta.tipo) return null;
  switch (vista.tipo) {
    case "multipla_escolha":
      return (
        <MultiplaEscolha vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />
      );
    case "vf_bloco":
      return <VfBloco vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />;
    case "linha_do_tempo":
      return (
        <LinhaDoTempo vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />
      );
    case "pares":
      return <Pares vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />;
    case "fonte_primaria":
      return (
        <FontePrimaria vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />
      );
    case "causa_consequencia":
      return (
        <CausaConsequencia vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />
      );
    case "encontrar_erro":
      return (
        <EncontrarErro vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />
      );
    case "completar_lacunas":
      return (
        <CompletarLacunas vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />
      );
    case "ordenar_frases":
      return (
        <Ordenar
          itens={vista.frases}
          ordem={(resposta as Extract<Resposta, { tipo: "ordenar_frases" }>).ordem}
          dica="Arraste ou use as setas até as frases ficarem na ordem certa."
          onOrdem={(ordem) => onChange({ tipo: "ordenar_frases", ordem })}
          desabilitada={desabilitada}
        />
      );
    case "interpretacao":
      return (
        <div className="space-y-3">
          <Documento texto={vista.texto} />
          <MultiplaEscolha vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />
        </div>
      );
    case "quem_disse":
      return (
        <div className="space-y-3">
          <Citacao texto={vista.citacao} />
          <MultiplaEscolha vista={vista} resposta={resposta as never} onChange={onChange} desabilitada={desabilitada} />
        </div>
      );
  }
}

/** Citação em destaque, para "Quem disse?". */
export function Citacao({ texto }: { texto: string }) {
  return (
    <figure className="relative rounded-2xl bg-marca-900 px-5 pt-7 pb-5 text-white shadow">
      <span aria-hidden className="absolute top-0 left-3 font-serif text-6xl leading-none text-amber-400">
        “
      </span>
      <blockquote className="font-serif text-lg leading-snug italic">{texto}</blockquote>
    </figure>
  );
}

/** Trecho de documento ou texto-base, com cara de fonte histórica. */
export function Documento({ texto }: { texto: string }) {
  if (!texto.trim()) return null;
  return (
    <blockquote className="rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 font-serif text-[15px] leading-relaxed whitespace-pre-line text-slate-800">
      {texto}
    </blockquote>
  );
}

function MultiplaEscolha({
  vista,
  resposta,
  onChange,
  desabilitada,
}: Props<Extract<Vista, { tipo: "multipla_escolha" | "interpretacao" | "quem_disse" }>>) {
  return (
    <ul className="space-y-2">
      {vista.alternativas.map((texto, i) => {
        const marcada = resposta.escolha === i;
        return (
          <li key={i}>
            <button
              type="button"
              disabled={desabilitada}
              onClick={() => onChange({ tipo: vista.tipo, escolha: i } as never)}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition ${
                marcada ? "border-marca-600 bg-marca-50" : "border-slate-200 bg-white hover:border-marca-200"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  marcada ? "bg-marca-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {LETRAS[i]}
              </span>
              <span className="pt-0.5">{texto}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function VfBloco({ vista, resposta, onChange, desabilitada }: Props<Extract<Vista, { tipo: "vf_bloco" }>>) {
  const marcar = (i: number, v: boolean) => {
    const valores = [...resposta.valores];
    valores[i] = v;
    onChange({ tipo: "vf_bloco", valores });
  };
  return (
    <ul className="space-y-2">
      {vista.afirmativas.map((texto, i) => (
        <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <span className="flex-1">{texto}</span>
          <div className="flex shrink-0 gap-1">
            {([true, false] as const).map((v) => {
              const ativo = resposta.valores[i] === v;
              return (
                <button
                  key={String(v)}
                  type="button"
                  disabled={desabilitada}
                  onClick={() => marcar(i, v)}
                  aria-pressed={ativo}
                  className={`h-10 w-10 rounded-lg border-2 text-sm font-bold ${
                    ativo
                      ? v
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-red-600 bg-red-600 text-white"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {v ? "V" : "F"}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ItemOrdenavel({
  id,
  texto,
  posicao,
  total,
  mover,
  desabilitada,
}: {
  id: number;
  texto: string;
  posicao: number;
  total: number;
  mover: (de: number, para: number) => void;
  desabilitada?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: desabilitada,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border-2 bg-white p-2 ${isDragging ? "z-10 border-marca-500 shadow-lg" : "border-slate-200"}`}
    >
      <span
        {...attributes}
        {...listeners}
        className="flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg bg-slate-100 text-slate-500"
        aria-label="Arrastar"
      >
        ⋮⋮
      </span>
      <span className="w-6 shrink-0 text-center text-sm font-bold text-marca-700">{posicao + 1}º</span>
      <span className="flex-1">{texto}</span>
      <span className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={desabilitada || posicao === 0}
          onClick={() => mover(posicao, posicao - 1)}
          className="px-2 text-slate-500 disabled:opacity-30"
          aria-label="Subir"
        >
          ▲
        </button>
        <button
          type="button"
          disabled={desabilitada || posicao === total - 1}
          onClick={() => mover(posicao, posicao + 1)}
          className="px-2 text-slate-500 disabled:opacity-30"
          aria-label="Descer"
        >
          ▼
        </button>
      </span>
    </li>
  );
}

function LinhaDoTempo({ vista, resposta, onChange, desabilitada }: Props<Extract<Vista, { tipo: "linha_do_tempo" }>>) {
  return (
    <Ordenar
      itens={vista.eventos}
      ordem={resposta.ordem}
      dica="Do mais antigo (1º) para o mais recente."
      onOrdem={(ordem) => onChange({ tipo: "linha_do_tempo", ordem })}
      desabilitada={desabilitada}
    />
  );
}

function Ordenar({
  itens,
  ordem,
  dica,
  onOrdem,
  desabilitada,
}: {
  itens: string[];
  ordem: number[];
  dica: string;
  onOrdem: (ordem: number[]) => void;
  desabilitada?: boolean;
}) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const mover = (de: number, para: number) => onOrdem(arrayMove(ordem, de, para));
  const aoSoltar = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    mover(ordem.indexOf(Number(active.id)), ordem.indexOf(Number(over.id)));
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">{dica}</p>
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <SortableContext items={ordem} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {ordem.map((exibido, posicao) => (
              <ItemOrdenavel
                key={exibido}
                id={exibido}
                texto={itens[exibido]}
                posicao={posicao}
                total={ordem.length}
                mover={mover}
                desabilitada={desabilitada}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Pares({ vista, resposta, onChange, desabilitada }: Props<Extract<Vista, { tipo: "pares" }>>) {
  const [ativo, setAtivo] = useState<number | null>(0);
  const ligar = (direita: number) => {
    if (ativo === null) return;
    const ligacoes = resposta.ligacoes.map((d) => (d === direita ? null : d));
    ligacoes[ativo] = direita;
    onChange({ tipo: "pares", ligacoes });
    const proximo = ligacoes.findIndex((d, i) => d === null && i !== ativo);
    setAtivo(proximo >= 0 ? proximo : null);
  };
  const esquerdaDe = (direita: number) => resposta.ligacoes.indexOf(direita);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Toque num item da esquerda e depois no par dele à direita.</p>
      <div className="grid grid-cols-2 gap-3">
        <ul className="space-y-2">
          {vista.esquerda.map((texto, i) => {
            const ligado = resposta.ligacoes[i];
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={desabilitada}
                  onClick={() => setAtivo(i)}
                  className={`flex min-h-12 w-full items-center gap-2 rounded-xl border-2 p-2 text-left text-sm ${
                    ativo === i ? "border-marca-600 bg-marca-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${ligado !== null ? CORES_PAR[i % CORES_PAR.length] : "bg-slate-200"}`}
                  />
                  {texto}
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="space-y-2">
          {vista.direita.map((texto, d) => {
            const dono = esquerdaDe(d);
            return (
              <li key={d}>
                <button
                  type="button"
                  disabled={desabilitada || ativo === null}
                  onClick={() => ligar(d)}
                  className="flex min-h-12 w-full items-center gap-2 rounded-xl border-2 border-slate-200 bg-white p-2 text-left text-sm disabled:opacity-100"
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${dono >= 0 ? CORES_PAR[dono % CORES_PAR.length] : "bg-slate-200"}`}
                  />
                  {texto}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function FontePrimaria({ vista, resposta, onChange, desabilitada }: Props<Extract<Vista, { tipo: "fonte_primaria" }>>) {
  const escolher = (j: number, i: number) => {
    const escolhas = [...resposta.escolhas];
    escolhas[j] = i;
    onChange({ tipo: "fonte_primaria", escolhas });
  };
  return (
    <div className="space-y-4">
      <Documento texto={vista.documento} />
      {vista.perguntas.map((p, j) => (
        <fieldset key={j} className="space-y-2">
          <legend className="mb-1 font-medium">
            <span className="mr-1 text-marca-700">{j + 1}.</span>
            {p.pergunta}
          </legend>
          {p.alternativas.map((texto, i) => {
            const marcada = resposta.escolhas[j] === i;
            return (
              <button
                key={i}
                type="button"
                disabled={desabilitada}
                onClick={() => escolher(j, i)}
                aria-pressed={marcada}
                className={`flex w-full items-start gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm transition ${
                  marcada ? "border-marca-600 bg-marca-50" : "border-slate-200 bg-white hover:border-marca-200"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    marcada ? "bg-marca-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {LETRAS[i]}
                </span>
                <span className="pt-0.5">{texto}</span>
              </button>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

function CausaConsequencia({
  vista,
  resposta,
  onChange,
  desabilitada,
}: Props<Extract<Vista, { tipo: "causa_consequencia" }>>) {
  const [aberta, setAberta] = useState<number | null>(0);
  const escolher = (causa: number, consequencia: number) => {
    const ligacoes = resposta.ligacoes.map((c) => (c === consequencia ? null : c));
    ligacoes[causa] = consequencia;
    onChange({ tipo: "causa_consequencia", ligacoes });
    const proxima = ligacoes.findIndex((c, i) => c === null && i !== causa);
    setAberta(proxima >= 0 ? proxima : null);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Toque em cada causa e escolha a consequência dela. Sobra consequência: nem todas se encaixam.
      </p>
      <ol className="space-y-3">
        {vista.causas.map((causa, i) => {
          const escolhida = resposta.ligacoes[i];
          const aberto = aberta === i;
          return (
            <li key={i} className={`rounded-xl border-2 bg-white ${aberto ? "border-marca-500" : "border-slate-200"}`}>
              <button
                type="button"
                disabled={desabilitada}
                onClick={() => setAberta(aberto ? null : i)}
                className="w-full p-3 text-left"
              >
                <span className="text-xs font-bold tracking-wide text-amber-700 uppercase">Causa</span>
                <span className="block">{causa}</span>
                <span className="mt-2 flex items-start gap-2 text-sm">
                  <span className="text-marca-600">↓</span>
                  {escolhida !== null && escolhida !== undefined ? (
                    <span className="flex-1 rounded-lg bg-marca-50 px-2 py-1 text-marca-900">
                      {vista.consequencias[escolhida]}
                    </span>
                  ) : (
                    <span className="flex-1 text-slate-400">Toque para escolher a consequência</span>
                  )}
                </span>
              </button>
              {aberto && (
                <ul className="space-y-1.5 border-t border-slate-100 p-2">
                  {vista.consequencias.map((texto, c) => {
                    const dona = resposta.ligacoes.indexOf(c);
                    return (
                      <li key={c}>
                        <button
                          type="button"
                          disabled={desabilitada}
                          onClick={() => escolher(i, c)}
                          className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                            dona === i
                              ? "border-marca-600 bg-marca-50"
                              : dona >= 0
                                ? "border-slate-200 bg-slate-50 text-slate-400"
                                : "border-slate-200 bg-white"
                          }`}
                        >
                          <span className="flex-1">{texto}</span>
                          {dona >= 0 && dona !== i && <span className="shrink-0 text-xs">causa {dona + 1}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EncontrarErro({ vista, resposta, onChange, desabilitada }: Props<Extract<Vista, { tipo: "encontrar_erro" }>>) {
  const cheio = resposta.marcados.length >= vista.erros;
  const alternar = (i: number) => {
    if (resposta.marcados.includes(i)) {
      onChange({ tipo: "encontrar_erro", marcados: resposta.marcados.filter((m) => m !== i) });
    } else if (!cheio) {
      onChange({ tipo: "encontrar_erro", marcados: [...resposta.marcados, i] });
    }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        {vista.erros === 1 ? "Há 1 trecho com erro histórico." : `Há ${vista.erros} trechos com erro histórico.`} Toque
        para marcar; toque de novo para desmarcar.
      </p>
      <p className="rounded-xl border border-slate-200 bg-white p-3 leading-8">
        {vista.trechos.map((texto, i) => {
          const marcado = resposta.marcados.includes(i);
          const travado = desabilitada || (cheio && !marcado);
          // span em vez de button: trechos longos quebram linha como texto corrido.
          return (
            <span key={i}>
              <span
                role="button"
                tabIndex={travado ? -1 : 0}
                aria-pressed={marcado}
                aria-disabled={travado}
                onClick={() => !travado && alternar(i)}
                onKeyDown={(e) => {
                  if (!travado && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    alternar(i);
                  }
                }}
                className={`box-decoration-clone rounded-md px-1 py-0.5 decoration-2 underline-offset-4 transition ${
                  marcado
                    ? "bg-red-100 text-red-900 underline decoration-red-500"
                    : `underline decoration-slate-300 decoration-dotted ${travado ? "" : "cursor-pointer hover:bg-amber-50"}`
                }`}
              >
                {texto}
              </span>{" "}
            </span>
          );
        })}
      </p>
      <p className={`text-sm font-medium ${cheio ? "text-marca-700" : "text-slate-500"}`}>
        {resposta.marcados.length} de {vista.erros} marcado{vista.erros > 1 ? "s" : ""}
      </p>
    </div>
  );
}

function CompletarLacunas({
  vista,
  resposta,
  onChange,
  desabilitada,
}: Props<Extract<Vista, { tipo: "completar_lacunas" }>>) {
  const [ativa, setAtiva] = useState<number | null>(0);
  const preencher = (palavra: number) => {
    const alvo = ativa ?? resposta.preenchidas.findIndex((p) => p === null);
    if (alvo < 0) return;
    const preenchidas = resposta.preenchidas.map((p) => (p === palavra ? null : p));
    preenchidas[alvo] = palavra;
    onChange({ tipo: "completar_lacunas", preenchidas });
    const proxima = preenchidas.findIndex((p, k) => p === null && k !== alvo);
    setAtiva(proxima >= 0 ? proxima : null);
  };
  const tocarLacuna = (k: number) => {
    if (resposta.preenchidas[k] !== null) {
      const preenchidas = [...resposta.preenchidas];
      preenchidas[k] = null;
      onChange({ tipo: "completar_lacunas", preenchidas });
    }
    setAtiva(k);
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Toque numa lacuna e depois na palavra. Toque de novo para esvaziar.</p>
      <p className="rounded-xl border border-slate-200 bg-white p-3 leading-9">
        {vista.partes.map((parte, k) => (
          <span key={k}>
            {parte}
            {k < vista.partes.length - 1 && (
              <button
                type="button"
                disabled={desabilitada}
                onClick={() => tocarLacuna(k)}
                className={`mx-0.5 inline-flex min-w-20 justify-center rounded-lg border-2 px-2 align-middle text-sm leading-7 font-medium ${
                  ativa === k
                    ? "border-marca-600 bg-marca-50 text-marca-900"
                    : resposta.preenchidas[k] !== null
                      ? "border-marca-300 bg-marca-100 text-marca-900"
                      : "border-dashed border-slate-300 text-slate-400"
                }`}
              >
                {resposta.preenchidas[k] !== null ? vista.banco[resposta.preenchidas[k]!] : `${k + 1}`}
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="flex flex-wrap gap-2">
        {vista.banco.map((palavra, i) => {
          const usada = resposta.preenchidas.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={desabilitada}
              onClick={() => preencher(i)}
              className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${
                usada ? "border-slate-200 bg-slate-100 text-slate-400" : "border-marca-200 bg-white text-marca-900"
              }`}
            >
              {palavra}
            </button>
          );
        })}
      </div>
    </div>
  );
}
