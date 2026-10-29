/**
 * Personalização do cartão do perfil. Os fundos são liberados pelo nível (e o
 * dourado por vencer um desafio); o título vem das conquistas do aluno.
 */

export type Fundo = {
  nome: string;
  /** Classes do gradiente (literais, para o Tailwind encontrar). */
  classes: string;
  imagem?: string;
  nivel: number;
  /** Exige ter vencido ao menos um desafio. */
  vencedor?: boolean;
};

export const FUNDOS: Fundo[] = [
  { nome: "CaduQuest", classes: "from-marca-600 via-marca-800 to-marca-950", nivel: 1 },
  {
    nome: "Areias do Egito",
    classes: "from-amber-500 via-orange-700 to-stone-900",
    imagem: "/ilustracoes/fundo-egito.webp",
    nivel: 2,
  },
  {
    nome: "Mármore grego",
    classes: "from-sky-500 via-blue-800 to-slate-950",
    imagem: "/ilustracoes/fundo-grecia.webp",
    nivel: 3,
  },
  {
    nome: "Castelo medieval",
    classes: "from-emerald-600 via-emerald-900 to-stone-950",
    imagem: "/ilustracoes/fundo-medieval.webp",
    nivel: 5,
  },
  {
    nome: "Era industrial",
    classes: "from-slate-500 via-zinc-800 to-neutral-950",
    imagem: "/ilustracoes/fundo-industrial.webp",
    nivel: 7,
  },
  { nome: "Lenda dourada", classes: "from-yellow-400 via-amber-600 to-amber-900", nivel: 1, vencedor: true },
];

export function fundoLiberado(i: number, { nivel, medalhas }: { nivel: number; medalhas: number }) {
  const f = FUNDOS[i];
  return Boolean(f) && nivel >= f.nivel && (!f.vencedor || medalhas > 0);
}

export const fundoDoAluno = (i: number | null | undefined) => FUNDOS[i ?? 0] ?? FUNDOS[0];
