"use client";

/** Abre a impressão do navegador (de onde também se salva em PDF). */
export function BotaoImprimir({ children = "🖨️ Imprimir ou salvar em PDF" }: { children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-marca-600 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-700 print:hidden"
    >
      {children}
    </button>
  );
}
