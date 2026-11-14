"use client";
import { useEffect, useRef, useState } from "react";
import { Gabarito } from "@/components/Gabarito";
import { Citacao, Documento } from "@/components/QuestaoInterativa";
import { itensDaQuestao } from "@/lib/questoes/relampago";
import { NOME_TIPO, type Conteudo } from "@/lib/questoes/tipos";

export type SlideQuadro = {
  id: string;
  desafio: string;
  enunciado: string;
  imagemUrl: string | null;
  conteudo: Conteudo;
  /** Alternativas na ordem original, nos formatos de escolha única. */
  alternativas: { opcoes: string[]; correta: number } | null;
  explicacao: string | null;
  acerto: number;
  respostas: number;
  distribuicao: number[] | null;
  semEscolha: number;
};

const LETRAS = "ABCDEF";
/** 0 = só a questão; 1 = como a turma respondeu; 2 = gabarito e explicação. */
const PASSOS = ["Mostrar respostas da turma", "Mostrar gabarito"] as const;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** As questões mais erradas, uma por vez: questão, respostas da turma e gabarito. */
export function RevisaoNoQuadro({ slides, turma }: { slides: SlideQuadro[]; turma: string }) {
  const [indice, setIndice] = useState(0);
  const [passo, setPasso] = useState(0);
  const [telaCheia, setTelaCheia] = useState(false);
  const palco = useRef<HTMLDivElement>(null);
  const slide = slides[indice];
  const ultimo = indice === slides.length - 1;

  useEffect(() => {
    const mudou = () => setTelaCheia(document.fullscreenElement === palco.current);
    document.addEventListener("fullscreenchange", mudou);
    return () => document.removeEventListener("fullscreenchange", mudou);
  }, []);

  const ir = (novo: number) => {
    setIndice(Math.max(0, Math.min(slides.length - 1, novo)));
    setPasso(0);
  };
  const avancar = () => (passo < 2 ? setPasso(passo + 1) : !ultimo && ir(indice + 1));
  const voltar = () => (passo > 0 ? setPasso(passo - 1) : ir(indice - 1));

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        avancar();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        voltar();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else palco.current?.requestFullscreen?.().catch(() => {});
  };

  const { alternativas, distribuicao } = slide;
  const maior = Math.max(1, ...(distribuicao ?? []));

  return (
    <div
      ref={palco}
      className={`flex w-full flex-col gap-5 bg-white ${telaCheia ? "h-screen overflow-y-auto p-8 text-xl" : "rounded-2xl border border-slate-200 p-5 text-lg shadow-sm"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>
          Turma {turma} · questão {indice + 1} de {slides.length} · {slide.desafio} · {NOME_TIPO[slide.conteudo.tipo]}
        </span>
        <button
          type="button"
          onClick={alternarTelaCheia}
          className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          {telaCheia ? "Sair da tela cheia" : "📺 Tela cheia"}
        </button>
      </div>

      <div className={`grid flex-1 content-start gap-6 ${slide.imagemUrl ? "lg:grid-cols-[2fr_3fr]" : ""}`}>
        {slide.imagemUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.imagemUrl} alt="" className="max-h-[60vh] w-full rounded-xl object-contain" />
        )}
        <div className="space-y-5">
          <p className={`leading-snug font-semibold text-slate-900 ${telaCheia ? "text-3xl" : "text-2xl"}`}>
            {slide.enunciado}
          </p>

          {alternativas ? (
            <>
              {slide.conteudo.tipo === "quem_disse" && <Citacao texto={slide.conteudo.conteudo.citacao} />}
              {slide.conteudo.tipo === "interpretacao" && <Documento texto={slide.conteudo.conteudo.texto} />}
              <ul className="space-y-2">
                {alternativas.opcoes.map((texto, i) => {
                  const certa = passo === 2 && i === alternativas.correta;
                  const marcaram = distribuicao?.[i] ?? 0;
                  return (
                    <li
                      key={i}
                      className={`rounded-xl border px-4 py-3 ${certa ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`font-bold ${certa ? "text-emerald-700" : "text-marca-700"}`}>
                          {LETRAS[i]})
                        </span>
                        <span className={`flex-1 ${certa ? "font-semibold text-emerald-900" : ""}`}>
                          {texto} {certa && "✓"}
                        </span>
                        {passo >= 1 && (
                          <span className="font-bold whitespace-nowrap text-slate-700">
                            {marcaram} {marcaram === 1 ? "aluno" : "alunos"}
                          </span>
                        )}
                      </div>
                      {passo >= 1 && (
                        <div className="mt-2 h-3 rounded-full bg-slate-100">
                          <div
                            className={`h-3 rounded-full ${certa ? "bg-emerald-500" : "bg-marca-500"}`}
                            style={{ width: `${(marcaram / maior) * 100}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {passo >= 1 && slide.semEscolha > 0 && (
                <p className="text-base text-slate-500">
                  {slide.semEscolha} {slide.semEscolha === 1 ? "aluno ficou" : "alunos ficaram"} sem resposta (tempo
                  esgotado ou questão zerada).
                </p>
              )}
            </>
          ) : (
            <div className="[&_.text-sm]:text-lg [&_.text-xs]:text-base">
              {passo === 2 ? (
                <Gabarito conteudo={slide.conteudo} />
              ) : (
                <ul className="space-y-2">
                  {itensDaQuestao(slide.conteudo).map((item, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 px-4 py-3">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {passo >= 1 && (
            <p className="rounded-xl bg-marca-50 px-4 py-3 font-semibold text-marca-900">
              Acerto da turma: {pct(slide.acerto)} · {slide.respostas} respostas
            </p>
          )}
          {passo === 2 && slide.explicacao && (
            <p className="rounded-xl border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 whitespace-pre-line text-emerald-950">
              {slide.explicacao}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-base">
        <button
          type="button"
          onClick={voltar}
          disabled={indice === 0 && passo === 0}
          className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          ← Voltar
        </button>
        <div className="flex gap-1.5" aria-hidden>
          {slides.map((s, i) => (
            <span key={s.id} className={`h-2.5 w-2.5 rounded-full ${i === indice ? "bg-marca-600" : "bg-slate-300"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={avancar}
          disabled={ultimo && passo === 2}
          className="rounded-xl bg-marca-600 px-5 py-2 font-semibold text-white hover:bg-marca-700 disabled:opacity-40"
        >
          {passo < 2 ? PASSOS[passo] : ultimo ? "Fim da revisão" : "Próxima questão →"}
        </button>
      </div>
    </div>
  );
}
