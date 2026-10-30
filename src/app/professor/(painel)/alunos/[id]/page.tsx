import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BarraXp, Conquistas, Dado, Historico, MapaHabilidades, Numero } from "@/components/PerfilAluno";
import { Cartao, Etiqueta, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { medalhasDaTurma } from "@/lib/medalhas";
import { ORDEM_ESPECIAIS, PERSONAGENS, TOTAL_PERSONAGENS } from "@/lib/personagens";
import { formatarPontos } from "@/lib/pontos";
import { exigirProfessor } from "@/lib/professor";
import { calcularConquistas, nomeDoNivel } from "@/lib/progresso";
import { progressoDoAluno } from "@/lib/progresso-dados";
import { errosParaRevisar } from "@/lib/revisao";
import { rankingDaTemporada, temporadaAtual } from "@/lib/temporada-dados";
import { situacaoDesafio, type Aluno } from "@/lib/tipos-banco";

export const metadata: Metadata = { title: "Perfil do aluno" };

type TentativaPerfil = {
  id: string;
  desafio_id: string;
  pontos: number;
  concluida_em: string | null;
  indice_atual: number;
  ordem: string[];
  desafios: { titulo: string; tipo: string | null; abre_em: string; fecha_em: string; temporadas: { nome: string } };
};

/** O perfil do aluno como ele vê (nível, conquistas, evolução), mais os desafios que fez. */
export default async function PerfilDoAluno({ params }: PageProps<"/professor/alunos/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const { data } = await supabase
    .from("alunos")
    .select(
      "id, turma_id, apelido, nome_real, avatar, cor, aprovado, ultimo_acesso, total_acessos, criado_em, turmas(nome, escolas(nome))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const aluno = data as unknown as Aluno & { turmas: { nome: string; escolas: { nome: string } } };

  const [progresso, medalhasTurma, temporada, erros, { data: tentativasBrutas }] = await Promise.all([
    progressoDoAluno(aluno.id, aluno.turma_id),
    medalhasDaTurma(supabase, aluno.turma_id),
    temporadaAtual(supabase, aluno.turma_id),
    errosParaRevisar(supabase, aluno.id, aluno.turma_id),
    supabase
      .from("tentativas")
      .select(
        "id, desafio_id, pontos, concluida_em, indice_atual, ordem, desafios!inner(titulo, tipo, abre_em, fecha_em, temporadas(nome))",
      )
      .eq("aluno_id", aluno.id),
  ]);
  const ranking = temporada ? await rankingDaTemporada(supabase, temporada) : [];
  const eu = ranking.find((l) => l.alunoId === aluno.id) ?? null;
  const medalhas = medalhasTurma.get(aluno.id) ?? 0;
  const conquistas = calcularConquistas(progresso, {
    posicao: eu?.posicao ?? null,
    pontos: eu?.pontos ?? 0,
    medalhas,
    maiorSequencia: eu?.maiorSequencia ?? 0,
  });
  const personagem = PERSONAGENS[Math.abs(aluno.avatar) % TOTAL_PERSONAGENS];
  const acertoDoDesafio = new Map(progresso.historico.map((h) => [h.id, h.acerto]));
  const tentativas = ((tentativasBrutas ?? []) as unknown as TentativaPerfil[]).sort((a, b) =>
    b.desafios.abre_em.localeCompare(a.desafios.abre_em),
  );
  const forte = progresso.habilidades.filter((h) => h.questoes >= 3).sort((a, b) => b.acerto - a.acerto)[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/professor/turmas/${aluno.turma_id}`} className="text-sm text-marca-700">
          ← Turma {aluno.turmas.nome}
        </Link>
        <Titulo>
          <span className="flex items-center gap-3">
            <Avatar avatar={aluno.avatar} cor={aluno.cor} medalhas={medalhas} tamanho={56} />
            <span>
              {aluno.apelido}
              {aluno.nome_real && <span className="text-base font-normal text-slate-500"> · {aluno.nome_real}</span>}
              <span className="block text-sm font-normal text-slate-500">
                {personagem.nome} · {aluno.turmas.nome} · {aluno.turmas.escolas.nome}
              </span>
            </span>
          </span>
        </Titulo>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marca-700 to-marca-950 p-6 text-white shadow-lg">
          <p className="text-sm font-semibold text-ouro-claro">{nomeDoNivel(progresso.nivel)}</p>
          <BarraXp progresso={progresso} />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Numero valor={eu ? `${eu.posicao}º` : "–"} rotulo={temporada ? `em ${temporada.nome}` : "posição"} />
            <Numero valor={formatarPontos(eu?.pontos)} rotulo="pontos na temporada" />
            <Numero valor={`${medalhas} 🏅`} rotulo={medalhas === 1 ? "desafio vencido" : "desafios vencidos"} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-center">
            <Numero valor={`🔥 ${eu?.sequencia ?? 0}`} rotulo="desafios seguidos na ofensiva" />
            <Numero valor={`+${eu?.bonus ?? 0}`} rotulo="pts de bônus da ofensiva" />
          </div>
        </section>

        <Cartao>
          <Subtitulo>📜 Ficha</Subtitulo>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Dado rotulo="Questões respondidas" valor={String(progresso.questoesRespondidas)} />
            <Dado
              rotulo="Acerto geral"
              valor={progresso.questoesRespondidas ? `${Math.round(progresso.acertoGeral * 100)}%` : "–"}
            />
            <Dado rotulo="Desafios concluídos" valor={String(progresso.desafiosConcluidos)} />
            <Dado rotulo="CaduRush jogados" valor={`⚡ ${progresso.caduRushConcluidos}`} />
            <Dado rotulo="Habilidade mais forte" valor={forte ? forte.nome : "–"} />
            <Dado rotulo="Erros revisados" valor={`📚 ${progresso.revisoesAcertadas}`} />
            <Dado rotulo="Erros ainda por revisar" valor={String(erros.length)} />
            <Dado rotulo="Maior ofensiva" valor={`🔥 ${eu?.maiorSequencia ?? 0} seguidos`} />
            <Dado
              rotulo="Conquistas"
              valor={`${conquistas.filter((c) => c.conquistada).length} de ${conquistas.length}`}
            />
            <Dado
              rotulo="Lendários liberados"
              valor={`${Math.min(medalhas, ORDEM_ESPECIAIS.length)} de ${ORDEM_ESPECIAIS.length}`}
            />
            <Dado rotulo="Na turma desde" valor={formatarData(aluno.criado_em.slice(0, 10))} />
            <Dado
              rotulo="Acessos"
              valor={`${aluno.total_acessos}${aluno.ultimo_acesso ? ` · último ${formatarDataHora(aluno.ultimo_acesso)}` : ""}`}
            />
          </dl>
        </Cartao>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MapaHabilidades habilidades={progresso.habilidades} doProfessor />
        <div className="space-y-6">
          {progresso.historico.length ? (
            <Historico historico={progresso.historico} doProfessor />
          ) : (
            <Vazio>Nenhum desafio concluído ainda.</Vazio>
          )}
          <Conquistas conquistas={conquistas} doProfessor />
        </div>
      </div>

      <Cartao className="overflow-x-auto">
        <Subtitulo>Desafios</Subtitulo>
        {!tentativas.length ? (
          <Vazio>Este aluno ainda não começou nenhum desafio.</Vazio>
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2">Desafio</th>
                <th className="py-2">Situação</th>
                <th className="py-2 text-right">Pontos</th>
                <th className="py-2 text-right">Acerto</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tentativas.map((t) => {
                const concluiu = Boolean(t.concluida_em || t.indice_atual >= t.ordem.length);
                const acerto = acertoDoDesafio.get(t.desafio_id);
                return (
                  <tr key={t.id}>
                    <td className="py-1.5">
                      {t.desafios.tipo === "relampago" && "⚡ "}
                      {t.desafios.titulo}
                      <span className="block text-xs text-slate-500">
                        {t.desafios.temporadas.nome} · {formatarData(t.desafios.abre_em.slice(0, 10))}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <Etiqueta cor={concluiu ? "verde" : situacaoDesafio(t.desafios) === "aberto" ? "ambar" : "cinza"}>
                        {concluiu
                          ? "concluiu"
                          : situacaoDesafio(t.desafios) === "aberto"
                            ? "em andamento"
                            : "não terminou"}
                      </Etiqueta>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{formatarPontos(t.pontos)}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {acerto === undefined ? "–" : `${Math.round(acerto * 100)}%`}
                    </td>
                    <td className="py-1.5 text-right">
                      <Link
                        href={`/professor/desafios/${t.desafio_id}/alunos/${aluno.id}`}
                        className="text-xs whitespace-nowrap text-marca-700"
                      >
                        ver respostas →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Cartao>
    </div>
  );
}
