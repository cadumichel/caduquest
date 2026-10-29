import Image from "next/image";
import { ehEspecial, PERSONAGENS, TOTAL_PERSONAGENS } from "@/lib/personagens";

/** Cores da moldura que o aluno pode escolher (índice salvo em alunos.cor). */
export const CORES_AVATAR = [
  "#6366f1",
  "#3b82f6",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#64748b",
] as const;

export { TOTAL_PERSONAGENS as TOTAL_AVATARES } from "@/lib/personagens";

export function Avatar({
  avatar,
  cor,
  medalhas = 0,
  tamanho = 40,
  className = "",
}: {
  avatar: number;
  cor: number;
  medalhas?: number;
  tamanho?: number;
  className?: string;
}) {
  const indice = Math.abs(avatar) % TOTAL_PERSONAGENS;
  const especial = ehEspecial(indice);
  const moldura = CORES_AVATAR[Math.abs(cor) % CORES_AVATAR.length];
  const personagem = PERSONAGENS[indice];
  // Os especiais já têm moldura dourada na ilustração; nos básicos a moldura é a cor do aluno.
  const borda = especial ? 0 : Math.max(2, Math.round(tamanho / 18));
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: tamanho, height: tamanho }}>
      {especial && (
        // Aura dourada girando atrás do especial, com brilho em volta.
        <span
          aria-hidden
          className="absolute -inset-[9%] animate-[girar_4s_linear_infinite] rounded-full motion-reduce:animate-none"
          style={{
            background: "conic-gradient(#fde68a, #f59e0b, #fff7d6, #d97706, #fde68a, #fbbf24, #fde68a)",
            boxShadow: `0 0 ${Math.round(tamanho * 0.22)}px ${Math.round(tamanho * 0.04)}px rgba(251, 191, 36, 0.7)`,
          }}
        />
      )}
      <Image
        src={personagem.imagem}
        alt={personagem.nome}
        width={tamanho}
        height={tamanho}
        className="relative size-full rounded-full"
        style={{ boxShadow: borda ? `0 0 0 ${borda}px ${moldura}` : undefined }}
      />
      {especial && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-y-[-20%] left-1/4 w-1/4 animate-[brilho_3.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:hidden" />
          </span>
          {tamanho >= 32 && (
            <span
              aria-hidden
              className="absolute -top-[6%] -left-[6%] animate-[cintilar_1.8s_ease-in-out_infinite] leading-none text-amber-300 drop-shadow motion-reduce:animate-none"
              style={{ fontSize: Math.max(10, tamanho * 0.28) }}
            >
              ✦
            </span>
          )}
        </>
      )}
      {medalhas > 0 && (
        <span
          className="absolute -right-1 -bottom-1 flex items-center gap-px rounded-full bg-white py-px pr-1 pl-px leading-none shadow"
          style={{ fontSize: Math.max(10, tamanho * 0.3) }}
          title={`${medalhas} ${medalhas === 1 ? "desafio vencido" : "desafios vencidos"}`}
        >
          <Image src="/ilustracoes/medalha-ouro.png" alt="" width={32} height={32} className="size-[1.1em]" />
          {medalhas > 1 && <span className="text-[0.75em] font-bold text-marca-900">{medalhas}</span>}
        </span>
      )}
    </span>
  );
}
