"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revelarPersonagens } from "@/app/aluno/actions";
import { Avatar } from "@/components/Avatar";
import { ehEspecial, ORDEM_BASICOS, ORDEM_ESPECIAIS, PERSONAGENS } from "@/lib/personagens";
import { CURIOSIDADE_PERSONAGEM } from "@/lib/personagens-curiosidades";

const CORES_CONFETE = ["#f6d365", "#d4a017", "#a78bfa", "#34d399", "#f472b6", "#60a5fa"];
/** Quanto tempo a roleta gira antes de parar em cada personagem. */
const GIRO_MS = 1600;

/**
 * Aviso de personagens a revelar e o sorteio em popup: a roleta gira, para no
 * personagem sorteado e solta confete. Um por vez, quando há mais de um.
 */
export function SorteioPersonagens({ basicos, lendarios, cor }: { basicos: number; lendarios: number; cor: number }) {
  const router = useRouter();
  const [novos, setNovos] = useState<number[] | null>(null);
  const [atual, setAtual] = useState(0);
  const [girando, setGirando] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const total = basicos + lendarios;

  const abrir = () =>
    iniciar(async () => {
      setErro(undefined);
      const r = await revelarPersonagens();
      if (r.erro) return setErro(r.erro);
      if (!r.novos?.length) return router.refresh();
      setNovos(r.novos);
      setAtual(0);
      setGirando(true);
    });

  const fechar = () => {
    setNovos(null);
    router.refresh();
  };

  if (!total && !novos) return null;

  return (
    <>
      {total > 0 && !novos && (
        <button
          type="button"
          onClick={abrir}
          disabled={pendente}
          className="flex w-full items-center gap-3 rounded-3xl bg-gradient-to-r from-marca-900 via-marca-800 to-amber-700 p-4 text-left text-white shadow-lg ring-2 ring-amber-300/70 transition hover:brightness-110 disabled:opacity-70"
        >
          <span className="text-4xl motion-safe:animate-bounce" aria-hidden>
            🎁
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold">
              {total === 1 ? "Você tem 1 personagem para revelar!" : `Você tem ${total} personagens para revelar!`}
            </span>
            <span className="block text-sm text-amber-100">
              {lendarios > 0 && (lendarios === 1 ? "Inclui 1 lendário ✦ " : `Inclui ${lendarios} lendários ✦ `)}
              {pendente ? "Abrindo o sorteio…" : "Toque para abrir o sorteio."}
            </span>
          </span>
        </button>
      )}
      {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
      {novos && (
        <Popup
          novos={novos}
          atual={atual}
          girando={girando}
          cor={cor}
          onParou={() => setGirando(false)}
          onProximo={() => {
            setAtual((a) => a + 1);
            setGirando(true);
          }}
          onFechar={fechar}
        />
      )}
    </>
  );
}

function Popup({
  novos,
  atual,
  girando,
  cor,
  onParou,
  onProximo,
  onFechar,
}: {
  novos: number[];
  atual: number;
  girando: boolean;
  cor: number;
  onParou: () => void;
  onProximo: () => void;
  onFechar: () => void;
}) {
  const sorteado = novos[atual];
  const lendario = ehEspecial(sorteado);
  const ultimo = atual === novos.length - 1;
  const roleta = useRoleta(lendario ? ORDEM_ESPECIAIS : ORDEM_BASICOS, girando, onParou);
  const mostrado = girando ? roleta : sorteado;
  const p = PERSONAGENS[mostrado];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sorteio de personagens"
      className="fixed inset-0 z-50 flex items-center justify-center bg-marca-950/80 p-4 backdrop-blur-sm"
    >
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl p-6 text-center shadow-2xl ${
          lendario
            ? "bg-gradient-to-br from-marca-950 via-marca-900 to-amber-900 text-white ring-2 ring-amber-300"
            : "bg-white ring-2 ring-marca-300"
        }`}
      >
        {!girando && <Confete key={atual} />}
        <p className={`text-xs font-bold tracking-widest uppercase ${lendario ? "text-amber-300" : "text-marca-700"}`}>
          {novos.length > 1 ? `Sorteio ${atual + 1} de ${novos.length}` : "Sorteio"}
        </p>
        <div className="my-5 flex justify-center">
          <div
            key={girando ? "roleta" : `revelado-${atual}`}
            className={girando ? "" : "motion-safe:animate-[surgir_0.7s_ease-out]"}
          >
            <Avatar avatar={mostrado} cor={cor} tamanho={150} className={girando ? "blur-[1px]" : ""} />
          </div>
        </div>
        {girando ? (
          <p className="text-lg font-extrabold">Sorteando…</p>
        ) : (
          <>
            <p className={`text-sm font-bold ${lendario ? "text-amber-300" : "text-amber-600"}`}>
              {lendario ? "✦ Lendário liberado! ✦" : "🎉 Personagem liberado!"}
            </p>
            <p className="mt-1 text-2xl font-extrabold">{p.nome}</p>
            <p className={`text-sm ${lendario ? "text-amber-100" : "text-slate-500"}`}>{p.epoca}</p>
            <p className={`mt-3 text-sm leading-snug ${lendario ? "text-amber-50" : "text-slate-700"}`}>
              {CURIOSIDADE_PERSONAGEM[p.nome]}
            </p>
            <button
              type="button"
              onClick={ultimo ? onFechar : onProximo}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-base font-extrabold text-marca-950 shadow hover:brightness-105"
            >
              {ultimo ? "Fechar" : `Sortear o próximo (${novos.length - atual - 1})`}
            </button>
            {ultimo && (
              <a
                href="/aluno/perfil#visual"
                className={`mt-3 block text-sm font-semibold underline ${lendario ? "text-amber-200" : "text-marca-700"}`}
              >
                Usar no meu perfil
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Troca o personagem mostrado cada vez mais devagar, até parar. */
function useRoleta(lista: readonly number[], girando: boolean, onParou: () => void) {
  const [mostrado, setMostrado] = useState(lista[0]);
  const parou = useRef(onParou);
  useEffect(() => {
    parou.current = onParou;
  });
  useEffect(() => {
    if (!girando) return;
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const fim = Date.now() + (reduzido ? 300 : GIRO_MS);
    let espera = 60;
    let timer: ReturnType<typeof setTimeout>;
    const passo = () => {
      if (Date.now() >= fim) return parou.current();
      setMostrado(lista[Math.floor(Math.random() * lista.length)]);
      espera = Math.min(260, espera * 1.12);
      timer = setTimeout(passo, espera);
    };
    passo();
    return () => clearTimeout(timer);
  }, [girando, lista]);
  return mostrado;
}

/** Confete caindo pelo cartão (some sozinho). */
function Confete() {
  const pedacos = Array.from({ length: 36 }, (_, i) => i);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {pedacos.map((i) => (
        <span
          key={i}
          className="absolute top-0 block h-3 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            backgroundColor: CORES_CONFETE[i % CORES_CONFETE.length],
            animation: `confete ${1.6 + ((i * 7) % 10) / 10}s ease-in ${((i * 13) % 10) / 20}s forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
