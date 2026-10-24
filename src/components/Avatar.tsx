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

export const TOTAL_AVATARES = 20;

const TRACO = { stroke: "#1e293b", strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };

// 5 olhos × 4 bocas = 20 carinhas (avatar = olhos * 4 + boca).
function Olhos({ tipo }: { tipo: number }) {
  switch (tipo) {
    case 0: // pontos
      return (
        <>
          <circle cx="35" cy="42" r="4.5" fill="#1e293b" />
          <circle cx="65" cy="42" r="4.5" fill="#1e293b" />
        </>
      );
    case 1: // felizes
      return (
        <>
          <path d="M28 44 Q35 35 42 44" {...TRACO} />
          <path d="M58 44 Q65 35 72 44" {...TRACO} />
        </>
      );
    case 2: // piscando
      return (
        <>
          <circle cx="35" cy="42" r="4.5" fill="#1e293b" />
          <path d="M58 43 L72 43" {...TRACO} />
        </>
      );
    case 3: // grandes
      return (
        <>
          <circle cx="35" cy="41" r="9" fill="#fff" />
          <circle cx="65" cy="41" r="9" fill="#fff" />
          <circle cx="37" cy="43" r="4.5" fill="#1e293b" />
          <circle cx="67" cy="43" r="4.5" fill="#1e293b" />
        </>
      );
    default: // óculos escuros
      return (
        <>
          <rect x="22" y="34" width="24" height="15" rx="6" fill="#1e293b" />
          <rect x="54" y="34" width="24" height="15" rx="6" fill="#1e293b" />
          <path d="M46 40 L54 40" {...TRACO} />
        </>
      );
  }
}

function Boca({ tipo }: { tipo: number }) {
  switch (tipo) {
    case 0: // sorriso
      return <path d="M34 63 Q50 76 66 63" {...TRACO} />;
    case 1: // risada
      return <path d="M32 60 Q50 84 68 60 Z" fill="#1e293b" />;
    case 2: // língua
      return (
        <>
          <path d="M34 62 Q50 74 66 62" {...TRACO} />
          <path d="M45 67 Q50 80 55 67 Z" fill="#f43f5e" />
        </>
      );
    default: // surpresa
      return <ellipse cx="50" cy="67" rx="6" ry="7.5" fill="#1e293b" />;
  }
}

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
  const indice = Math.abs(avatar) % TOTAL_AVATARES;
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} aria-hidden>
        <circle cx="50" cy="50" r="50" fill={CORES_AVATAR[Math.abs(cor) % CORES_AVATAR.length]} />
        <circle cx="50" cy="52" r="36" fill="#fde68a" />
        <Olhos tipo={Math.floor(indice / 4)} />
        <Boca tipo={indice % 4} />
      </svg>
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
