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
  }
}

function MultiplaEscolha({
  vista,
  resposta,
  onChange,
  desabilitada,
}: Props<Extract<Vista, { tipo: "multipla_escolha" }>>) {
  return (
    <ul className="space-y-2">
      {vista.alternativas.map((texto, i) => {
        const marcada = resposta.escolha === i;
        return (
          <li key={i}>
            <button
              type="button"
              disabled={desabilitada}
              onClick={() => onChange({ tipo: "multipla_escolha", escolha: i })}
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
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const mover = (de: number, para: number) =>
    onChange({ tipo: "linha_do_tempo", ordem: arrayMove(resposta.ordem, de, para) });
  const aoSoltar = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    mover(resposta.ordem.indexOf(Number(active.id)), resposta.ordem.indexOf(Number(over.id)));
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">Do mais antigo (1º) para o mais recente.</p>
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <SortableContext items={resposta.ordem} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {resposta.ordem.map((exibido, posicao) => (
              <ItemOrdenavel
                key={exibido}
                id={exibido}
                texto={vista.eventos[exibido]}
                posicao={posicao}
                total={resposta.ordem.length}
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
