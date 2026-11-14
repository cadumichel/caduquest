"use client";
import { useEffect, type ReactNode } from "react";

/**
 * Modo foco: enquanto uma questão está na tela, o menu do aluno some e a área
 * útil alarga (ver `html[data-foco]` em globals.css). Só troca um atributo do
 * <html>: não cria elementos, para não disparar a vigia da pesquisa bloqueada.
 */
export function useModoFoco(ativo = true) {
  useEffect(() => {
    if (!ativo) return;
    const raiz = document.documentElement;
    raiz.dataset.foco = "1";
    return () => {
      delete raiz.dataset.foco;
    };
  }, [ativo]);
}

/** A partir deste tamanho de enunciado (ou com imagem), a tela larga divide em duas colunas. */
const ENUNCIADO_LONGO = 180;

/**
 * Disposição da questão no desafio, no treino e na revisão. Em tela larga, o
 * enunciado e a imagem ficam à esquerda (fixos ao rolar) e as alternativas à
 * direita, para caber sem rolagem. Questão curta e sem imagem fica numa coluna só.
 */
export function PalcoQuestao({
  topo,
  enunciado,
  imagemUrl,
  children,
}: {
  /** Barra de progresso, tempo e avisos: ocupa a largura toda. */
  topo?: ReactNode;
  enunciado: string;
  imagemUrl?: string | null;
  children: ReactNode;
}) {
  const duasColunas = Boolean(imagemUrl) || enunciado.length > ENUNCIADO_LONGO;
  return (
    <div className={`space-y-4 ${duasColunas ? "" : "mx-auto max-w-3xl"}`}>
      {topo}
      <div className={duasColunas ? "grid gap-4 xl:grid-cols-2 xl:items-start xl:gap-8" : "space-y-4"}>
        <div className={`space-y-4 ${duasColunas ? "xl:sticky xl:top-20" : ""}`}>
          {imagemUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagemUrl}
              alt=""
              draggable={false}
              className="pointer-events-none mx-auto max-h-80 w-auto rounded-xl border border-slate-200 xl:max-h-[60vh]"
            />
          )}
          <p className="text-lg font-medium whitespace-pre-line">{enunciado}</p>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}
