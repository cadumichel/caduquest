import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { FormAcao } from "@/components/FormAcao";
import { TabelaRanking } from "@/components/TabelaRanking";
import { AreaTexto, BotaoLink, Campo, Cartao, Entrada, Etiqueta, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { formatarDataHora } from "@/lib/datas";
import { exigirProfessor } from "@/lib/professor";
import { rankingDaTemporada } from "@/lib/temporada-dados";
import { situacaoDesafio, type Desafio, type Temporada } from "@/lib/tipos-banco";
import { atualizarTemporada } from "../../actions";

export const metadata: Metadata = { title: "Temporada" };

const COR_SITUACAO = { agendado: "azul", aberto: "verde", encerrado: "cinza" } as const;

export default async function PaginaTemporada({ params }: PageProps<"/professor/temporadas/[id]">) {
  const { id } = await params;
  const { supabase } = await exigirProfessor();
  const { data } = await supabase
    .from("temporadas")
    .select("*, turmas(id, nome, alunos(count))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const temporada = data as Temporada & { turmas: { id: string; nome: string; alunos: { count: number }[] } };
  const totalAlunos = temporada.turmas.alunos[0]?.count ?? 0;

  const [{ data: desafiosBrutos }, ranking] = await Promise.all([
    supabase
      .from("desafios")
      .select(
        "id, temporada_id, tipo, titulo, abre_em, fecha_em, pontos_por_acerto, desafio_questoes(count), tentativas(concluida_em)",
      )
      .eq("temporada_id", id)
      .order("abre_em"),
    rankingDaTemporada(supabase, temporada),
  ]);
  const desafios = (desafiosBrutos ?? []) as (Desafio & {
    desafio_questoes: { count: number }[];
    tentativas: { concluida_em: string | null }[];
  })[];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/professor/turmas/${temporada.turmas.id}`} className="text-sm text-marca-700">
          ← Turma {temporada.turmas.nome}
        </Link>
        <Titulo
          acao={
            <div className="flex flex-wrap gap-2">
              <BotaoLink href={`/professor/desafios/novo?temporada=${id}&tipo=relampago`} variante="secundario">
                ⚡ Novo CaduRush
              </BotaoLink>
              <BotaoLink href={`/professor/desafios/novo?temporada=${id}`}>+ Desafio semanal</BotaoLink>
            </div>
          }
        >
          {temporada.nome}
        </Titulo>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Cartao>
            <Subtitulo>Desafios</Subtitulo>
            {!desafios.length && (
              <Vazio>Nenhum desafio ainda. Monte o primeiro com questões publicadas do banco.</Vazio>
            )}
            <ul className="divide-y divide-slate-100">
              {desafios.map((d) => {
                const situacao = situacaoDesafio(d);
                const feitos = d.tentativas.filter((t) => t.concluida_em).length;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/professor/desafios/${d.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-marca-700"
                    >
                      <span>
                        <span className="font-medium">
                          {d.tipo === "relampago" && "⚡ "}
                          {d.titulo}
                        </span>
                        <span className="block text-sm text-slate-500">
                          {d.desafio_questoes[0]?.count ?? 0} questões · {formatarDataHora(d.abre_em)} →{" "}
                          {formatarDataHora(d.fecha_em)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        <span className="text-slate-500">
                          {feitos}/{totalAlunos} concluíram
                        </span>
                        <Etiqueta cor={COR_SITUACAO[situacao]}>{situacao}</Etiqueta>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Cartao>

          <Cartao>
            <Subtitulo>Dados da temporada</Subtitulo>
            <FormAcao acao={atualizarTemporada}>
              <input type="hidden" name="id" value={id} />
              <Campo rotulo="Nome">
                <Entrada name="nome" defaultValue={temporada.nome} required />
              </Campo>
              <Campo rotulo="Narrativa">
                <AreaTexto name="narrativa" rows={2} defaultValue={temporada.narrativa ?? ""} />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Início">
                  <Entrada type="date" name="inicio" defaultValue={temporada.inicio} required />
                </Campo>
                <Campo rotulo="Data da prova">
                  <Entrada type="date" name="data_prova" defaultValue={temporada.data_prova} required />
                </Campo>
              </div>
              <Campo rotulo="Capítulos cobertos" dica="Um por linha. Aparecem como a trilha do mapa do aluno.">
                <AreaTexto name="capitulos" rows={4} defaultValue={temporada.capitulos.join("\n")} />
              </Campo>
              <p className="text-xs text-slate-500">
                Pontuação desta versão: 10 pontos por acerto no desafio semanal, crédito parcial em V/F, linha do tempo
                e pares.
              </p>
              <BotaoEnviar>Salvar</BotaoEnviar>
            </FormAcao>
          </Cartao>
        </div>

        <Cartao>
          <Subtitulo>Ranking</Subtitulo>
          <TabelaRanking ranking={ranking} />
        </Cartao>
      </div>
    </div>
  );
}
