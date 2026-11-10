"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CamposRegras, regrasParaEnvio, regrasParaForm, type Regras } from "@/components/CamposRegras";
import { Aviso, Botao, Subtitulo } from "@/components/ui";
import type { DadosRegras } from "@/lib/questoes/regras-desafio";
import { salvarRegrasDesafio, type EstadoForm } from "../../actions";

/** Regras do desafio: sem consulta, questões, ajudas, pontos, gabarito e treino. */
export function RegrasDesafio({
  id,
  regras,
  pesquisaBloqueada,
  totalQuestoes,
  jaComecaram,
}: {
  id: string;
  regras: DadosRegras;
  pesquisaBloqueada: boolean;
  totalQuestoes: number;
  jaComecaram: number;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<EstadoForm>({});
  const [valor, setValor] = useState<Regras>(() => regrasParaForm(regras));

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarRegrasDesafio(id, regrasParaEnvio(valor));
      setMsg(r);
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-4">
      <div>
        <Subtitulo>Regras do desafio</Subtitulo>
        <p className="text-sm text-slate-600">
          Regras de sem consulta, ajudas, bônus, gabarito e treino valem na hora. Questões teste, ordem e alternativas
          são sorteadas quando o aluno começa
          {jaComecaram > 0 ? `: mudar agora só vale para quem ainda não começou (${jaComecaram} já começaram).` : "."}
        </p>
      </div>
      <CamposRegras
        valor={valor}
        onChange={setValor}
        pesquisaBloqueada={pesquisaBloqueada}
        totalQuestoes={totalQuestoes}
      />
      {msg.erro && <Aviso>{msg.erro}</Aviso>}
      {msg.ok && <Aviso tipo="ok">{msg.ok}</Aviso>}
      <Botao disabled={pendente} onClick={salvar}>
        {pendente ? "Salvando…" : "Salvar regras"}
      </Botao>
    </div>
  );
}
