/**
 * Ícone de cada era do desafio público. A Pré-História usa um desenho de pedra
 * lascada (biface), que não existe como emoji; as outras eras usam o emoji.
 */
import { eraPorId } from "@/lib/publico/regras";

export function PedraLascada({ tamanho = "1em" }: { tamanho?: string | number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      role="img"
      aria-label="Pedra lascada"
      className="inline-block align-[-0.15em]"
    >
      {/* Biface: contorno irregular, com a borda serrilhada das lascas */}
      <path
        d="M30 3 L35 8 L38 14 L43 19 L45 26 L50 31 L50 39 L53 45 L49 52 L44 57 L36 61 L27 60 L19 56 L14 49 L12 41 L15 34 L16 26 L21 19 L24 12 Z"
        fill="#b08d63"
        stroke="#3f2e1e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Negativos das lascas: cada face num tom do sílex */}
      <path d="M30 3 L35 8 L33 18 L26 16 L24 12 Z" fill="#d9c09b" />
      <path d="M35 8 L38 14 L43 19 L37 25 L33 18 Z" fill="#8c6a45" />
      <path d="M24 12 L26 16 L33 18 L29 27 L21 19 Z" fill="#9c7a52" />
      <path d="M43 19 L45 26 L50 31 L41 34 L37 25 Z" fill="#cfb38c" />
      <path d="M21 19 L29 27 L24 35 L15 34 L16 26 Z" fill="#c9ab82" />
      <path d="M33 18 L37 25 L41 34 L33 39 L29 27 Z" fill="#e3cfae" />
      <path d="M29 27 L33 39 L26 45 L24 35 Z" fill="#a5835a" />
      <path d="M50 31 L50 39 L53 45 L43 46 L41 34 Z" fill="#8c6a45" />
      <path d="M15 34 L24 35 L26 45 L17 50 L12 41 Z" fill="#9c7a52" />
      <path d="M41 34 L43 46 L36 50 L33 39 Z" fill="#c9ab82" />
      <path d="M33 39 L36 50 L28 54 L26 45 Z" fill="#dcc4a0" />
      <path d="M53 45 L49 52 L44 57 L36 50 L43 46 Z" fill="#b08d63" />
      <path d="M17 50 L26 45 L28 54 L27 60 L19 56 Z" fill="#cfb38c" />
      <path d="M36 50 L44 57 L36 61 L27 60 L28 54 Z" fill="#8c6a45" />
      {/* Arestas entre as lascas */}
      <path
        d="M35 8 L33 18 L26 16 L24 12 M33 18 L37 25 L43 19 M26 16 L21 19 M33 18 L29 27 L21 19 M37 25 L41 34 L50 31 M29 27 L24 35 L15 34 M37 25 L29 27 M41 34 L33 39 L29 27 M33 39 L26 45 L24 35 M41 34 L43 46 L53 45 M24 35 L26 45 L17 50 M43 46 L36 50 L33 39 M36 50 L28 54 L26 45 M43 46 L44 57 M36 50 L44 57 M28 54 L27 60 M28 54 L36 61 M17 50 L19 56"
        fill="none"
        stroke="#3f2e1e"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

export function IconeEra({ era, tamanho }: { era: string; tamanho?: string | number }) {
  if (era === "pre_historia") return <PedraLascada tamanho={tamanho} />;
  return <span aria-hidden>{eraPorId(era)?.emoji}</span>;
}
