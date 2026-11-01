"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso, Botao, Etiqueta } from "@/components/ui";
import { eraPorId } from "@/lib/publico/regras";
import { NOME_DIFICULDADE, NOME_TIPO, type TipoQuestao } from "@/lib/questoes/tipos";
import { duplicarQuestao, excluirQuestao, mudarStatusQuestoes } from "../actions";

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

export function ListaQuestoes({ itens }: { itens: ItemLista[] }) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

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
      {erro && <Aviso>{erro}</Aviso>}
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {itens.map((q) => (
          <li key={q.id} className="flex gap-3 p-3">
            <input type="checkbox" className="mt-1" checked={selecionadas.has(q.id)} onChange={() => alternar(q.id)} />
            <div className="min-w-0 flex-1 space-y-1">
              <Link href={`/professor/questoes/${q.id}`} className="line-clamp-2 font-medium hover:text-marca-700">
                {q.temImagem && "🖼️ "}
                {q.enunciado}
              </Link>
              <div className="flex flex-wrap gap-1.5">
                <Etiqueta cor={q.status === "publicada" ? "verde" : "ambar"}>{q.status}</Etiqueta>
                <Etiqueta cor="azul">{NOME_TIPO[q.tipo]}</Etiqueta>
                {q.relampago && <Etiqueta cor="ambar">⚡ relâmpago</Etiqueta>}
                {q.era && <Etiqueta cor="azul">🌎 público · {eraPorId(q.era)?.nome ?? q.era}</Etiqueta>}
                {q.capitulo && <Etiqueta>{q.capitulo}</Etiqueta>}
                {q.habilidades.map((h) => (
                  <Etiqueta key={h}>{h}</Etiqueta>
                ))}
                <Etiqueta>{NOME_DIFICULDADE[q.dificuldade]}</Etiqueta>
                {q.origem === "claude" && <Etiqueta>gerada pelo Claude</Etiqueta>}
                <Etiqueta>{q.usos ? `usada em ${q.usos} desafio(s)` : "nunca usada"}</Etiqueta>
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
              <button
                className="text-red-700 hover:underline disabled:opacity-40"
                disabled={pendente || q.usos > 0}
                title={q.usos > 0 ? "Questão usada em desafio" : undefined}
                onClick={() => {
                  if (!confirm("Apagar esta questão?")) return;
                  iniciar(async () => setErro((await excluirQuestao(q.id))?.erro));
                }}
              >
                Apagar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
