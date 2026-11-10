"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CamposRegras, regrasParaEnvio, type Regras } from "@/components/CamposRegras";
import { Aviso, Botao, Subtitulo } from "@/components/ui";
import type { RegraCliques } from "@/lib/tela-protegida";
import { salvarRegrasDesafio, type EstadoForm } from "../../actions";

/** Regras do desafio: cliques fora das alternativas e número de questões teste. */
export function RegrasDesafio({
  id,
  regraCliques,
  tolerancia,
  verificacoes,
  pesquisaBloqueada,
  totalQuestoes,
  jaComecaram,
}: {
  id: string;
  regraCliques: RegraCliques;
  tolerancia: number;
  verificacoes: number | null;
  pesquisaBloqueada: boolean;
  totalQuestoes: number;
  jaComecaram: number;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<EstadoForm>({});
  const [valor, setValor] = useState<Regras>({
    regraCliques,
    tolerancia: String(tolerancia),
    verificacoes: verificacoes === null ? "" : String(verificacoes),
  });

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
          A regra de cliques vale na hora, inclusive para quem está jogando. As questões teste são sorteadas quando o
          aluno começa
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
