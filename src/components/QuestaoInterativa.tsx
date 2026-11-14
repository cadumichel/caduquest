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
import { mapaFixas, type AjudaVista } from "@/lib/questoes/ajudas";
import type { Resposta, Vista } from "@/lib/questoes/tipos";

const LETRAS = "ABCDEF";
const CORES_PAR = ["bg-sky-500", "bg-amber-500", "bg-emerald-500", "bg-fuchsia-500", "bg-rose-500", "bg-lime-600"];

type Props<V extends Vista> = {
  vista: V;
  resposta: Extract<Resposta, { tipo: V["tipo"] }>;
  onChange: (r: Extract<Resposta, { tipo: V["tipo"] }>) => void;
  desabilitada?: boolean;
  /** Opções riscadas e itens travados pelas eliminações. */
  ajuda?: AjudaVista;
};

/** Selo dos itens que a eliminação travou no lugar certo. */
function Cadeado() {
  return (
    <span aria-label="Revelado pela eliminação" title="Revelado pela eliminação" className="shrink-0 text-sm">
      🔒
    </span>
  );
}

/** Área de resposta de uma questão, igual no desafio e na prévia do professor. */
export function QuestaoInterativa({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: {
  vista: Vista;
  resposta: Resposta;
  onChange: (r: Resposta) => void;
  desabilitada?: boolean;
  ajuda?: AjudaVista;
}) {
  if (vista.tipo !== resposta.tipo) return null;
  switch (vista.tipo) {
    case "multipla_escolha":
      return (
        <MultiplaEscolha
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "vf_bloco":
      return (
        <VfBloco
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "linha_do_tempo":
      return (
        <LinhaDoTempo
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "pares":
      return (
        <Pares
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "fonte_primaria":
      return (
        <FontePrimaria
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "causa_consequencia":
      return (
        <CausaConsequencia
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "encontrar_erro":
      return (
        <EncontrarErro
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "completar_lacunas":
      return (
        <CompletarLacunas
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "ordenar_frases":
      return (
        <Ordenar
          itens={vista.frases}
          ordem={(resposta as Extract<Resposta, { tipo: "ordenar_frases" }>).ordem}
          dica="Arraste ou use as setas até as frases ficarem na ordem certa."
          onOrdem={(ordem) => onChange({ tipo: "ordenar_frases", ordem })}
          desabilitada={desabilitada}
          fixas={mapaFixas(ajuda)}
        />
      );
    case "interpretacao":
      return (
        <div className="space-y-3">
          <Documento texto={vista.texto} />
          <MultiplaEscolha
            vista={vista}
            resposta={resposta as never}
            onChange={onChange}
            desabilitada={desabilitada}
            ajuda={ajuda}
          />
        </div>
      );
    case "quem_disse":
      return (
        <div className="space-y-3">
          <Citacao texto={vista.citacao} />
          <MultiplaEscolha
            vista={vista}
            resposta={resposta as never}
            onChange={onChange}
            desabilitada={desabilitada}
            ajuda={ajuda}
          />
        </div>
      );
    case "classificar":
      return (
        <Classificar
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "intruso":
      return (
        <Intruso
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "ponto_de_vista":
      return (
        <PontoDeVista
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "linha_do_tempo_datas":
      return (
        <Regua
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
      );
    case "mapa":
      return (
        <Mapa
          vista={vista}
          resposta={resposta as never}
          onChange={onChange}
          desabilitada={desabilitada}
          ajuda={ajuda}
        />
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
  ajuda,
}: Props<Extract<Vista, { tipo: "multipla_escolha" | "interpretacao" | "quem_disse" }>>) {
  const eliminadas = ajuda?.removidas ?? [];
  return (
    <ul className="space-y-2">
      {vista.alternativas.map((texto, i) => {
        const marcada = resposta.escolha === i;
        if (eliminadas.includes(i)) return <AlternativaEliminada key={i} letra={LETRAS[i]} texto={texto} />;
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

function AlternativaEliminada({ letra, texto }: { letra: string; texto: string }) {
  return (
    <li
      aria-label={`Alternativa ${letra} eliminada`}
      className="flex w-full items-start gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 text-left text-slate-400"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold">
        ✕
      </span>
      <span className="pt-0.5 line-through">{texto}</span>
    </li>
  );
}

function VfBloco({ vista, resposta, onChange, desabilitada, ajuda }: Props<Extract<Vista, { tipo: "vf_bloco" }>>) {
  const fixas = mapaFixas(ajuda);
  const marcar = (i: number, v: boolean) => {
    const valores = [...resposta.valores];
    valores[i] = v;
    onChange({ tipo: "vf_bloco", valores });
  };
  return (
    <ul className="space-y-2">
      {vista.afirmativas.map((texto, i) => (
        <li
          key={i}
          className={`flex items-center gap-3 rounded-xl border p-3 ${fixas.has(i) ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
        >
          {fixas.has(i) && <Cadeado />}
          <span className="flex-1">{texto}</span>
          <div className="flex shrink-0 gap-1">
            {([true, false] as const).map((v) => {
              const ativo = resposta.valores[i] === v;
              return (
                <button
                  key={String(v)}
                  type="button"
                  disabled={desabilitada || fixas.has(i)}
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
  acima,
  abaixo,
  mover,
  desabilitada,
  travado,
}: {
  id: number;
  texto: string;
  posicao: number;
  /** Posição livre logo acima e logo abaixo (pula os itens travados); null se não houver. */
  acima: number | null;
  abaixo: number | null;
  mover: (de: number, para: number) => void;
  desabilitada?: boolean;
  travado?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: desabilitada || travado,
  });
  if (travado) {
    return (
      <li
        ref={setNodeRef}
        className="flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-2"
        aria-label={`${posicao + 1}º, revelado pela eliminação`}
      >
        <span className="flex h-10 w-8 shrink-0 items-center justify-center">
          <Cadeado />
        </span>
        <span className="w-6 shrink-0 text-center text-sm font-bold text-marca-700">{posicao + 1}º</span>
        <span className="flex-1">{texto}</span>
      </li>
    );
  }
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
          disabled={desabilitada || acima === null}
          onClick={() => acima !== null && mover(posicao, acima)}
          className="px-2 text-slate-500 disabled:opacity-30"
          aria-label="Subir"
        >
          ▲
        </button>
        <button
          type="button"
          disabled={desabilitada || abaixo === null}
          onClick={() => abaixo !== null && mover(posicao, abaixo)}
          className="px-2 text-slate-500 disabled:opacity-30"
          aria-label="Descer"
        >
          ▼
        </button>
      </span>
    </li>
  );
}

function LinhaDoTempo({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "linha_do_tempo" }>>) {
  return (
    <Ordenar
      itens={vista.eventos}
      ordem={resposta.ordem}
      dica="Do mais antigo (1º) para o mais recente."
      onOrdem={(ordem) => onChange({ tipo: "linha_do_tempo", ordem })}
      desabilitada={desabilitada}
      fixas={mapaFixas(ajuda)}
    />
  );
}

function Ordenar({
  itens,
  ordem,
  dica,
  onOrdem,
  desabilitada,
  fixas,
}: {
  itens: string[];
  ordem: number[];
  dica: string;
  onOrdem: (ordem: number[]) => void;
  desabilitada?: boolean;
  /** Itens (na tela) travados na posição certa pela eliminação. */
  fixas?: Map<number, number>;
}) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const travado = (posicao: number) => Boolean(fixas?.has(ordem[posicao]));
  const livres = ordem.map((_, p) => p).filter((p) => !travado(p));
  // Só os itens livres trocam de lugar; os travados ficam onde estão.
  const mover = (de: number, para: number) => {
    if (travado(de) || travado(para)) return;
    const itens = arrayMove(
      livres.map((p) => ordem[p]),
      livres.indexOf(de),
      livres.indexOf(para),
    );
    const nova = [...ordem];
    livres.forEach((p, k) => (nova[p] = itens[k]));
    onOrdem(nova);
  };
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
                acima={livres[livres.indexOf(posicao) - 1] ?? null}
                abaixo={livres.indexOf(posicao) >= 0 ? (livres[livres.indexOf(posicao) + 1] ?? null) : null}
                mover={mover}
                desabilitada={desabilitada}
                travado={travado(posicao)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function Pares({ vista, resposta, onChange, desabilitada, ajuda }: Props<Extract<Vista, { tipo: "pares" }>>) {
  const fixas = mapaFixas(ajuda);
  const direitaFixa = new Set(fixas.values());
  const [ativo, setAtivo] = useState<number | null>(0);
  const ligar = (direita: number) => {
    if (ativo === null || fixas.has(ativo) || direitaFixa.has(direita)) return;
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
                  disabled={desabilitada || fixas.has(i)}
                  onClick={() => setAtivo(i)}
                  className={`flex min-h-12 w-full items-center gap-2 rounded-xl border-2 p-2 text-left text-sm ${
                    fixas.has(i)
                      ? "border-amber-300 bg-amber-50"
                      : ativo === i
                        ? "border-marca-600 bg-marca-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  {fixas.has(i) && <Cadeado />}
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
                  disabled={desabilitada || ativo === null || direitaFixa.has(d)}
                  onClick={() => ligar(d)}
                  className={`flex min-h-12 w-full items-center gap-2 rounded-xl border-2 p-2 text-left text-sm disabled:opacity-100 ${
                    direitaFixa.has(d) ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                  }`}
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

function FontePrimaria({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "fonte_primaria" }>>) {
  const removidas = new Set(ajuda?.removidas ?? []);
  // Posição global de cada alternativa: soma das alternativas das perguntas anteriores.
  const inicios = vista.perguntas.map((_, j) =>
    vista.perguntas.slice(0, j).reduce((n, p) => n + p.alternativas.length, 0),
  );
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
            if (removidas.has(inicios[j] + i)) {
              return (
                <div
                  key={i}
                  aria-label={`Alternativa ${LETRAS[i]} eliminada`}
                  className="flex w-full items-start gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">
                    ✕
                  </span>
                  <span className="pt-0.5 line-through">{texto}</span>
                </div>
              );
            }
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
  ajuda,
}: Props<Extract<Vista, { tipo: "causa_consequencia" }>>) {
  const fixas = mapaFixas(ajuda);
  const removidas = new Set(ajuda?.removidas ?? []);
  const fixasValores = new Set(fixas.values());
  const [aberta, setAberta] = useState<number | null>(() => {
    const primeira = vista.causas.findIndex((_, i) => !fixas.has(i));
    return primeira >= 0 ? primeira : null;
  });
  const escolher = (causa: number, consequencia: number) => {
    if (fixas.has(causa) || fixasValores.has(consequencia) || removidas.has(consequencia)) return;
    const ligacoes = resposta.ligacoes.map((c) => (c === consequencia ? null : c));
    ligacoes[causa] = consequencia;
    onChange({ tipo: "causa_consequencia", ligacoes });
    const proxima = ligacoes.findIndex((c, i) => c === null && i !== causa);
    setAberta(proxima >= 0 ? proxima : null);
  };
  const ligadas = resposta.ligacoes.filter((c) => c !== null && c !== undefined).length;
  const sobram = vista.consequencias.length - vista.causas.length;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-marca-200 bg-marca-50 p-3 text-sm text-marca-900">
        <p className="font-bold">Como responder</p>
        <p>
          Cada <b>causa</b> abaixo provocou um acontecimento. Embaixo de cada causa, toque em{" "}
          <b>“Escolher a consequência”</b> e marque o que aquela causa provocou.
        </p>
        {sobram > 0 && (
          <p className="mt-1">
            Atenção: há {sobram}{" "}
            {sobram === 1 ? "consequência a mais, que não combina" : "consequências a mais, que não combinam"} com
            nenhuma causa.
          </p>
        )}
        <p className="mt-1 text-xs font-semibold text-marca-700">
          {ligadas} de {vista.causas.length} causas com consequência escolhida
        </p>
      </div>
      <ol className="space-y-3">
        {vista.causas.map((causa, i) => {
          const escolhida = resposta.ligacoes[i];
          const travada = fixas.has(i);
          const aberto = aberta === i && !travada;
          return (
            <li
              key={i}
              className={`rounded-xl border-2 ${travada ? "border-amber-300 bg-amber-50" : aberto ? "border-marca-500 bg-white" : "border-slate-200 bg-white"}`}
            >
              <button
                type="button"
                disabled={desabilitada || travada}
                onClick={() => setAberta(aberto ? null : i)}
                className="w-full p-3 text-left"
              >
                <span className="flex items-center gap-1 text-xs font-bold tracking-wide text-amber-700 uppercase">
                  Causa {i + 1} {travada && <Cadeado />}
                </span>
                <span className="block">{causa}</span>
                <span className="mt-2 block text-xs font-bold tracking-wide text-marca-600 uppercase">
                  ↓ Consequência
                </span>
                {escolhida !== null && escolhida !== undefined ? (
                  <span className="mt-1 block rounded-lg bg-marca-50 px-2 py-1 text-sm text-marca-900">
                    {vista.consequencias[escolhida]}
                    {!travada && <span className="ml-1 text-xs text-marca-600">(toque para trocar)</span>}
                  </span>
                ) : (
                  <span className="mt-1 block rounded-lg border-2 border-dashed border-marca-300 px-2 py-1.5 text-sm font-semibold text-marca-700">
                    👉 Escolher a consequência
                  </span>
                )}
              </button>
              {aberto && (
                <ul className="space-y-1.5 border-t border-slate-100 p-2">
                  <li className="px-1 text-xs font-semibold text-slate-500">
                    O que a causa {i + 1} provocou? Toque em uma opção:
                  </li>
                  {vista.consequencias.map((texto, c) => {
                    const dona = resposta.ligacoes.indexOf(c);
                    if (removidas.has(c)) {
                      return (
                        <li
                          key={c}
                          aria-label="Consequência eliminada"
                          className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 line-through"
                        >
                          {texto}
                        </li>
                      );
                    }
                    return (
                      <li key={c}>
                        <button
                          type="button"
                          disabled={desabilitada || fixasValores.has(c)}
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

function EncontrarErro({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "encontrar_erro" }>>) {
  const semErro = mapaFixas(ajuda);
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
          if (semErro.has(i)) {
            return (
              <span key={i}>
                <span
                  title="Trecho sem erro, revelado pela eliminação"
                  className="box-decoration-clone rounded-md bg-emerald-50 px-1 py-0.5 text-emerald-800"
                >
                  ✓ {texto}
                </span>{" "}
              </span>
            );
          }
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
  ajuda,
}: Props<Extract<Vista, { tipo: "completar_lacunas" }>>) {
  const fixas = mapaFixas(ajuda);
  const removidas = new Set(ajuda?.removidas ?? []);
  const palavrasFixas = new Set(fixas.values());
  const [ativa, setAtiva] = useState<number | null>(0);
  const preencher = (palavra: number) => {
    if (removidas.has(palavra) || palavrasFixas.has(palavra)) return;
    const alvo =
      ativa !== null && !fixas.has(ativa)
        ? ativa
        : resposta.preenchidas.findIndex((p, k) => p === null && !fixas.has(k));
    if (alvo < 0) return;
    const preenchidas = resposta.preenchidas.map((p) => (p === palavra ? null : p));
    preenchidas[alvo] = palavra;
    onChange({ tipo: "completar_lacunas", preenchidas });
    const proxima = preenchidas.findIndex((p, k) => p === null && k !== alvo);
    setAtiva(proxima >= 0 ? proxima : null);
  };
  const tocarLacuna = (k: number) => {
    if (fixas.has(k)) return;
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
                disabled={desabilitada || fixas.has(k)}
                onClick={() => tocarLacuna(k)}
                className={`mx-0.5 inline-flex min-w-20 justify-center gap-1 rounded-lg border-2 px-2 align-middle text-sm leading-7 font-medium ${
                  fixas.has(k)
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : ativa === k
                      ? "border-marca-600 bg-marca-50 text-marca-900"
                      : resposta.preenchidas[k] !== null
                        ? "border-marca-300 bg-marca-100 text-marca-900"
                        : "border-dashed border-slate-300 text-slate-400"
                }`}
              >
                {fixas.has(k) && <Cadeado />}
                {resposta.preenchidas[k] !== null ? vista.banco[resposta.preenchidas[k]!] : `${k + 1}`}
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="flex flex-wrap gap-2">
        {vista.banco.map((palavra, i) => {
          const usada = resposta.preenchidas.includes(i);
          const riscada = removidas.has(i);
          return (
            <button
              key={i}
              type="button"
              disabled={desabilitada || riscada || palavrasFixas.has(i)}
              onClick={() => preencher(i)}
              aria-label={riscada ? `${palavra}, eliminada` : undefined}
              className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium ${
                riscada
                  ? "border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through"
                  : usada
                    ? "border-slate-200 bg-slate-100 text-slate-400"
                    : "border-marca-200 bg-white text-marca-900"
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

const CORES_GRUPO = [
  "border-sky-600 bg-sky-600 text-white",
  "border-amber-600 bg-amber-600 text-white",
  "border-emerald-600 bg-emerald-600 text-white",
];

/** Botões pequenos de escolha, usados para grupos, perspectivas e pinos. */
function Fichas({
  opcoes,
  escolhida,
  onEscolher,
  cores,
  desabilitada,
  travada,
  bloqueadas,
  riscadas,
}: {
  opcoes: string[];
  escolhida: number | null | undefined;
  onEscolher: (i: number) => void;
  cores?: string[];
  desabilitada?: boolean;
  /** Linha revelada pela eliminação: não muda mais. */
  travada?: boolean;
  /** Opções já travadas em outra linha. */
  bloqueadas?: Set<number>;
  /** Opções eliminadas. */
  riscadas?: Set<number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {travada && <Cadeado />}
      {opcoes.map((o, i) => {
        const riscada = riscadas?.has(i);
        const bloqueada = bloqueadas?.has(i) && escolhida !== i;
        return (
          <button
            key={i}
            type="button"
            disabled={desabilitada || travada || riscada || bloqueada}
            onClick={() => onEscolher(i)}
            aria-pressed={escolhida === i}
            className={`min-h-9 rounded-full border-2 px-3 text-sm font-medium ${
              escolhida === i
                ? (cores?.[i % cores.length] ?? "border-marca-600 bg-marca-600 text-white")
                : riscada
                  ? "border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through"
                  : bloqueada || travada
                    ? "border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Classificar({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "classificar" }>>) {
  const fixas = mapaFixas(ajuda);
  const escolher = (item: number, grupo: number) => {
    const grupos = [...resposta.grupos];
    grupos[item] = grupo;
    onChange({ tipo: "classificar", grupos });
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Toque no grupo certo de cada item.</p>
      <ul className="space-y-2">
        {vista.itens.map((texto, i) => (
          <li
            key={i}
            className={`space-y-2 rounded-xl border-2 p-3 ${fixas.has(i) ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}
          >
            <p>{texto}</p>
            <Fichas
              opcoes={vista.grupos}
              escolhida={resposta.grupos[i]}
              onEscolher={(g) => escolher(i, g)}
              cores={CORES_GRUPO}
              desabilitada={desabilitada}
              travada={fixas.has(i)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Intruso({ vista, resposta, onChange, desabilitada, ajuda }: Props<Extract<Vista, { tipo: "intruso" }>>) {
  const eliminadas = ajuda?.removidas ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Qual item não pertence ao grupo?</p>
      <div className="grid grid-cols-2 gap-2">
        {vista.itens.map((texto, i) => {
          const marcado = resposta.escolha === i;
          const eliminado = eliminadas.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={desabilitada || eliminado}
              onClick={() => onChange({ tipo: "intruso", escolha: i })}
              aria-pressed={marcado}
              className={`flex min-h-20 items-center justify-center rounded-xl border-2 p-3 text-center text-sm font-medium transition ${
                eliminado
                  ? "border-dashed border-slate-200 bg-slate-50 text-slate-400 line-through"
                  : marcado
                    ? "border-red-500 bg-red-50 text-red-900"
                    : "border-slate-200 bg-white hover:border-marca-200"
              } ${vista.itens.length % 2 === 1 && i === vista.itens.length - 1 ? "col-span-2" : ""}`}
            >
              {texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PontoDeVista({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "ponto_de_vista" }>>) {
  const fixas = mapaFixas(ajuda);
  const fixasValores = new Set(fixas.values());
  const removidas = new Set(ajuda?.removidas ?? []);
  const escolher = (relato: number, perspectiva: number) => {
    const ligacoes = resposta.ligacoes.map((p) => (p === perspectiva ? null : p));
    ligacoes[relato] = perspectiva;
    onChange({ tipo: "ponto_de_vista", ligacoes });
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">De quem é cada relato? Sobra opção: nem todas se encaixam.</p>
      {vista.relatos.map((texto, i) => (
        <div key={i} className="space-y-2">
          <p className="text-xs font-bold tracking-wide text-amber-700 uppercase">Relato {i + 1}</p>
          <Documento texto={texto} />
          <Fichas
            opcoes={vista.perspectivas}
            escolhida={resposta.ligacoes[i]}
            onEscolher={(p) => escolher(i, p)}
            desabilitada={desabilitada}
            travada={fixas.has(i)}
            bloqueadas={fixasValores}
            riscadas={removidas}
          />
        </div>
      ))}
    </div>
  );
}

function Regua({
  vista,
  resposta,
  onChange,
  desabilitada,
  ajuda,
}: Props<Extract<Vista, { tipo: "linha_do_tempo_datas" }>>) {
  const fixas = mapaFixas(ajuda);
  const [ativo, setAtivo] = useState<number | null>(() => {
    const primeiro = vista.eventos.findIndex((_, i) => !fixas.has(i));
    return primeiro >= 0 ? primeiro : null;
  });
  const colocar = (faixa: number) => {
    if (ativo === null || fixas.has(ativo)) return;
    const faixas = [...resposta.faixas];
    faixas[ativo] = faixa;
    onChange({ tipo: "linha_do_tempo_datas", faixas });
    const proximo = faixas.findIndex((f, i) => f === null && i !== ativo);
    setAtivo(proximo >= 0 ? proximo : null);
  };
  const tirar = (evento: number) => {
    if (fixas.has(evento)) return;
    const faixas = [...resposta.faixas];
    faixas[evento] = null;
    onChange({ tipo: "linha_do_tempo_datas", faixas });
    setAtivo(evento);
  };
  const soltos = vista.eventos.map((_, i) => i).filter((i) => resposta.faixas[i] === null);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Toque num evento e depois na faixa de tempo dele. Toque num evento já colocado para tirá-lo.
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
      <ol className="relative space-y-1.5 border-l-4 border-marca-300 pl-3">
        {vista.faixas.map((rotulo, f) => (
          <li key={f} className="relative">
            <span className="absolute top-4 -left-[1.3rem] h-3 w-3 rounded-full border-2 border-white bg-marca-500" />
            <button
              type="button"
              disabled={desabilitada || ativo === null}
              onClick={() => colocar(f)}
              className={`w-full rounded-xl border-2 p-2 text-left disabled:opacity-100 ${
                ativo !== null ? "border-marca-200 bg-marca-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <span className="text-xs font-bold text-marca-700 tabular-nums">{rotulo}</span>
            </button>
            <div className="flex flex-wrap gap-1.5 px-2 pt-1 empty:hidden">
              {vista.eventos.map((texto, i) =>
                resposta.faixas[i] === f ? (
                  <button
                    key={i}
                    type="button"
                    disabled={desabilitada || fixas.has(i)}
                    onClick={() => tirar(i)}
                    className={`rounded-lg px-2.5 py-1 text-left text-sm ${
                      fixas.has(i) ? "border-2 border-amber-300 bg-amber-50 text-amber-900" : "bg-marca-600 text-white"
                    }`}
                  >
                    {fixas.has(i) && "🔒 "}
                    {texto}
                  </button>
                ) : null,
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Imagem com pinos numerados por cima. */
export function ImagemComPinos({
  imagem,
  pinos,
  destaque,
}: {
  imagem: string;
  pinos: { x: number; y: number }[];
  destaque?: number | null;
}) {
  return (
    <div className="relative mx-auto w-fit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagem} alt="" className="block max-h-[60vh] w-auto rounded-xl border border-slate-200" />
      {pinos.map((p, i) => (
        <span
          key={i}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-md ${
            destaque === i ? "scale-125 bg-amber-500" : "bg-marca-700"
          }`}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

function Mapa({ vista, resposta, onChange, desabilitada, ajuda }: Props<Extract<Vista, { tipo: "mapa" }>>) {
  const fixas = mapaFixas(ajuda);
  const pinosFixos = new Set(fixas.values());
  const [foco, setFoco] = useState<number | null>(null);
  const escolher = (nome: number, pino: number) => {
    const pinos = resposta.pinos.map((p) => (p === pino ? null : p));
    pinos[nome] = pino;
    onChange({ tipo: "mapa", pinos });
    setFoco(pino);
  };
  return (
    <div className="space-y-3">
      <ImagemComPinos imagem={vista.imagem} pinos={vista.pinos} destaque={foco} />
      <p className="text-sm text-slate-500">Escolha o número do pino de cada lugar.</p>
      <ul className="space-y-2">
        {vista.nomes.map((nome, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-slate-200 bg-white p-2">
            <span className="min-w-28 flex-1 font-medium">{nome}</span>
            <Fichas
              opcoes={vista.pinos.map((_, p) => String(p + 1))}
              escolhida={resposta.pinos[i]}
              onEscolher={(p) => escolher(i, p)}
              desabilitada={desabilitada}
              travada={fixas.has(i)}
              bloqueadas={pinosFixos}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
