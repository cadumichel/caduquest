"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Trava = { release: () => Promise<void> };

/**
 * Busca o ranking de novo a cada `segundos` (sem recarregar a página), põe em tela cheia
 * e pede para a tela não apagar enquanto projeta.
 */
export function ControlesProjetor({
  segundos,
  atualizadoEm,
  voltar,
}: {
  segundos: number;
  atualizadoEm: string;
  voltar: string;
}) {
  const router = useRouter();
  const [telaCheia, setTelaCheia] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(timer);
  }, [router, segundos]);

  useEffect(() => {
    // Sem a trava, o Chromebook apaga a tela depois de alguns minutos sem ninguém mexer.
    let trava: Trava | null = null;
    const pedir = (atualizar: boolean) => {
      if (document.visibilityState !== "visible") return;
      const wakeLock = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Trava> } }).wakeLock;
      wakeLock
        ?.request("screen")
        .then((t) => (trava = t))
        .catch(() => {});
      // Voltando para a aba, atualiza na hora em vez de esperar o próximo minuto.
      if (atualizar) router.refresh();
    };
    pedir(false);
    const voltou = () => pedir(true);
    document.addEventListener("visibilitychange", voltou);
    const mudouTela = () => setTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", mudouTela);
    return () => {
      document.removeEventListener("visibilitychange", voltou);
      document.removeEventListener("fullscreenchange", mudouTela);
      trava?.release().catch(() => {});
    };
  }, [router]);

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-[1.8vh] text-marca-200">
      <span>
        Atualizado às {atualizadoEm} · atualiza sozinho a cada {segundos >= 60 ? "minuto" : `${segundos} s`}
      </span>
      <button
        type="button"
        onClick={alternarTelaCheia}
        className="rounded-lg border border-marca-400 px-3 py-1.5 font-semibold text-white hover:bg-marca-700"
      >
        {telaCheia ? "Sair da tela cheia" : "⛶ Tela cheia"}
      </button>
      {!telaCheia && (
        <Link href={voltar} className="rounded-lg px-3 py-1.5 font-semibold text-white hover:bg-marca-700">
          ← Voltar ao painel
        </Link>
      )}
    </div>
  );
}
