"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, Entrada, Subtitulo } from "@/components/ui";
import { RELAMPAGO_MAX_S, RELAMPAGO_MIN_S } from "@/lib/questoes/relampago";
import { tempoEfetivo, VERIFICACAO_MAX_S, VERIFICACAO_MIN_S } from "@/lib/questoes/tempos";
import { TEMPO_MAX_S, TEMPO_MIN_S } from "@/lib/questoes/tipos";
import { VERIFICACAO_TEMPO_S } from "@/lib/questoes/verificacao";
import { salvarTemposDesafio, type EstadoForm } from "../../actions";

export type QuestaoComTempo = {
  id: string;
  enunciado: string;
  relampago: boolean;
  /** Tempo da própria questão (banco). */
  tempoQuestao: number;
  /** Tempo escrito para ela neste desafio (null = automático). */
  tempoNoDesafio: number | null;
};

const paraTexto = (n: number | null) => (n === null ? "" : String(n));
const paraNumero = (t: string) => (t.trim() === "" ? null : Number(t));

/** Tempos de resposta do desafio: de cada questão e da verificação de leitura. Vazio = automático. */
export function TemposDesafio({
  id,
  todas: todasInicial,
  verificacao: verificacaoInicial,
  questoes,
}: {
  id: string;
  todas: number | null;
  verificacao: number | null;
  questoes: QuestaoComTempo[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<EstadoForm>({});
  const [todas, setTodas] = useState(paraTexto(todasInicial));
  const [verificacao, setVerificacao] = useState(paraTexto(verificacaoInicial));
  const [porQuestao, setPorQuestao] = useState<Record<string, string>>(() =>
    Object.fromEntries(questoes.map((q) => [q.id, paraTexto(q.tempoNoDesafio)])),
  );

  const fixo = paraNumero(todas);
  const salvar = () =>
    iniciar(async () => {
      const r = await salvarTemposDesafio(id, {
        todas: fixo,
        verificacao: paraNumero(verificacao),
        questoes: questoes.map((q) => ({ questao_id: q.id, tempo: paraNumero(porQuestao[q.id] ?? "") })),
      });
      setMsg(r);
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-4">
      <div>
        <Subtitulo>Tempo de resposta</Subtitulo>
        <p className="text-sm text-slate-600">
          Deixe em branco para o automático (aparece em cinza). Mudanças valem na hora, inclusive para quem está
          jogando.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Todas as questões (s)</span>
          <Entrada
            type="number"
            min={TEMPO_MIN_S}
            max={TEMPO_MAX_S}
            placeholder="O de cada questão"
            value={todas}
            onChange={(e) => setTodas(e.target.value)}
          />
          <span className="text-xs text-slate-500">Opcional. O tempo escrito numa questão abaixo vence este.</span>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">📖 Verificação de leitura (s)</span>
          <Entrada
            type="number"
            min={VERIFICACAO_MIN_S}
            max={VERIFICACAO_MAX_S}
            placeholder={`${VERIFICACAO_TEMPO_S} (automático)`}
            value={verificacao}
            onChange={(e) => setVerificacao(e.target.value)}
          />
          <span className="text-xs text-slate-500">
            Vale para todas as verificações deste desafio. De {VERIFICACAO_MIN_S} a {VERIFICACAO_MAX_S} s.
          </span>
        </label>
      </div>

      <ol className="divide-y divide-slate-100 text-sm">
        {questoes.map((q, i) => {
          const automatico = tempoEfetivo({ daQuestao: q.tempoQuestao, relampago: q.relampago, fixoDoDesafio: fixo });
          return (
            <li key={q.id} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate" title={q.enunciado}>
                {i + 1}. {q.relampago && "⚡ "}
                {q.enunciado}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <div className="w-24">
                  <Entrada
                    type="number"
                    aria-label={`Tempo da questão ${i + 1} (segundos)`}
                    min={q.relampago ? RELAMPAGO_MIN_S : TEMPO_MIN_S}
                    max={q.relampago ? RELAMPAGO_MAX_S : TEMPO_MAX_S}
                    placeholder={String(automatico)}
                    value={porQuestao[q.id] ?? ""}
                    onChange={(e) => setPorQuestao((p) => ({ ...p, [q.id]: e.target.value }))}
                  />
                </div>
                <span className="text-slate-500">s</span>
              </div>
            </li>
          );
        })}
      </ol>

      {msg.erro && <Aviso>{msg.erro}</Aviso>}
      {msg.ok && <Aviso tipo="ok">{msg.ok}</Aviso>}
      <Botao disabled={pendente} onClick={salvar}>
        {pendente ? "Salvando…" : "Salvar tempos"}
      </Botao>
    </div>
  );
}
