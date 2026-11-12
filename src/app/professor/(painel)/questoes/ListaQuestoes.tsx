"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Botao, Etiqueta } from "@/components/ui";
import { eraPorId } from "@/lib/publico/regras";
import { NOME_TIPO, type TipoQuestao } from "@/lib/questoes/tipos";
import { duplicarQuestao, mudarStatusQuestoes } from "../actions";

export type ItemLista = {
  id: string;
  tipo: TipoQuestao;
  enunciado: string;
  capitulo: string | null;
  habilidades: string[];
  dificuldade: number;
  status: "rascunho" | "publicada";
  origem: "manual" | "claude";
  temImagem: boolean;
  relampago: boolean;
  /** Era do desafio público, se a questão está no banco público. */
  era: string | null;
  usos: number;
};

/** mostrarStatus: só na aba "Todas"; mostrarCapitulo: fora de uma pasta de capítulo. */
export function ListaQuestoes({
  itens,
  mostrarStatus = false,
  mostrarCapitulo = true,
  revisao = false,
}: {
  itens: ItemLista[];
  mostrarStatus?: boolean;
  mostrarCapitulo?: boolean;
  /** Abre a questão no modo de revisão em sequência ("Publicar e próxima"). */
  revisao?: boolean;
}) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();

  const alternar = (id: string) =>
    setSelecionadas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const mudar = (status: "rascunho" | "publicada") =>
    iniciar(async () => {
      await mudarStatusQuestoes([...selecionadas], status);
      setSelecionadas(new Set());
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selecionadas.size === itens.length && itens.length > 0}
            onChange={(e) => setSelecionadas(e.target.checked ? new Set(itens.map((i) => i.id)) : new Set())}
          />
          Selecionar todas
        </label>
        <span className="text-slate-500">· {selecionadas.size} selecionadas</span>
        <Botao variante="secundario" disabled={!selecionadas.size || pendente} onClick={() => mudar("publicada")}>
          Publicar
        </Botao>
        <Botao variante="secundario" disabled={!selecionadas.size || pendente} onClick={() => mudar("rascunho")}>
          Voltar para rascunho
        </Botao>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {itens.map((q) => (
          <li key={q.id} className="flex gap-3 p-3">
            <input type="checkbox" className="mt-1" checked={selecionadas.has(q.id)} onChange={() => alternar(q.id)} />
            <div className="min-w-0 flex-1 space-y-1">
              <Link
                href={`/professor/questoes/${q.id}${revisao ? "?revisao=1" : ""}`}
                className="line-clamp-2 font-medium hover:text-marca-700"
              >
                {q.temImagem && "🖼️ "}
                {q.enunciado}
              </Link>
              <div className="flex flex-wrap gap-1.5">
                {mostrarStatus && <Etiqueta cor={q.status === "publicada" ? "verde" : "ambar"}>{q.status}</Etiqueta>}
                <Etiqueta cor="azul">{NOME_TIPO[q.tipo]}</Etiqueta>
                {q.relampago && <Etiqueta cor="ambar">⚡ relâmpago</Etiqueta>}
                {q.era && <Etiqueta cor="azul">🌎 público · {eraPorId(q.era)?.nome ?? q.era}</Etiqueta>}
                {mostrarCapitulo && q.capitulo && <Etiqueta>{q.capitulo}</Etiqueta>}
                {q.usos ? <Etiqueta>usada {q.usos}×</Etiqueta> : <Etiqueta cor="verde">nova</Etiqueta>}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1 text-sm">
              <button
                className="text-marca-700 hover:underline"
                disabled={pendente}
                onClick={() => iniciar(() => duplicarQuestao(q.id))}
              >
                Duplicar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
