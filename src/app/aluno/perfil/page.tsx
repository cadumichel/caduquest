import type { Metadata } from "next";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { medalhasDaTurmaDoAluno, temporadaAtualDoAluno } from "@/lib/aluno-dados";
import { exigirAluno } from "@/lib/aluno-sessao";
import {
  medalhasNecessarias,
  nivelNecessario,
  ORDEM_BASICOS,
  ORDEM_ESPECIAIS,
  PERSONAGENS,
  TOTAL_PERSONAGENS,
} from "@/lib/personagens";
import { fundoDoAluno, fundoLiberado } from "@/lib/visual-perfil";
import { formatarData } from "@/lib/datas";
import { calcularConquistas, nomeDoNivel, type Conquista, type Desempenho, type Progresso } from "@/lib/progresso";
import { progressoDoAluno } from "@/lib/progresso-dados";
import { rankingParaAluno } from "@/lib/ranking";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { rankingDaTemporada } from "@/lib/temporada-dados";
import { EscolherAvatar } from "./EscolherAvatar";
import { PersonalizarPerfil } from "./PersonalizarPerfil";
import { formatarPontos } from "@/lib/pontos";

export const metadata: Metadata = { title: "Meu perfil" };

/** Medalha do cartão conforme os desafios vencidos (guia visual). */
function medalhaDoCartao(medalhas: number) {
  if (medalhas >= 10) return "diamante";
  if (medalhas >= 5) return "coroa";
  if (medalhas >= 3) return "ouro";
  if (medalhas >= 1) return "prata";
  return "bronze";
}

/** Fundo e título salvos. Sem o SQL do perfil personalizado, usa o padrão. */
async function visualSalvo(alunoId: string) {
  const db = criarClienteAdmin();
  const { data, error } = await db.from("alunos").select("fundo, titulo, criado_em").eq("id", alunoId).maybeSingle();
  if (!error && data) return data as { fundo: number; titulo: string | null; criado_em: string };
  const { data: basico } = await db.from("alunos").select("criado_em").eq("id", alunoId).maybeSingle();
  return { fundo: 0, titulo: null, criado_em: (basico?.criado_em as string | undefined) ?? null };
}

