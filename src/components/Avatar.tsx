import { ehEspecial, PERSONAGENS, TOTAL_PERSONAGENS } from "@/lib/personagens";

/** Cores que o aluno pode escolher (índice salvo em alunos.cor). */
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

// Fundo dos personagens especiais: dourado com raios.
const FUNDO_ESPECIAL =
  `<defs><radialGradient id="cq-especial"><stop offset="0" stop-color="#fff7cc"/><stop offset="1" stop-color="#f4b400"/></radialGradient></defs>` +
  `<rect width="100" height="100" fill="url(#cq-especial)"/>` +
  Array.from(
    { length: 12 },
    (_, i) => `<path d="M50 50 L44 -20 L56 -20 Z" fill="#fff" opacity=".35" transform="rotate(${i * 30} 50 50)"/>`,
  ).join("");

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
  const fundo = CORES_AVATAR[Math.abs(cor) % CORES_AVATAR.length];
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: tamanho, height: tamanho }}>
      <svg
        viewBox="0 0 100 100"
        width={tamanho}
        height={tamanho}
        aria-label={PERSONAGENS[indice].nome}
        role="img"
        className="rounded-full"
        style={especial ? { boxShadow: `0 0 0 ${Math.max(2, tamanho / 20)}px ${fundo}` } : undefined}
        dangerouslySetInnerHTML={{
          __html:
            (especial ? FUNDO_ESPECIAL : `<rect width="100" height="100" fill="${fundo}"/>`) + PERSONAGENS[indice].svg,
        }}
      />
      {medalhas > 0 && (
        <span
          className="absolute -right-1 -bottom-1 flex items-center rounded-full bg-white px-0.5 leading-none shadow"
          style={{ fontSize: Math.max(10, tamanho * 0.32) }}
          title={`${medalhas} ${medalhas === 1 ? "desafio vencido" : "desafios vencidos"}`}
        >
          🏅{medalhas > 1 && <span className="text-[0.7em] font-bold text-slate-700">{medalhas}</span>}
        </span>
      )}
    </span>
  );
}
