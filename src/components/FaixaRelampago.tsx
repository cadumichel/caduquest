/** Aviso no topo da questão relâmpago, no jogo e na prévia do professor. */
export function FaixaRelampago({ tempo }: { tempo: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-3 py-2 text-center text-amber-950 shadow-md shadow-amber-300/50">
      <span className="absolute inset-y-[-20%] left-1/4 w-1/4 animate-[brilho_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent motion-reduce:hidden" />
      <p className="relative text-base font-black tracking-wide uppercase">
        <span className="inline-block animate-pulse motion-reduce:animate-none">⚡</span> Questão relâmpago
      </p>
      <p className="relative text-xs font-semibold">Pergunta direta: só {tempo} segundos. Responda rápido!</p>
    </div>
  );
}
