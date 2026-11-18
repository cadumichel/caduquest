"use client";

export const LETRAS = "ABCDEF";
/**
 * Cores das caixas de ordenar e dos pares ligados: bolinha forte e fundo claro
 * (texto escuro continua legível). Sem âmbar, que marca o item revelado pela
 * eliminação. A cor acompanha a frase ou o par do aluno, nunca a resposta certa.
 */
export const CORES = [
  { ponto: "bg-sky-500", borda: "border-sky-300", fundo: "bg-sky-100" },
  { ponto: "bg-orange-500", borda: "border-orange-300", fundo: "bg-orange-100" },
  { ponto: "bg-emerald-500", borda: "border-emerald-300", fundo: "bg-emerald-100" },
  { ponto: "bg-pink-500", borda: "border-pink-300", fundo: "bg-pink-100" },
  { ponto: "bg-lime-600", borda: "border-lime-300", fundo: "bg-lime-100" },
  { ponto: "bg-violet-500", borda: "border-violet-300", fundo: "bg-violet-100" },
];
export const cor = (i: number) => {
  const c = CORES[i % CORES.length];
  return { ...c, caixa: `${c.borda} ${c.fundo}` };
};

/** Selo dos itens que a eliminação travou no lugar certo. */
export function Cadeado() {
  return (
    <span aria-label="Revelado pela eliminação" title="Revelado pela eliminação" className="shrink-0 text-sm">
      🔒
    </span>
  );
}