export default async function Perfil() {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const [medalhasTurma, temporada, progresso, visual] = await Promise.all([
    medalhasDaTurmaDoAluno(aluno.turmaId),
    temporadaAtualDoAluno(aluno.turmaId),
    progressoDoAluno(aluno.id, aluno.turmaId),
    visualSalvo(aluno.id),
  ]);
  const medalhas = medalhasTurma.get(aluno.id) ?? 0;
  const ranking = temporada ? await rankingDaTemporada(db, temporada) : [];
  const { eu, total } = rankingParaAluno(ranking, aluno.id);

  const especiaisLiberados = Math.min(medalhas, ORDEM_ESPECIAIS.length);
  const basicosLiberados = ORDEM_BASICOS.filter((i) => nivelNecessario(i) <= progresso.nivel).length;
  const proximo = ORDEM_ESPECIAIS.find((i) => medalhasNecessarias(i) > medalhas);
  const personagem = PERSONAGENS[Math.abs(aluno.avatar) % TOTAL_PERSONAGENS];
  const conquistas = calcularConquistas(progresso, {
    posicao: eu?.posicao ?? null,
    pontos: eu?.pontos ?? 0,
    medalhas,
    maiorSequencia: eu?.maiorSequencia ?? 0,
  });
  const conquistadas = conquistas.filter((c) => c.conquistada);
  const tituloEscolhido = conquistadas.find((c) => c.id === visual.titulo);
  const fundo = fundoDoAluno(fundoLiberado(visual.fundo, { nivel: progresso.nivel, medalhas }) ? visual.fundo : 0);
  const melhor = progresso.historico.reduce<(typeof progresso.historico)[number] | null>(
    (m, d) => (!m || d.acerto > m.acerto ? d : m),
    null,
  );
  const forte = progresso.habilidades.filter((h) => h.questoes >= 3).sort((a, b) => b.acerto - a.acerto)[0];

  return (
    <div className="space-y-5">
      <section
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${fundo.classes} p-6 text-white shadow-lg`}
      >
        {fundo.imagem && (
          <Image
            src={fundo.imagem}
            alt=""
            fill
            sizes="672px"
            className="pointer-events-none object-cover opacity-25 mix-blend-luminosity blur-[2px]"
          />
        )}
        <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-ouro/20" />
        <div className="relative flex flex-col items-center text-center">
          <div className="rounded-full bg-white/15 p-2 ring-4 ring-white/25">
            <Avatar avatar={aluno.avatar} cor={aluno.cor} medalhas={medalhas} tamanho={120} />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold drop-shadow">{aluno.apelido}</h1>
          <span className="mt-1 flex items-center gap-1.5 rounded-full bg-gradient-to-b from-ouro-claro to-ouro py-0.5 pr-3 pl-1 text-xs font-bold tracking-wide text-marca-950 uppercase">
            <Image
              src={`/ilustracoes/medalha-${medalhaDoCartao(medalhas)}.png`}
              alt=""
              width={24}
              height={24}
              className="size-6"
            />
            {tituloEscolhido ? `${tituloEscolhido.icone} ${tituloEscolhido.nome}` : nomeDoNivel(progresso.nivel)}
          </span>
          <p className="mt-2 text-sm text-white/85">
            {personagem.nome} · {personagem.epoca}
          </p>
          <p className="text-xs text-white/75">
            {aluno.turmaNome} · {aluno.escolaNome}
          </p>
        </div>

        <BarraXp progresso={progresso} />

        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          <Numero valor={eu ? `${eu.posicao}º` : "–"} rotulo={total ? `de ${total} na turma` : "posição"} />
          <Numero valor={formatarPontos(eu?.pontos)} rotulo="pontos" />
          <Numero valor={`${medalhas} 🏅`} rotulo={medalhas === 1 ? "desafio vencido" : "desafios vencidos"} />
        </div>
        <div className="relative mt-2 grid grid-cols-2 gap-2 text-center">
          <Numero valor={`🔥 ${eu?.sequencia ?? 0}`} rotulo="desafios seguidos na ofensiva" />
          <Numero valor={`+${eu?.bonus ?? 0}`} rotulo="pts de bônus da ofensiva" />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-extrabold text-marca-900">📜 Ficha do historiador</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Dado rotulo="Questões respondidas" valor={String(progresso.questoesRespondidas)} />
          <Dado
            rotulo="Acerto geral"
            valor={progresso.questoesRespondidas ? `${Math.round(progresso.acertoGeral * 100)}%` : "–"}
          />
          <Dado rotulo="Desafios concluídos" valor={String(progresso.desafiosConcluidos)} />
          <Dado rotulo="CaduRush jogados" valor={`⚡ ${progresso.caduRushConcluidos}`} />
          <Dado
            rotulo="Melhor desafio"
            valor={melhor ? `${Math.round(melhor.acerto * 100)}% · ${melhor.titulo}` : "–"}
          />
          <Dado rotulo="Habilidade mais forte" valor={forte ? forte.nome : "–"} />
          <Dado rotulo="Erros revisados" valor={`📚 ${progresso.revisoesAcertadas}`} />
          <Dado rotulo="Maior ofensiva" valor={`🔥 ${eu?.maiorSequencia ?? 0} seguidos`} />
          <Dado rotulo="Conquistas" valor={`${conquistadas.length} de ${conquistas.length}`} />
          <Dado rotulo="Personagens" valor={`${basicosLiberados + especiaisLiberados} de ${TOTAL_PERSONAGENS}`} />
          {visual.criado_em && <Dado rotulo="Na turma desde" valor={formatarData(visual.criado_em.slice(0, 10))} />}
        </dl>
      </section>

      <MapaHabilidades habilidades={progresso.habilidades} />

      <Historico historico={progresso.historico} />

      <Conquistas conquistas={conquistas} />

      {proximo !== undefined ? (
        <section className="relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-marca-950 via-marca-900 to-amber-900 p-5 text-white shadow-lg ring-1 ring-amber-300/50">
          <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="relative shrink-0 p-2">
            <Avatar avatar={proximo} cor={aluno.cor} tamanho={72} className="brightness-50 saturate-50" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl drop-shadow">🔒</span>
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-widest text-amber-300 uppercase">✦ Lendário ✦</p>
            <p className="text-lg font-extrabold">{PERSONAGENS[proximo].nome}</p>
            <p className="text-xs text-amber-100">
              Vença mais {medalhasNecessarias(proximo) - medalhas}{" "}
              {medalhasNecessarias(proximo) - medalhas === 1 ? "desafio" : "desafios"} (maior pontuação do desafio) para
              liberar.
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
                style={{ width: `${(especiaisLiberados / ORDEM_ESPECIAIS.length) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-amber-100">
              {especiaisLiberados} de {ORDEM_ESPECIAIS.length} lendários liberados
            </p>
          </div>
        </section>
      ) : (
        <p className="rounded-3xl bg-amber-100 p-4 text-sm font-bold text-amber-900">
          🎉 Você liberou todos os {ORDEM_ESPECIAIS.length} personagens lendários!
        </p>
      )}

      <PersonalizarPerfil
        fundoAtual={fundo === fundoDoAluno(visual.fundo) ? visual.fundo : 0}
        tituloAtual={tituloEscolhido?.id ?? null}
        nivel={progresso.nivel}
        medalhas={medalhas}
        titulos={conquistadas.map((c) => ({ id: c.id, nome: `${c.icone} ${c.nome}` }))}
        nomeNivel={nomeDoNivel(progresso.nivel)}
      />

      <EscolherAvatar avatarAtual={aluno.avatar} corAtual={aluno.cor} medalhas={medalhas} nivel={progresso.nivel} />
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="truncate font-bold text-marca-950">{valor}</dd>
    </div>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
      <p className="text-xl font-extrabold">{valor}</p>
      <p className="text-[11px] leading-tight text-marca-100">{rotulo}</p>
    </div>
  );
}

