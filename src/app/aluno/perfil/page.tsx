import type { Metadata } from "next";
import Image from "next/image";
import { Avatar } from "@/components/Avatar";
import { medalhasDaTurmaDoAluno, temporadaAtualDoAluno } from "@/lib/aluno-dados";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasNecessarias, ORDEM_ESPECIAIS, PERSONAGENS, TOTAL_PERSONAGENS } from "@/lib/personagens";
import { rankingParaAluno } from "@/lib/ranking";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { rankingDaTemporada } from "@/lib/temporada-dados";
import { EscolherAvatar } from "./EscolherAvatar";

export const metadata: Metadata = { title: "Meu perfil" };

/** Título do aluno conforme os desafios vencidos, com a medalha do guia visual. */
function titulo(medalhas: number) {
  if (medalhas >= 10) return { nome: "Lenda da História", medalha: "diamante" };
  if (medalhas >= 5) return { nome: "Mestre do tempo", medalha: "coroa" };
  if (medalhas >= 3) return { nome: "Historiador", medalha: "ouro" };
  if (medalhas >= 1) return { nome: "Explorador", medalha: "prata" };
  return { nome: "Aprendiz", medalha: "bronze" };
}

export default async function Perfil() {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const [medalhasTurma, temporada] = await Promise.all([
    medalhasDaTurmaDoAluno(aluno.turmaId),
    temporadaAtualDoAluno(aluno.turmaId),
  ]);
  const medalhas = medalhasTurma.get(aluno.id) ?? 0;
  const ranking = temporada ? await rankingDaTemporada(db, temporada) : [];
  const { eu, total } = rankingParaAluno(ranking, aluno.id);

  const liberados = Math.min(medalhas, ORDEM_ESPECIAIS.length);
  const proximo = ORDEM_ESPECIAIS.find((i) => medalhasNecessarias(i) > medalhas);
  const personagem = PERSONAGENS[Math.abs(aluno.avatar) % TOTAL_PERSONAGENS];
  const nivel = titulo(medalhas);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marca-600 via-marca-800 to-marca-950 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-40 rounded-full bg-ouro/20" />
        <div className="relative flex flex-col items-center text-center">
          <div className="rounded-full bg-white/15 p-2 ring-4 ring-white/25">
            <Avatar avatar={aluno.avatar} cor={aluno.cor} medalhas={medalhas} tamanho={120} />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold">{aluno.apelido}</h1>
          <span className="mt-1 flex items-center gap-1.5 rounded-full bg-gradient-to-b from-ouro-claro to-ouro py-0.5 pr-3 pl-1 text-xs font-bold tracking-wide text-marca-950 uppercase">
            <Image src={`/ilustracoes/medalha-${nivel.medalha}.png`} alt="" width={24} height={24} className="size-6" />
            {nivel.nome}
          </span>
          <p className="mt-2 text-sm text-marca-100">
            {personagem.nome} · {personagem.epoca}
          </p>
          <p className="text-xs text-marca-100">
            {aluno.turmaNome} · {aluno.escolaNome}
          </p>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
          <Numero valor={eu ? `${eu.posicao}º` : "–"} rotulo={total ? `de ${total} na turma` : "posição"} />
          <Numero valor={String(eu?.pontos ?? 0)} rotulo="pontos" />
          <Numero valor={`${medalhas} 🏅`} rotulo={medalhas === 1 ? "desafio vencido" : "desafios vencidos"} />
        </div>
        <div className="relative mt-2 grid grid-cols-2 gap-2 text-center">
          <Numero valor={`🔥 ${eu?.sequencia ?? 0}`} rotulo="semanas de ofensiva" />
          <Numero valor={`+${eu?.bonus ?? 0}`} rotulo="pts de constância" />
        </div>
        {eu && eu.questoes > 0 && (
          <div className="relative mt-3">
            <div className="flex justify-between text-xs text-marca-100">
              <span>Taxa de acerto na temporada</span>
              <span className="font-bold text-white">{Math.round(eu.acerto * 100)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-ouro" style={{ width: `${Math.round(eu.acerto * 100)}%` }} />
            </div>
          </div>
        )}
      </section>

      <section className="relative flex items-center gap-4 overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/70 p-4 pr-24">
        <Image
          src="/ilustracoes/bau.png"
          alt=""
          width={120}
          height={86}
          className="pointer-events-none absolute -right-2 bottom-1 h-16 w-auto opacity-90"
        />
        {proximo !== undefined ? (
          <>
            <div className="relative">
              <Avatar avatar={proximo} cor={aluno.cor} tamanho={56} className="opacity-40 grayscale" />
              <span className="absolute inset-0 flex items-center justify-center text-xl">🔒</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-marca-900">Próximo especial: {PERSONAGENS[proximo].nome}</p>
              <p className="text-xs text-amber-800">
                Vença mais {medalhasNecessarias(proximo) - medalhas}{" "}
                {medalhasNecessarias(proximo) - medalhas === 1 ? "desafio" : "desafios"} para liberar.
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-ouro"
                  style={{ width: `${(liberados / ORDEM_ESPECIAIS.length) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-amber-800">
                {liberados} de {ORDEM_ESPECIAIS.length} especiais liberados
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm font-bold text-amber-900">
            🎉 Você liberou todos os {ORDEM_ESPECIAIS.length} personagens especiais!
          </p>
        )}
      </section>

      <EscolherAvatar avatarAtual={aluno.avatar} corAtual={aluno.cor} medalhas={medalhas} />
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
