"use client";
import { useState } from "react";

/** Como cada casa aparece no caminho. */
export type EstadoCasa = "feita" | "atual" | "oculta" | "certa" | "errada" | "revelada" | "neutra";

/** Posições (em % da largura e da altura) do início, das casas e da chegada, em zigue-zague. */
function posicoes(n: number): { x: number; y: number }[] {
  const ondas = [72, 52, 40, 60, 76, 48, 40, 62];
  return Array.from({ length: n + 2 }, (_, i) => ({
    x: 9 + (i * 82) / (n + 1),
    y: i === 0 ? 80 : i === n + 1 ? 46 : ondas[(i - 1) % ondas.length],
  }));
}

/** Curva suave entre os pontos, no espaço 0–1000 × 0–300 do SVG. */
function estrada(pontos: { x: number; y: number }[]): string {
  const p = pontos.map(({ x, y }) => [x * 10, y * 3]);
  return p.reduce((d, [x, y], i) => {
    if (!i) return `M${x},${y}`;
    const [px, py] = p[i - 1];
    const meio = (px + x) / 2;
    return `${d} C${meio},${py} ${meio},${y} ${x},${y}`;
  }, "");
}

const ESTILO: Record<EstadoCasa, string> = {
  feita: "border-marca-300 bg-marca-100 text-marca-700 shadow-[0_4px_0_var(--color-marca-500)]",
  atual:
    "scale-110 border-ouro-claro bg-amber-50 text-marca-700 shadow-[0_4px_0_var(--color-ouro-escuro),0_0_24px_var(--color-ouro-claro)]",
  oculta: "border-marca-400 bg-marca-700 text-marca-200 shadow-[0_4px_0_var(--color-marca-900)]",
  certa: "border-emerald-500 bg-emerald-100 text-emerald-800 shadow-[0_4px_0_#047857]",
  errada: "border-red-500 bg-red-100 text-red-800 shadow-[0_4px_0_#b91c1c]",
  revelada: "border-ouro bg-amber-100 text-amber-800 shadow-[0_4px_0_var(--color-ouro-escuro)]",
  neutra: "border-ouro-claro bg-amber-50 text-marca-700 shadow-[0_4px_0_var(--color-ouro-escuro)]",
};

const SIMBOLO: Partial<Record<EstadoCasa, string>> = { oculta: "?", certa: "✓", errada: "✗", revelada: "🔒" };

/** Retrato do personagem (ou as iniciais, se o app não tiver o desenho dele). */
export function RetratoPersonagem({ nome, avatar, classe }: { nome: string; avatar: string | null; classe: string }) {
  const iniciais = nome
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatar} alt={nome} className={`${classe} max-w-none shrink-0 bg-white object-cover`} />
  ) : (
    <span
      aria-label={nome}
      className={`${classe} flex items-center justify-center bg-gradient-to-br from-marca-500 to-marca-800 font-extrabold text-white`}
    >
      {iniciais}
    </span>
  );
}

/**
 * O caminho do tabuleiro: início, casas e chegada, com o personagem como peão.
 * peao: 0 = início, k = casa k (a partir de 1), n + 1 = chegada.
 * As casas são botões (tocar mostra a legenda da casa), assim um toque nelas
 * conta como clique num botão.
 */
export function CaminhoTabuleiro({
  personagem,
  avatar,
  estados,
  peao,
  legendas,
}: {
  personagem: string;
  avatar: string | null;
  estados: EstadoCasa[];
  peao: number;
  /** Texto que aparece ao tocar numa casa (null = nada a mostrar). */
  legendas?: (string | null)[];
}) {
  const n = estados.length;
  const pontos = posicoes(n);
  const [vendo, setVendo] = useState<number | null>(null);
  const legenda = vendo !== null ? legendas?.[vendo] : null;
  const alvo = pontos[Math.max(0, Math.min(n + 1, peao))];

  return (
    <div className="space-y-2">
      <div className="relative h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-marca-800 via-marca-700 to-marca-950 shadow-inner sm:h-64">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--color-marca-400) 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, var(--color-marca-400) 0 2px, transparent 3px)",
            backgroundSize: "48px 48px, 64px 64px",
          }}
        />
        <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
          <path
            d={estrada(pontos)}
            fill="none"
            stroke="var(--color-marca-950)"
            strokeOpacity={0.55}
            strokeWidth={34}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={estrada(pontos)}
            fill="none"
            stroke="var(--color-ouro-claro)"
            strokeWidth={4}
            strokeDasharray="2 12"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <span
          className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 border-marca-200 bg-marca-400 text-[10px] font-black text-white sm:h-12 sm:w-12"
          style={{ left: `${pontos[0].x}%`, top: `${pontos[0].y}%` }}
        >
          INÍCIO
        </span>
        <span
          aria-label="Chegada"
          className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 border-amber-100 bg-gradient-to-br from-ouro-claro via-ouro to-ouro-escuro text-2xl shadow-[0_0_20px_var(--color-ouro-claro)] sm:h-14 sm:w-14"
          style={{ left: `${pontos[n + 1].x}%`, top: `${pontos[n + 1].y}%` }}
        >
          🏆
        </span>

        {estados.map((estado, k) => {
          const { x, y } = pontos[k + 1];
          const temLegenda = Boolean(legendas?.[k]);
          return (
            <button
              key={k}
              type="button"
              aria-label={`Casa ${k + 1}`}
              onClick={() => setVendo(temLegenda && vendo !== k ? k : null)}
              className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 text-lg font-black transition sm:h-14 sm:w-14 sm:text-xl ${ESTILO[estado]} ${vendo === k ? "ring-4 ring-white/70" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {SIMBOLO[estado] ?? k + 1}
            </button>
          );
        })}

        <div
          aria-label={`${personagem} está ${peao === 0 ? "no início" : peao > n ? "na chegada" : `na casa ${peao}`}`}
          className="pointer-events-none absolute transition-all duration-500 ease-out"
          style={{ left: `${alvo.x}%`, top: `${alvo.y}%` }}
        >
          <div className="relative w-max -translate-x-1/2 -translate-y-[calc(100%+1.6rem)] sm:-translate-y-[calc(100%+2rem)]">
            <RetratoPersonagem
              nome={personagem}
              avatar={avatar}
              classe="h-14 w-14 rounded-full border-4 border-ouro shadow-lg sm:h-16 sm:w-16"
            />
            <span
              aria-hidden
              className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 border-x-8 border-t-[10px] border-x-transparent border-t-ouro"
            />
          </div>
        </div>
      </div>
      {legenda && (
        <p className="rounded-lg bg-marca-50 px-3 py-1.5 text-sm text-marca-900">
          <strong>Casa {vendo! + 1}:</strong> {legenda}
        </p>
      )}
    </div>
  );
}