function BarraXp({ progresso }: { progresso: Progresso }) {
  const pct = Math.round((progresso.noNivel / progresso.paraProximo) * 100);
  return (
    <div className="relative mt-5">
      <div className="flex items-end justify-between text-xs text-marca-100">
        <span>
          <span className="text-base font-extrabold text-white">Nível {progresso.nivel}</span> ·{" "}
          {nomeDoNivel(progresso.nivel)}
        </span>
        <span className="tabular-nums">
          {progresso.noNivel}/{progresso.paraProximo} XP
        </span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-gradient-to-r from-ouro-claro to-ouro" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-marca-100">
        Cada questão dá XP, e acertar dá mais. Desafio concluído: +20 XP. Revisão acertada: +5 XP.
      </p>
    </div>
  );
}

const corAcerto = (a: number) => (a >= 0.8 ? "bg-emerald-500" : a >= 0.5 ? "bg-amber-400" : "bg-rose-500");

function MapaHabilidades({ habilidades }: { habilidades: Desempenho[] }) {
  const comDados = habilidades.filter((h) => h.questoes >= 3);
  const fraca = [...comDados].sort((a, b) => a.acerto - b.acerto)[0];
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-extrabold text-marca-900">🧭 Mapa de habilidades</h2>
      <p className="mb-3 text-sm text-slate-600">Seu acerto em cada habilidade cobrada na prova.</p>
      <ul className="space-y-2.5">
        {habilidades.map((h) => (
          <li key={h.nome}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{h.nome}</span>
              <span className="tabular-nums text-slate-500">
                {h.questoes
                  ? `${Math.round(h.acerto * 100)}% · ${h.questoes} ${h.questoes === 1 ? "questão" : "questões"}`
                  : "sem questões ainda"}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              {h.questoes > 0 && (
                <div
                  className={`h-full rounded-full ${corAcerto(h.acerto)}`}
                  style={{ width: `${Math.max(4, Math.round(h.acerto * 100))}%` }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      {fraca && fraca.acerto < 0.7 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          💡 Foque em <strong>{fraca.nome}</strong>: é onde você mais pode crescer. A revisão de erros ajuda!
        </p>
      )}
    </section>
  );
}

function Historico({ historico }: { historico: Progresso["historico"] }) {
  const ultimos = historico.slice(-10);
  if (!ultimos.length) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-extrabold text-marca-900">📈 Sua evolução</h2>
      <p className="mb-3 text-sm text-slate-600">Acerto em cada desafio, do mais antigo ao mais recente.</p>
      <div className="flex h-36 items-end gap-1.5">
        {ultimos.map((d) => {
          const pct = Math.round(d.acerto * 100);
          return (
            <div
              key={d.id}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${d.titulo}: ${pct}%`}
            >
              <span className="text-[10px] font-bold tabular-nums text-slate-600">{pct}%</span>
              <div
                className={`w-full rounded-t-md ${corAcerto(d.acerto)}`}
                style={{ height: `${Math.max(4, pct)}%` }}
              />
              <span className="w-full truncate text-center text-[10px] text-slate-500">
                {d.tipo === "relampago" ? "⚡" : formatarData(d.abre_em.slice(0, 10)).slice(0, 5)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Conquistas({ conquistas }: { conquistas: Conquista[] }) {
  const feitas = conquistas.filter((c) => c.conquistada).length;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-extrabold text-marca-900">🏅 Conquistas</h2>
      <p className="mb-3 text-sm text-slate-600">
        {feitas} de {conquistas.length}. Toque numa medalha para ver como ganhar.
      </p>
      <ul className="grid grid-cols-4 gap-2">
        {conquistas.map((c) => (
          <li key={c.id}>
            <details className="group">
              <summary
                className={`flex aspect-square cursor-pointer list-none flex-col items-center justify-center rounded-2xl p-1 text-center ${
                  c.conquistada
                    ? "bg-gradient-to-b from-amber-50 to-amber-100 ring-1 ring-amber-300"
                    : "bg-slate-100 opacity-60 grayscale"
                }`}
              >
                <span className="text-2xl">{c.conquistada ? c.icone : "🔒"}</span>
                <span className="mt-0.5 text-[10px] leading-tight font-semibold">{c.nome}</span>
              </summary>
              <p className="mt-1 text-[11px] leading-tight text-slate-600">{c.descricao}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
