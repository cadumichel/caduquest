"use client";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useId, useRef, useState, type ReactNode } from "react";
import { mapaFixas, type AjudaVista } from "@/lib/questoes/ajudas";
import { formatarEstimativa, indiceDoValor, totalPassos, valorDoIndice } from "@/lib/questoes/estimativa";
import { fatorPistas } from "@/lib/questoes/pistas";
import { MAX_DIGITADO, type Resposta, type Vista } from "@/lib/questoes/tipos";
import { Cadeado, cor } from "./questao-comum";

type Props<V extends Vista> = {
  vista: V;
  resposta: Extract<Resposta, { tipo: V["tipo"] }>;
  onChange: (r: Extract<Resposta, { tipo: V["tipo"] }>) => void;
  desabilitada?: boolean;
  ajuda?: AjudaVista;
};

/** Resultado de abrir uma pista no servidor (desafio). */
export type ResultadoPista = { pistas: string[] } | { erro: string };

const porcento = (f: number) => `${Math.round(f * 100)}%`;

/**
 * Estimativa na régua: o aluno arrasta o marcador (ou usa os botões de ajuste
 * fino) até o número. A eliminação encolhe a régua para um trecho que contém a resposta.
 */
export function Estimativa({ vista, resposta, onChange, desabilitada, ajuda }: Props<Extract<Vista, { tipo: "estimativa" }>>) {
  const janela = ajuda?.fixas[0];
  const minimo = janela ? janela[0] : vista.minimo;
  const maximo = janela ? janela[1] : vista.maximo;
  const regua = { minimo, maximo, passo: vista.passo };
  const passos = totalPassos(regua);
  const marcado = resposta.valor;
  const indice = marcado === null ? null : Math.max(0, Math.min(passos, indiceDoValor(regua, marcado)));
  const mudar = (i: number) =>
    onChange({ tipo: "estimativa", valor: valorDoIndice(regua, Math.max(0, Math.min(passos, i))) });
  const fmt = (v: number) => formatarEstimativa(v, vista);
  // Até 5 marcas na régua, arredondadas ao passo.
  const marcas = Array.from({ length: 5 }, (_, k) => valorDoIndice(regua, Math.round((passos * k) / 4)));
  const grande = Math.max(1, Math.round(passos / 20));
  const botao =
    "rounded-lg border-2 border-marca-200 bg-white px-3 py-2 text-sm font-bold text-marca-800 transition hover:border-marca-400 disabled:opacity-40";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Arraste o marcador até o valor que você acha certo. Chegar perto também vale pontos.
      </p>
      {janela && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Cadeado /> A régua encolheu: a resposta está entre {fmt(minimo)} e {fmt(maximo)}.
        </p>
      )}
      <div
        className={`rounded-2xl border-2 p-4 text-center ${marcado === null ? "border-dashed border-slate-300 bg-white" : "border-marca-300 bg-marca-50"}`}
      >
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Sua estimativa</p>
        <p className="mt-1 text-3xl font-black text-marca-900 tabular-nums">
          {marcado === null ? "—" : fmt(marcado)}
        </p>
      </div>
      <div className="px-1">
        <input
          type="range"
          aria-label="Régua"
          min={0}
          max={passos}
          step={1}
          value={indice ?? Math.round(passos / 2)}
          disabled={desabilitada}
          onChange={(e) => mudar(Number(e.target.value))}
          // Clicar sem arrastar (no ponto em que o marcador já está) também marca.
          onClick={(e) => mudar(Number(e.currentTarget.value))}
          className={`h-3 w-full cursor-pointer accent-marca-600 ${marcado === null ? "opacity-60" : ""}`}
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500 tabular-nums">
          {marcas.map((m, k) => (
            <span key={k}>{fmt(m)}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className={botao} disabled={desabilitada} onClick={() => mudar((indice ?? passos / 2) - grande)}>
          ‹‹
        </button>
        <button type="button" className={botao} disabled={desabilitada} onClick={() => mudar((indice ?? passos / 2) - 1)}>
          ‹ menos
        </button>
        <button type="button" className={botao} disabled={desabilitada} onClick={() => mudar((indice ?? passos / 2) + 1)}>
          mais ›
        </button>
        <button type="button" className={botao} disabled={desabilitada} onClick={() => mudar((indice ?? passos / 2) + grande)}>
          ››
        </button>
      </div>
    </div>
  );
}

/**
 * Quem sou eu? (pistas): os candidatos aparecem desde o início e as pistas
 * abrem uma a uma. Quem arrisca com menos pistas ganha mais. No desafio, cada
 * pista nova vem do servidor (as seguintes nem chegam à tela); no treino e na
 * prévia, a vista já traz todas e a tela vai mostrando.
 */
export function QuemSouEu({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
  abrirPista,
}: Props<Extract<Vista, { tipo: "quem_sou_eu" }>> & { abrirPista?: () => Promise<ResultadoPista> }) {
  const eliminadas = ajuda?.removidas ?? [];
  // A tela reaproveita o componente entre questões: outra questão recomeça das pistas dela.
  const chave = `${vista.candidatos.join("|")}|${vista.pistas[0] ?? ""}`;
  const [servidor, setServidor] = useState({ chave, pistas: vista.pistas });
  if (servidor.chave !== chave) setServidor({ chave, pistas: vista.pistas });
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pistas = abrirPista ? (servidor.chave === chave ? servidor.pistas : vista.pistas) : vista.pistas;
  const abertas = abrirPista ? pistas.length : Math.max(1, Math.min(resposta.pistas, vista.total));
  const valendo = fatorPistas(abertas, vista.total);
  const proxima = fatorPistas(abertas + 1, vista.total);

  const abrir = async () => {
    if (abertas >= vista.total) return;
    setErro(null);
    if (!abrirPista) return onChange({ ...resposta, pistas: abertas + 1 });
    setAbrindo(true);
    try {
      const r = await abrirPista();
      if ("erro" in r) return setErro(r.erro);
      setServidor({ chave, pistas: r.pistas });
      onChange({ ...resposta, pistas: r.pistas.length });
    } catch {
      setErro("Falha de conexão. Tente abrir a pista de novo.");
    } finally {
      setAbrindo(false);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="space-y-2">
        {Array.from({ length: vista.total }, (_, k) => {
          const aberta = k < abertas && pistas[k] !== undefined;
          return (
            <li
              key={k}
              className={`flex items-start gap-3 rounded-xl border-2 p-3 ${
                aberta ? "border-marca-200 bg-white" : "border-dashed border-slate-200 bg-slate-50 text-slate-400"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  aberta ? "bg-marca-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {k + 1}
              </span>
              <span className={`pt-0.5 ${aberta ? "font-serif text-[15px] text-slate-800 italic" : "text-sm"}`}>
                {aberta ? pistas[k] : "Pista fechada"}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm">
        <span className="font-semibold text-amber-900">
          Acertando agora: {porcento(valendo)} da nota · você só pode arriscar uma vez
        </span>
        {abertas < vista.total && (
          <button
            type="button"
            disabled={desabilitada || abrindo}
            onClick={abrir}
            className="rounded-lg bg-marca-600 px-3 py-1.5 font-bold text-white shadow transition hover:bg-marca-700 disabled:opacity-40"
          >
            {abrindo ? "Abrindo…" : `Abrir mais uma pista (passa a valer ${porcento(proxima)})`}
          </button>
        )}
      </div>
      {erro && <p className="text-sm font-semibold text-red-700">{erro}</p>}
      <div>
        <p className="mb-2 text-sm text-slate-500">Quem (ou o que) é?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {vista.candidatos.map((texto, i) => {
            const marcado = resposta.escolha === i;
            const eliminado = eliminadas.includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={desabilitada || eliminado}
                onClick={() => onChange({ ...resposta, escolha: i })}
                aria-pressed={marcado}
                className={`flex min-h-16 items-center justify-center rounded-xl border-2 p-2 text-center text-sm font-medium transition ${
                  eliminado
                    ? "border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through"
                    : marcado
                      ? "border-marca-600 bg-marca-50 text-marca-900"
                      : "border-slate-200 bg-white hover:border-marca-200"
                }`}
              >
                {texto}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Monte a resposta: espaços com função (Fato, Consequência...) que o aluno
 * preenche arrastando trechos do banco, ou tocando no espaço e depois no trecho.
 * A cor acompanha o trecho, nunca o espaço certo.
 */
export function MonteResposta({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "monte_resposta" }>>) {
  const fixas = mapaFixas(ajuda);
  const removidos = new Set(ajuda?.removidas ?? []);
  const trechosFixos = new Set(fixas.values());
  const [ativo, setAtivo] = useState<number | null>(0);
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );
  const idArraste = useId();
  const arrastou = useRef(false);

  const preencher = (trecho: number, espaco?: number) => {
    if (removidos.has(trecho) || trechosFixos.has(trecho)) return;
    const alvo =
      espaco !== undefined
        ? fixas.has(espaco)
          ? -1
          : espaco
        : ativo !== null && !fixas.has(ativo)
          ? ativo
          : resposta.preenchidas.findIndex((p, k) => p === null && !fixas.has(k));
    if (alvo < 0) return;
    const preenchidas = resposta.preenchidas.map((p) => (p === trecho ? null : p));
    preenchidas[alvo] = trecho;
    onChange({ tipo: "monte_resposta", preenchidas });
    const proximo = preenchidas.findIndex((p, k) => p === null && k !== alvo && !fixas.has(k));
    setAtivo(proximo >= 0 ? proximo : null);
  };
  const tocarEspaco = (k: number) => {
    if (fixas.has(k)) return;
    if (resposta.preenchidas[k] !== null) {
      const preenchidas = [...resposta.preenchidas];
      preenchidas[k] = null;
      onChange({ tipo: "monte_resposta", preenchidas });
    }
    setAtivo(k);
  };
  const aoSoltar = ({ active, over }: DragEndEvent) => {
    setTimeout(() => (arrastou.current = false), 0);
    if (!over) return;
    preencher(Number(String(active.id).slice(1)), Number(String(over.id).slice(1)));
  };

  return (
    <DndContext
      id={idArraste}
      sensors={sensores}
      onDragStart={() => (arrastou.current = true)}
      onDragCancel={() => setTimeout(() => (arrastou.current = false), 0)}
      onDragEnd={aoSoltar}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Arraste um trecho até cada espaço, ou toque no espaço e depois no trecho. Toque de novo para esvaziar.
        </p>
        <ol className="space-y-2">
          {vista.rotulos.map((rotulo, k) => {
            const t = resposta.preenchidas[k];
            return (
              <li key={k}>
                <EspacoResposta
                  k={k}
                  rotulo={rotulo}
                  fixo={fixas.has(k)}
                  ativo={ativo === k}
                  corTrecho={t === null ? null : cor(t).caixa}
                  desabilitada={desabilitada}
                  onClick={() => tocarEspaco(k)}
                >
                  {fixas.has(k) && <Cadeado />}
                  {t === null ? (
                    <span className="text-slate-400">Toque aqui ou solte um trecho</span>
                  ) : (
                    <span>{vista.banco[t]}</span>
                  )}
                </EspacoResposta>
              </li>
            );
          })}
        </ol>
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Trechos</p>
          {vista.banco.map((texto, i) => (
            <TrechoArrastavel
              key={i}
              i={i}
              texto={texto}
              usado={resposta.preenchidas.includes(i)}
              riscado={removidos.has(i)}
              desabilitada={desabilitada || removidos.has(i) || trechosFixos.has(i)}
              onClick={() => {
                if (!arrastou.current) preencher(i);
              }}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

function EspacoResposta({
  k,
  rotulo,
  fixo,
  ativo,
  corTrecho,
  desabilitada,
  onClick,
  children,
}: {
  k: number;
  rotulo: string;
  fixo: boolean;
  ativo: boolean;
  corTrecho: string | null;
  desabilitada?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `e${k}`, disabled: desabilitada || fixo });
  return (
    <button
      ref={setNodeRef}
      type="button"
      disabled={desabilitada || fixo}
      onClick={onClick}
      className={`flex w-full flex-col items-start gap-1 rounded-xl border-2 p-3 text-left text-sm transition sm:flex-row sm:items-center sm:gap-3 ${
        fixo
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : isOver
            ? "scale-[1.01] border-marca-600 bg-marca-100"
            : corTrecho
              ? `${corTrecho} text-slate-800`
              : ativo
                ? "border-marca-600 bg-marca-50"
                : "border-dashed border-slate-300 bg-white"
      }`}
    >
      <span className="w-32 shrink-0 text-xs font-black tracking-wide text-marca-800 uppercase">
        {k + 1}. {rotulo}
      </span>
      <span className="flex flex-1 items-start gap-1">{children}</span>
    </button>
  );
}

function TrechoArrastavel({
  i,
  texto,
  usado,
  riscado,
  desabilitada,
  onClick,
}: {
  i: number;
  texto: string;
  usado: boolean;
  riscado: boolean;
  desabilitada?: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `t${i}`,
    disabled: desabilitada,
  });
  const c = cor(i);
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      disabled={desabilitada}
      onClick={onClick}
      aria-label={riscado ? `${texto}, eliminado` : undefined}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`flex w-full touch-manipulation items-start gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm select-none ${
        riscado
          ? "border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through"
          : isDragging
            ? `relative z-20 cursor-grabbing ${c.caixa} shadow-lg`
            : usado
              ? "cursor-grab border-slate-200 bg-slate-100 text-slate-400"
              : `cursor-grab ${c.caixa} text-slate-800`
      }`}
    >
      {!riscado && <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${usado ? "bg-slate-300" : c.ponto}`} />}
      <span>{texto}</span>
    </button>
  );
}

/**
 * Investigue: o aluno pesquisa e digita a resposta. O campo é marcado com
 * data-digitacao: é o único lugar em que digitar não conta como tecla proibida.
 */
export function Investigue({ resposta, onChange, desabilitada }: Props<Extract<Vista, { tipo: "investigue" }>>) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-600" htmlFor="resposta-investigue">
        🔎 Pesquise e escreva a resposta
      </label>
      <input
        id="resposta-investigue"
        data-digitacao
        type="text"
        autoComplete="off"
        spellCheck={false}
        maxLength={MAX_DIGITADO}
        disabled={desabilitada}
        value={resposta.texto}
        onChange={(e) => onChange({ tipo: "investigue", texto: e.target.value })}
        placeholder="Sua resposta"
        className="w-full rounded-xl border-2 border-marca-200 bg-white px-4 py-3 text-lg font-medium text-marca-900 outline-none focus:border-marca-600"
      />
      <p className="text-xs text-slate-500">
        Não precisa se preocupar com maiúsculas ou acentos. Escreva só a resposta, sem frase.
      </p>
    </div>
  );
}

