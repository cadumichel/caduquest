"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Aviso, Botao } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { encerrarRelampagoAgora, liberarRelampagoAgora, novoCodigoRelampago, type EstadoForm } from "../../actions";

/** Controle do CaduRush na aula: código do dia em destaque, liberar e encerrar. */
export function PainelRelampago({
  id,
  codigo,
  situacao,
  abreEm,
  fechaEm,
  concluiram,
  total,
}: {
  id: string;
  codigo: string;
  situacao: "agendado" | "aberto" | "encerrado";
  abreEm: string;
  fechaEm: string;
  concluiram: number;
  total: number;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<EstadoForm>({});
  const [pendente, iniciar] = useTransition();
  const [projetor, setProjetor] = useState(false);

  // Durante a aula, atualiza a contagem de quem já terminou.
  useEffect(() => {
    if (situacao !== "aberto") return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [situacao, router]);

  const rodar = (acao: (id: string) => Promise<EstadoForm>) =>
    iniciar(async () => {
      setMsg(await acao(id));
      router.refresh();
    });

  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-6 text-white shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest uppercase">⚡ CaduRush · em sala</p>
          <p className="mt-1 text-sm text-white/90">
            {situacao === "agendado" && `Abre ${formatarDataHora(abreEm)} e fecha ${formatarDataHora(fechaEm)}.`}
            {situacao === "aberto" && `Aberto até ${formatarDataHora(fechaEm)} · ${concluiram}/${total} terminaram`}
            {situacao === "encerrado" &&
              `Encerrado em ${formatarDataHora(fechaEm)} · ${concluiram}/${total} terminaram`}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold tracking-wide uppercase">Código do dia</p>
          <p className="font-mono text-5xl font-black tracking-[0.2em]">{codigo}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {situacao !== "aberto" && (
          <Botao
            disabled={pendente}
            className="bg-white text-orange-700! hover:bg-orange-50"
            onClick={() => {
              const pergunta =
                situacao === "encerrado"
                  ? "Reabrir o CaduRush agora? Quem já terminou não joga de novo."
                  : "Liberar o CaduRush agora para a turma?";
              if (confirm(pergunta)) rodar(liberarRelampagoAgora);
            }}
          >
            ⚡ Liberar agora
          </Botao>
        )}
        {situacao === "aberto" && (
          <Botao
            disabled={pendente}
            variante="secundario"
            onClick={() => confirm("Encerrar o CaduRush agora?") && rodar(encerrarRelampagoAgora)}
          >
            Encerrar agora
          </Botao>
        )}
        <Botao variante="secundario" disabled={pendente} onClick={() => setProjetor(true)}>
          Mostrar no projetor
        </Botao>
        <Botao
          variante="fantasma"
          disabled={pendente}
          className="text-white!"
          onClick={() => confirm("Gerar um novo código? O atual deixa de valer.") && rodar(novoCodigoRelampago)}
        >
          Trocar código
        </Botao>
      </div>
      {msg.erro && (
        <div className="mt-3">
          <Aviso>{msg.erro}</Aviso>
        </div>
      )}
      {msg.ok && <p className="mt-3 text-sm font-semibold">{msg.ok}</p>}
      <p className="mt-3 text-xs text-white/80">
        Os alunos só começam com o código. O desafio fecha sozinho no horário; quem estiver numa questão termina a
        questão atual.
      </p>

      {projetor && (
        <button
          type="button"
          onClick={() => setProjetor(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 text-white"
        >
          <span className="text-4xl font-black tracking-widest uppercase">⚡ CaduRush</span>
          <span className="text-2xl">Entre no CaduQuest e digite o código:</span>
          <span className="font-mono text-[22vw] leading-none font-black tracking-[0.15em]">{codigo}</span>
          <span className="text-sm text-white/80">Toque para fechar</span>
        </button>
      )}
    </section>
  );
}
