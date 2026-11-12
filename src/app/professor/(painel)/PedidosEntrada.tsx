import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { Botao, Cartao, Subtitulo } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { aprovarAluno, aprovarTodos, removerAluno } from "./actions";

/** Aluno que pediu para entrar numa turma e espera a aprovação do professor. */
export type PedidoEntrada = {
  id: string;
  turma_id: string;
  apelido: string;
  nome_real: string | null;
  avatar: number;
  cor: number;
  criado_em: string;
  turmas?: { nome: string; escolas?: { nome: string } | null } | null;
};

/** Colunas que a consulta de alunos precisa trazer para montar a lista. */
export const COLUNAS_PEDIDO = "id, turma_id, apelido, nome_real, avatar, cor, criado_em, turmas(nome, escolas(nome))";

/**
 * Pedidos de novos logins, agrupados por turma, com Aprovar e Recusar.
 * Aparece no Início, em Turmas e no topo de cada turma. Some quando não há pedidos.
 */
export function PedidosEntrada({ pedidos, mostrarTurma = true }: { pedidos: PedidoEntrada[]; mostrarTurma?: boolean }) {
  if (!pedidos.length) return null;
  const porTurma = new Map<string, PedidoEntrada[]>();
  for (const p of pedidos) porTurma.set(p.turma_id, [...(porTurma.get(p.turma_id) ?? []), p]);

  return (
    <Cartao className="border-amber-300 bg-amber-50">
      <Subtitulo>
        {pedidos.length === 1 ? "1 pedido de entrada" : `${pedidos.length} pedidos de entrada`} esperando aprovação
      </Subtitulo>
      <div className="space-y-4">
        {[...porTurma].map(([turmaId, lista]) => {
          const turma = lista[0].turmas;
          return (
            <div key={turmaId}>
              {(mostrarTurma || lista.length > 1) && (
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  {mostrarTurma ? (
                    <Link href={`/professor/turmas/${turmaId}`} className="text-sm font-semibold text-marca-800">
                      Turma {turma?.nome ?? ""}
                      {turma?.escolas?.nome && (
                        <span className="font-normal text-slate-500"> · {turma.escolas.nome}</span>
                      )}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {lista.length > 1 && (
                    <form action={aprovarTodos.bind(null, turmaId)}>
                      <Botao variante="sucesso">Aprovar os {lista.length}</Botao>
                    </form>
                  )}
                </div>
              )}
              <ul className="divide-y divide-amber-200">
                {lista.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <Avatar avatar={a.avatar} cor={a.cor} tamanho={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {a.nome_real ?? "Sem nome informado"}{" "}
                        <span className="font-normal text-slate-600">· {a.apelido}</span>
                      </p>
                      <p className="text-xs text-slate-500">Pedido em {formatarDataHora(a.criado_em)}</p>
                    </div>
                    <form action={aprovarAluno.bind(null, a.id)}>
                      <Botao>Aprovar</Botao>
                    </form>
                    <BotaoConfirmar
                      acao={removerAluno.bind(null, a.id)}
                      pergunta={`Recusar o pedido de ${a.apelido}? O cadastro será apagado.`}
                    >
                      Recusar
                    </BotaoConfirmar>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Cartao>
  );
}
