"use client";
import { useEffect, useState } from "react";

/** Botão que abre o código da turma em tela cheia, com letras grandes, para projetar no quadro. */
export function CodigoNoQuadro({ codigo, turma }: { codigo: string; turma: string }) {
  const [aberto, setAberto] = useState(false);
  const [endereco, setEndereco] = useState("");

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", fechar);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      window.removeEventListener("keydown", fechar);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEndereco(`${window.location.host}/entrar`);
          setAberto(true);
        }}
        className="rounded-xl border border-marca-200 bg-white px-3 py-2 text-left hover:border-marca-400 hover:bg-marca-50"
        title="Abre o código em tela cheia para projetar"
      >
        <span className="block text-xs text-slate-500">Código de acesso · 📺 mostrar no quadro</span>
        <span className="font-mono text-2xl font-bold tracking-[0.2em] text-marca-700">{codigo}</span>
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Código da turma ${turma}`}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-6 bg-gradient-to-br from-marca-950 via-marca-900 to-marca-800 p-6 text-center text-white"
          onClick={() => setAberto(false)}
        >
          <p className="text-2xl text-marca-200 sm:text-3xl">Turma {turma} · entre em</p>
          <p className="text-4xl font-bold sm:text-6xl">{endereco}</p>
          <p className="font-mono text-[18vw] leading-none font-black tracking-[0.15em] text-ouro sm:text-[14vw]">
            {codigo}
          </p>
          <p className="text-lg text-marca-200">Clique em qualquer lugar ou aperte Esc para fechar</p>
        </div>
      )}
    </>
  );
}
