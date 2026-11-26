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
import { quartoDoPonto } from "@/lib/questoes/detalhe";
import type { Segredo } from "@/lib/questoes/apresentacao";
import {
  letraBase,
  MAX_ERROS_CONCEITO,
  progressoConceito,
  vidasDaConversa,
  type ProgressoPasso,
} from "@/lib/questoes/passos";
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
export function Estimativa({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "estimativa" }>>) {
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
        <p className="mt-1 text-3xl font-black text-marca-900 tabular-nums">{marcado === null ? "—" : fmt(marcado)}</p>
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
        <button
          type="button"
          className={botao}
          disabled={desabilitada}
          onClick={() => mudar((indice ?? passos / 2) - grande)}
        >
          ‹‹
        </button>
        <button
          type="button"
          className={botao}
          disabled={desabilitada}
          onClick={() => mudar((indice ?? passos / 2) - 1)}
        >
          ‹ menos
        </button>
        <button
          type="button"
          className={botao}
          disabled={desabilitada}
          onClick={() => mudar((indice ?? passos / 2) + 1)}
        >
          mais ›
        </button>
        <button
          type="button"
          className={botao}
          disabled={desabilitada}
          onClick={() => mudar((indice ?? passos / 2) + grande)}
        >
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

/** Resultado de um passo conferido no servidor (conversa e conceito secreto). */
export type ResultadoPassoServidor = { progresso: ProgressoPasso } | { erro: string };

/** Retrato redondo do personagem; sem retrato, a inicial. */
function Rosto({ nome, avatar }: { nome: string; avatar: string | null }) {
  return avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full border-2 border-ouro object-cover" />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ouro bg-marca-900 font-black text-white">
      {nome.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

/**
 * Conversa com o personagem: chat em turnos. Em cada turno o aluno escolhe uma
 * de 3 respostas e vê na hora se acertou e o que o personagem respondeu. Errar
 * gasta vida, como no tabuleiro. No desafio, o servidor confere cada turno.
 */
export function Conversa({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
  certas,
  segredo,
  progresso,
  darPasso,
}: Props<Extract<Vista, { tipo: "conversa" }>> & {
  certas?: number[];
  segredo?: Segredo;
  progresso?: ProgressoPasso;
  darPasso?: (passo: number) => Promise<ResultadoPassoServidor>;
}) {
  const n = vista.mensagens.length;
  const vidas = vidasDaConversa(n);
  const removidas = new Set(ajuda?.removidas ?? []);
  type Estado = { chave: string; feitas: number[]; certasFeitas: (number | null)[]; reacoes: (string | null)[] };
  const inicial = (): Omit<Estado, "chave"> => {
    if (progresso?.tipo === "conversa")
      return { feitas: progresso.escolhas, certasFeitas: progresso.certas, reacoes: progresso.reacoes };
    const k = resposta.escolhas.findIndex((e) => e === null);
    const feitas = resposta.escolhas.slice(0, k === -1 ? n : k) as number[];
    return {
      feitas,
      certasFeitas: feitas.map((_, j) => certas?.[j] ?? null),
      reacoes: feitas.map((_, j) => segredo?.reacoes?.[j] ?? null),
    };
  };
  const chave = `${vista.personagem}|${vista.mensagens.join("|")}`;
  const [estado, setEstado] = useState<Estado>(() => ({ chave, ...inicial() }));
  if (estado.chave !== chave) setEstado({ chave, ...inicial() });
  const { feitas, certasFeitas, reacoes }: Estado = estado.chave === chave ? estado : { chave, ...inicial() };
  const [marcada, setMarcada] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const erros = feitas.filter((e, k) => certasFeitas[k] != null && e !== certasFeitas[k]).length;
  const semVidas = erros > vidas;
  const encerrada = feitas.length >= n || semVidas;
  const atual = feitas.length;
  const acertos = feitas.filter((e, k) => e === certasFeitas[k]).length;

  const registrar = (novas: number[], novasCertas: (number | null)[], novasReacoes: (string | null)[]) => {
    setEstado({ chave, feitas: novas, certasFeitas: novasCertas, reacoes: novasReacoes });
    setMarcada(null);
    const novosErros = novas.filter((e, k) => novasCertas[k] != null && e !== novasCertas[k]).length;
    onChange({
      tipo: "conversa",
      escolhas: vista.mensagens.map((_, k) => (k < novas.length ? novas[k] : null)),
      fim: novas.length >= n || novosErros > vidas,
    });
  };

  const enviar = async () => {
    if (marcada === null || encerrada) return;
    setErro(null);
    if (darPasso) {
      setEnviando(true);
      try {
        const r = await darPasso(marcada);
        if ("erro" in r) return setErro(r.erro);
        if (r.progresso.tipo === "conversa") registrar(r.progresso.escolhas, r.progresso.certas, r.progresso.reacoes);
      } catch {
        setErro("Falha de conexão. Envie de novo.");
      } finally {
        setEnviando(false);
      }
      return;
    }
    registrar(
      [...feitas, marcada],
      [...certasFeitas, certas?.[atual] ?? null],
      [...reacoes, segredo?.reacoes?.[atual] ?? null],
    );
  };

  const bolhaPersonagem = (texto: string, chaveBolha: string) => (
    <div key={chaveBolha} className="flex items-end gap-2">
      <Rosto nome={vista.personagem} avatar={vista.avatar} />
      <p className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-[15px] shadow-sm ring-1 ring-slate-200">
        {texto}
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-marca-900 px-3 py-2 text-white">
        <span className="flex items-center gap-2 font-bold">
          <Rosto nome={vista.personagem} avatar={vista.avatar} /> {vista.personagem}
        </span>
        <span aria-label={`${Math.max(0, vidas - erros)} de ${vidas} vidas`}>
          {Array.from({ length: vidas }, (_, v) => (
            <span key={v} className={v < vidas - erros ? "" : "opacity-30 grayscale"}>
              ❤️
            </span>
          ))}
        </span>
      </div>
      <div className="space-y-3 rounded-2xl bg-slate-100 p-3">
        {vista.mensagens.slice(0, Math.min(n, atual + (encerrada ? 0 : 1))).map((m, k) => {
          const feita = k < feitas.length;
          const certa = certasFeitas[k];
          const acertou = feita && certa != null ? feitas[k] === certa : null;
          return (
            <div key={k} className="space-y-2">
              {bolhaPersonagem(m, `m${k}`)}
              {feita && (
                <div className="flex justify-end">
                  <p
                    className={`max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-[15px] ${
                      acertou === null
                        ? "bg-marca-600 text-white"
                        : acertou
                          ? "bg-emerald-600 text-white"
                          : "bg-red-600 text-white"
                    }`}
                  >
                    {vista.opcoes[k][feitas[k]]} {acertou === null ? "" : acertou ? "✓" : "✗"}
                  </p>
                </div>
              )}
              {feita && acertou === false && certa != null && (
                <p className="text-right text-xs font-semibold text-red-800">
                  Resposta certa: {vista.opcoes[k][certa]}
                </p>
              )}
              {feita && reacoes[k] && bolhaPersonagem(reacoes[k]!, `r${k}`)}
            </div>
          );
        })}
      </div>
      {!encerrada ? (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-marca-800">
            Fala {atual + 1} de {n}: escolha sua resposta e envie.
          </p>
          {vista.opcoes[atual].map((texto, i) => {
            const riscada = removidas.has(3 * atual + i);
            if (riscada) return <AlternativaRiscada key={`${atual}-${i}`} texto={texto} />;
            return (
              <button
                key={`${atual}-${i}`}
                type="button"
                disabled={desabilitada || enviando}
                onClick={() => setMarcada(i)}
                aria-pressed={marcada === i}
                className={`block w-full rounded-2xl border-2 px-4 py-2.5 text-left text-[15px] transition ${
                  marcada === i ? "border-marca-600 bg-marca-50" : "border-slate-200 bg-white hover:border-marca-200"
                }`}
              >
                {texto}
              </button>
            );
          })}
          {erro && <p className="text-sm font-semibold text-red-700">{erro}</p>}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={desabilitada || enviando || marcada === null}
              onClick={enviar}
              className="rounded-xl bg-marca-600 px-5 py-2.5 font-bold text-white shadow transition hover:bg-marca-700 disabled:opacity-40"
            >
              {enviando ? "Enviando…" : "Enviar ➜"}
            </button>
          </div>
        </section>
      ) : (
        <p
          className={`rounded-2xl border-2 p-4 text-center font-bold ${semVidas ? "border-red-200 bg-red-50 text-red-900" : "border-ouro-claro bg-amber-50 text-marca-900"}`}
        >
          {semVidas ? "💔 Acabaram as vidas: a conversa terminou" : "🏁 Fim da conversa"}
          {certasFeitas.some((c) => c != null) ? `, com ${acertos} de ${n} respostas certas` : ""}. Confirme a resposta
          para seguir.
        </p>
      )}
    </div>
  );
}

function AlternativaRiscada({ texto }: { texto: string }) {
  return (
    <p
      aria-label="Resposta eliminada"
      className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-2.5 text-[15px] text-slate-400 line-through"
    >
      {texto}
    </p>
  );
}

const TECLADO = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

/**
 * Conceito secreto: definição, quadradinhos da palavra e um teclado na tela.
 * Cada letra é conferida no servidor no desafio (a palavra nunca vai para a
 * tela). O teclado do computador não é usado: em sala, apertar tecla zera.
 */
export function ConceitoSecreto({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
  segredo,
  progresso,
  darPasso,
}: Props<Extract<Vista, { tipo: "conceito_secreto" }>> & {
  segredo?: Segredo;
  progresso?: ProgressoPasso;
  darPasso?: (passo: string) => Promise<ResultadoPassoServidor>;
}) {
  const chave = vista.padrao.join("") + vista.definicao;
  const local = (letras: string[]): ProgressoPasso | null =>
    segredo?.palavra !== undefined
      ? progressoConceito({ palavra: segredo.palavra, definicao: vista.definicao }, letras)
      : null;
  type Estado = { chave: string; p: ProgressoPasso | null };
  const [estado, setEstado] = useState<Estado>(() => ({
    chave,
    p: progresso?.tipo === "conceito_secreto" ? progresso : local(resposta.letras),
  }));
  if (estado.chave !== chave)
    setEstado({ chave, p: progresso?.tipo === "conceito_secreto" ? progresso : local(resposta.letras) });
  const p = estado.p?.tipo === "conceito_secreto" ? estado.p : null;
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Letras reveladas pela eliminação: [posição, código da letra].
  const fixas = mapaFixas(ajuda);
  const reveladas = vista.padrao.map((ch, i) =>
    ch !== "_" ? ch : (p?.reveladas[i] ?? (fixas.has(i) ? String.fromCodePoint(fixas.get(i)!) : null)),
  );
  const letrasFixas = new Set([...fixas.values()].map((c) => letraBase(String.fromCodePoint(c))));
  const tentadas = p?.letras ?? resposta.letras;
  const naPalavra = new Set(reveladas.flatMap((r, i) => (vista.padrao[i] === "_" && r ? [letraBase(r)] : [])));
  const erros = p?.erros ?? tentadas.filter((l) => !naPalavra.has(l)).length;
  const descoberta = p?.descoberta ?? false;
  const encerrado = p?.encerrado ?? false;

  const chutar = async (letra: string) => {
    if (encerrado || tentadas.includes(letra) || letrasFixas.has(letra)) return;
    setErro(null);
    if (darPasso) {
      setEnviando(letra);
      try {
        const r = await darPasso(letra);
        if ("erro" in r) return setErro(r.erro);
        if (r.progresso.tipo !== "conceito_secreto") return;
        setEstado({ chave, p: r.progresso });
        onChange({ tipo: "conceito_secreto", letras: r.progresso.letras, fim: r.progresso.encerrado });
      } catch {
        setErro("Falha de conexão. Toque na letra de novo.");
      } finally {
        setEnviando(null);
      }
      return;
    }
    const letras = [...tentadas, letra];
    const novo = local(letras);
    setEstado({ chave, p: novo });
    onChange({
      tipo: "conceito_secreto",
      letras,
      fim: novo?.tipo === "conceito_secreto" ? novo.encerrado : false,
    });
  };

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border-l-4 border-marca-500 bg-marca-50 px-4 py-3 text-[15px] text-marca-950">
        📖 {vista.definicao}
      </p>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2" aria-label="Palavra secreta">
        {vista.padrao
          .join("")
          .split(" ")
          .reduce<{ inicio: number; palavra: string }[]>((acc, palavra) => {
            const inicio = acc.length ? acc[acc.length - 1].inicio + acc[acc.length - 1].palavra.length + 1 : 0;
            return [...acc, { inicio, palavra }];
          }, [])
          .map(({ inicio, palavra }) => (
            <span key={inicio} className="flex max-w-full gap-0.5 sm:gap-1">
              {[...palavra].map((ch, j) => {
                const i = inicio + j;
                const r = reveladas[i];
                if (ch !== "_")
                  return (
                    <span key={i} className="w-4 text-center text-2xl font-black">
                      {ch}
                    </span>
                  );
                return (
                  <span
                    key={i}
                    className={`flex h-11 w-8 min-w-0 shrink items-center justify-center rounded-lg border-b-4 text-xl font-black sm:w-9 ${
                      r
                        ? fixas.has(i) && !p?.letras.includes(letraBase(r))
                          ? "border-amber-400 bg-amber-50 text-amber-900"
                          : "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : encerrado && !descoberta
                          ? "border-red-300 bg-red-50"
                          : "border-marca-300 bg-white"
                    }`}
                  >
                    {r ?? ""}
                  </span>
                );
              })}
            </span>
          ))}
      </div>
      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
        Letras erradas:
        {Array.from({ length: MAX_ERROS_CONCEITO }, (_, k) => (
          <span key={k} className={`h-3 w-3 rounded-full ${k < erros ? "bg-red-500" : "bg-slate-200"}`} />
        ))}
        <span className="tabular-nums">
          {erros} de {MAX_ERROS_CONCEITO}
        </span>
      </div>
      {!encerrado ? (
        <div className="space-y-1.5">
          {TECLADO.map((linha) => (
            <div key={linha} className="flex justify-center gap-1">
              {[...linha].map((l) => {
                const usada = tentadas.includes(l) || letrasFixas.has(l);
                const acerto = usada && naPalavra.has(l);
                return (
                  <button
                    key={l}
                    type="button"
                    disabled={desabilitada || usada || enviando !== null}
                    onClick={() => chutar(l)}
                    className={`h-11 w-8 rounded-lg text-base font-bold shadow-sm transition sm:w-10 ${
                      usada
                        ? acerto
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-300 text-slate-500 line-through"
                        : enviando === l
                          ? "animate-pulse bg-marca-300 text-white"
                          : "bg-white text-marca-900 ring-1 ring-marca-200 hover:bg-marca-50"
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          ))}
          <p className="text-center text-xs text-slate-500">Toque nas letras da tela. Acentos não contam.</p>
          {erro && <p className="text-center text-sm font-semibold text-red-700">{erro}</p>}
        </div>
      ) : (
        <p
          className={`rounded-2xl border-2 p-4 text-center font-bold ${descoberta ? "border-ouro-claro bg-amber-50 text-marca-900" : "border-red-200 bg-red-50 text-red-900"}`}
        >
          {descoberta
            ? `🏆 Descobriu, com ${erros} letra${erros === 1 ? "" : "s"} errada${erros === 1 ? "" : "s"}!`
            : "💔 As letras erradas acabaram."}{" "}
          Confirme a resposta para seguir.
        </p>
      )}
    </div>
  );
}

/**
 * Detalhe na imagem: o aluno toca no ponto da imagem que responde ao enunciado.
 * A imagem é um botão (o toque nela nunca conta como clique fora). A eliminação
 * esconde quartos da imagem que não têm a área certa.
 */
export function DetalheImagem({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "detalhe_imagem" }>>) {
  const escondidos = new Set(ajuda?.removidas ?? []);
  const tocar = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (desabilitada) return;
    const caixa = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - caixa.left) / caixa.width) * 1000) / 10;
    const y = Math.round(((e.clientY - caixa.top) / caixa.height) * 1000) / 10;
    const ponto = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    if (escondidos.has(quartoDoPonto(ponto))) return;
    onChange({ tipo: "detalhe_imagem", ponto });
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">
        Toque no ponto da imagem que responde à pergunta. Pode tocar de novo para mudar.
      </p>
      <button
        type="button"
        disabled={desabilitada}
        onClick={tocar}
        aria-label="Imagem: toque no ponto da resposta"
        className="relative mx-auto block w-fit cursor-crosshair overflow-hidden rounded-xl border border-slate-200 disabled:cursor-default"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={vista.imagem} alt="" draggable={false} className="block max-h-[65vh] w-auto select-none" />
        {[0, 1, 2, 3].map((q) =>
          escondidos.has(q) ? (
            <span
              key={q}
              style={{ left: q % 2 ? "50%" : 0, top: q < 2 ? 0 : "50%" }}
              className="absolute flex h-1/2 w-1/2 items-center justify-center bg-slate-900/80 text-xs font-semibold text-white"
            >
              Não está aqui
            </span>
          ) : null,
        )}
        {resposta.ponto && (
          <span
            style={{ left: `${resposta.ponto.x}%`, top: `${resposta.ponto.y}%` }}
            className="pointer-events-none absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-marca-600/70 shadow-lg ring-2 ring-marca-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        )}
      </button>
      <p className="text-center text-sm font-medium text-marca-700">
        {resposta.ponto ? "Ponto marcado ✓" : "Nenhum ponto marcado"}
      </p>
    </div>
  );
}

/**
 * Enquanto isso…: duas linhas do tempo paralelas. O aluno toca num evento e
 * depois na célula (linha × período). A eliminação trava um evento na célula certa.
 */
export function EnquantoIsso({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "enquanto_isso" }>>) {
  const fixas = mapaFixas(ajuda);
  const p = vista.periodos.length;
  const [ativo, setAtivo] = useState<number | null>(() => {
    const primeiro = vista.eventos.findIndex((_, i) => !fixas.has(i) && resposta.celulas[i] === null);
    return primeiro >= 0 ? primeiro : null;
  });
  const colocar = (celula: number) => {
    if (ativo === null || fixas.has(ativo)) return;
    const celulas = [...resposta.celulas];
    celulas[ativo] = celula;
    onChange({ tipo: "enquanto_isso", celulas });
    const proximo = celulas.findIndex((c, i) => c === null && i !== ativo);
    setAtivo(proximo >= 0 ? proximo : null);
  };
  const tirar = (evento: number) => {
    if (fixas.has(evento) || desabilitada) return;
    const celulas = [...resposta.celulas];
    celulas[evento] = null;
    onChange({ tipo: "enquanto_isso", celulas });
    setAtivo(evento);
  };
  const soltos = vista.eventos.map((_, i) => i).filter((i) => resposta.celulas[i] === null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Toque num evento e depois na linha e no período em que ele aconteceu. Toque num evento já colocado para tirá-lo.
      </p>
      <div className="flex min-h-12 flex-wrap gap-2 rounded-xl border-2 border-dashed border-slate-300 p-2">
        {soltos.length === 0 && <span className="self-center px-1 text-sm text-slate-400">Todos colocados ✓</span>}
        {soltos.map((i) => (
          <button
            key={i}
            type="button"
            disabled={desabilitada}
            onClick={() => setAtivo(i)}
            className={`rounded-lg border-2 px-3 py-1.5 text-left text-sm ${
              ativo === i ? "border-marca-600 bg-marca-50 font-medium" : "border-slate-200 bg-white"
            }`}
          >
            {vista.eventos[i]}
          </button>
        ))}
      </div>
      <div className="max-w-full overflow-x-auto pb-1">
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `auto repeat(${p}, minmax(0, 1fr))`,
            minWidth: `${3.5 + p * 5}rem`,
          }}
        >
          <span />
          {vista.periodos.map((per, k) => (
            <span
              key={k}
              className="rounded-lg bg-marca-800 px-1 py-1.5 text-center text-xs font-bold text-white tabular-nums"
            >
              {per}
            </span>
          ))}
          {vista.linhas.map((linha, l) => (
            <div key={l} className="contents">
              <span
                className={`flex items-center justify-center rounded-lg px-1.5 text-center text-xs font-black break-words sm:text-sm ${
                  l === 0 ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900"
                }`}
              >
                {linha}
              </span>
              {vista.periodos.map((_, k) => {
                const celula = l * p + k;
                return (
                  <div
                    key={k}
                    className={`relative min-h-20 rounded-xl border-2 ${
                      ativo !== null ? "border-marca-300 bg-marca-50/60" : "border-slate-200 bg-white"
                    } ${l === 0 ? "border-t-amber-300" : "border-t-sky-300"}`}
                  >
                    <button
                      type="button"
                      aria-label={`${linha}, ${vista.periodos[k]}`}
                      disabled={desabilitada || ativo === null}
                      onClick={() => colocar(celula)}
                      className="absolute inset-0 rounded-xl disabled:cursor-default"
                    />
                    <div className="pointer-events-none relative flex flex-col gap-1 p-1">
                      {vista.eventos.map((texto, i) =>
                        resposta.celulas[i] === celula ? (
                          <button
                            key={i}
                            type="button"
                            disabled={desabilitada || fixas.has(i)}
                            onClick={() => tirar(i)}
                            className={`pointer-events-auto rounded-lg px-1.5 py-1 text-left text-xs leading-snug break-words hyphens-auto ${
                              fixas.has(i)
                                ? "border-2 border-amber-300 bg-amber-50 text-amber-900"
                                : "bg-marca-600 text-white"
                            }`}
                          >
                            {fixas.has(i) && "🔒 "}
                            {texto}
                          </button>
                        ) : null,
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
