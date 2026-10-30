"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Botao, Etiqueta, Subtitulo } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { definirGabaritoManual, encerrarDesafioAgora, liberarGabarito, type EstadoForm } from "../../actions";

/** Encerrar antes do prazo e decidir quando o gabarito aparece para os alunos. */
export function ControlesDesafio({
  id,
  relampago,
  situacao,
  fechaEm,
  manual,
  liberadoEm,
  visivelEm,
  visivel,
}: {
  id: string;
  relampago: boolean;
  situacao: "agendado" | "aberto" | "encerrado";
  fechaEm: string;
  manual: boolean;
  liberadoEm: string | null;
  /** Quando o gabarito aparece sozinho (prazo + janela de quem ainda respondia). */
  visivelEm: string;
  visivel: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<EstadoForm>({});
  const [pendente, iniciar] = useTransition();
  const rodar = (acao: () => Promise<EstadoForm>) =>
    iniciar(async () => {
      setMsg(await acao());
      router.refresh();
    });

  const status = visivel
    ? { cor: "verde" as const, texto: "Gabarito visível para os alunos" }
    : manual && !liberadoEm
      ? { cor: "ambar" as const, texto: "Gabarito guardado até você liberar" }
      : { cor: "cinza" as const, texto: `Gabarito aparece em ${formatarDataHora(visivelEm)}` };

  return (
    <div className="space-y-3">
      <Subtitulo>Prazo e gabarito</Subtitulo>
      <Etiqueta cor={status.cor}>{status.texto}</Etiqueta>

      {/* O CaduRush tem o próprio botão de encerrar no painel laranja. */}
      {!relampago && situacao === "aberto" && (
        <div>
          <Botao
            variante="perigo"
            disabled={pendente}
            onClick={() =>
              confirm(
                `Encerrar o desafio agora (o prazo era ${formatarDataHora(fechaEm)})? Quem estiver numa questão termina só ela; quem não fez perde o desafio.`,
              ) && rodar(() => encerrarDesafioAgora(id))
            }
          >
            Encerrar agora
          </Botao>
        </div>
      )}

      <fieldset className="space-y-2 text-sm">
        <legend className="mb-1 font-medium text-slate-700">Quando o aluno vê o gabarito</legend>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            className="mt-1"
            name={`gabarito-${id}`}
            checked={!manual}
            disabled={pendente}
            onChange={() => rodar(() => definirGabaritoManual(id, false))}
          />
          <span>
            Sozinho, quando o prazo acabar
            <span className="block text-xs text-slate-500">
              Uns 3 minutos depois do fechamento, quando ninguém mais pode estar respondendo.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="radio"
            className="mt-1"
            name={`gabarito-${id}`}
            checked={manual}
            disabled={pendente}
            onChange={() => rodar(() => definirGabaritoManual(id, true))}
          />
          <span>
            Só quando eu liberar
            <span className="block text-xs text-slate-500">
              Útil para corrigir junto em sala ou guardar as questões para outra turma.
            </span>
          </span>
        </label>
      </fieldset>

      {manual && !liberadoEm && (
        <Botao
          variante="sucesso"
          disabled={pendente || situacao !== "encerrado"}
          title={situacao !== "encerrado" ? "Encerre o desafio antes de liberar o gabarito." : undefined}
          onClick={() => confirm("Liberar o gabarito para os alunos agora?") && rodar(() => liberarGabarito(id))}
        >
          Liberar gabarito
        </Botao>
      )}
      {manual && liberadoEm && (
        <p className="text-xs text-slate-500">Você liberou o gabarito em {formatarDataHora(liberadoEm)}.</p>
      )}

      {msg.erro && <Aviso>{msg.erro}</Aviso>}
      {msg.ok && <Aviso tipo="ok">{msg.ok}</Aviso>}
    </div>
  );
}
