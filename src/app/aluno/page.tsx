import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MuralRanking } from "@/components/MuralRanking";
import { BotaoLink, Cartao, Etiqueta, Vazio } from "@/components/ui";
import { curiosidadeDoDia, medalhasDaTurmaDoAluno, temporadaAtualDoAluno } from "@/lib/aluno-dados";
import { exigirAluno } from "@/lib/aluno-sessao";
import { diasAte, formatarData, formatarDataHora } from "@/lib/datas";
import { calcularMissao, proximoCaduRush, type Missao } from "@/lib/missao";
import { cartaDoAluno, cartasParaAProxima, type CartaCoringa } from "@/lib/carta-coringa";
import { passosDaOfensiva, type PassoOfensiva } from "@/lib/constancia";
import { Avatar } from "@/components/Avatar";
import { chaveCapitulo, dominioCapitulo } from "@/lib/progresso";
import { progressoDoAluno } from "@/lib/progresso-dados";
import { rankingParaAluno } from "@/lib/ranking";
import { errosParaRevisar } from "@/lib/revisao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { situacaoDaTemporada } from "@/lib/temporada-dados";
import { MetaTurma } from "@/components/MetaTurma";
import { situacaoDesafio, type Desafio, type Tentativa } from "@/lib/tipos-banco";

export const metadata: Metadata = { title: "Início" };

export default async function Inicio() {
  const aluno = await exigirAluno();
  const db = criarClienteAdmin();
  const temporada = await temporadaAtualDoAluno(aluno.turmaId);

  if (!temporada) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Olá, {aluno.apelido}!</h1>
        <Vazio>Ainda não há uma temporada para a turma {aluno.turmaNome}. Aguarde o professor.</Vazio>
      </div>
    );
  }

  // Tudo em paralelo: as tentativas do aluno vêm filtradas pela temporada via join.
  const [{ data: desafiosBrutos }, { data: tentativasBrutas }, situacao, medalhas, erros, curiosidade, progresso] =
    await Promise.all([
      db
        .from("desafios")
        .select("id, temporada_id, tipo, titulo, abre_em, fecha_em, pontos_por_acerto, desafio_questoes(count)")
        .eq("temporada_id", temporada.id)
        .order("abre_em"),
      db
        .from("tentativas")
        .select("*, desafios!inner(temporada_id)")
        .eq("aluno_id", aluno.id)
        .eq("desafios.temporada_id", temporada.id),
      situacaoDaTemporada(db, temporada),
      medalhasDaTurmaDoAluno(aluno.turmaId),
      errosParaRevisar(db, aluno.id, aluno.turmaId),
      curiosidadeDoDia(temporada),
      progressoDoAluno(aluno.id, aluno.turmaId),
    ]);
  const [cartas, minhaCarta] = await Promise.all([
    cartasParaAProxima(db, aluno.turmaId),
    cartaDoAluno(db, aluno.id, aluno.turmaId),
  ]);
  const desafios = (desafiosBrutos ?? []) as (Desafio & { desafio_questoes: { count: number }[] })[];
  const tentativas = new Map(((tentativasBrutas ?? []) as Tentativa[]).map((t) => [t.desafio_id, t]));
  const { top, eu, total } = rankingParaAluno(situacao.ranking, aluno.id);
  const faltam = diasAte(temporada.data_prova);
  const concluidos = new Set(
    [...tentativas.values()].filter((t) => t.concluida_em || t.indice_atual >= t.ordem.length).map((t) => t.desafio_id),
  );
  const missao = calcularMissao({
    desafios,
    concluidos,
    iniciados: new Set(tentativas.keys()),
    errosParaRevisar: erros.length,
    diasAteProva: faltam,
  });
  const rush = proximoCaduRush(desafios);
  const passos = passosDaOfensiva(
    desafios.filter((d) => d.tipo !== "relampago"),
    concluidos,
  );

  // CaduRush aberto vem primeiro: é feito na hora, em sala.
  const abertos = desafios
    .filter((d) => situacaoDesafio(d) === "aberto")
    .sort((a, b) => Number(b.tipo === "relampago") - Number(a.tipo === "relampago"));
  const outros = desafios.filter((d) => situacaoDesafio(d) !== "aberto").reverse();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-marca-900 text-white shadow-lg shadow-marca-900/20">
        <Image
          src="/ilustracoes/cartao-mapa.webp"
          alt=""
          fill
          sizes="(max-width: 672px) 100vw, 672px"
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-marca-950/40 via-marca-900/75 to-marca-900" />
        <div className="relative p-6">
          <p className="text-sm font-medium text-ouro-claro drop-shadow">
            {aluno.turmaNome} · {aluno.escolaNome}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold drop-shadow">{temporada.nome}</h1>
          {temporada.narrativa && <p className="mt-2 text-sm text-marca-100">{temporada.narrativa}</p>}
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-2xl font-bold">{eu?.pontos ?? 0}</p>
              <p className="text-xs text-marca-100">pontos</p>
            </div>
            <Link href="/aluno/ranking" className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-2xl font-bold">{eu ? `${eu.posicao}º` : "–"}</p>
              <p className="text-xs text-marca-100">de {total}</p>
            </Link>
            <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
              <p className="text-2xl font-bold">{faltam >= 0 ? faltam : "✓"}</p>
              <p className="text-xs text-marca-100">{faltam >= 0 ? "dias até a prova" : "temporada encerrada"}</p>
            </div>
          </div>
        </div>
      </section>

      <CartaoMissao missao={missao} />

      {rush && (
        <p className="rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-3 text-sm font-semibold text-orange-900">
          ⚡ Próximo CaduRush: {rush.titulo}, {formatarDataHora(rush.abre_em)}. Fique atento ao código no quadro!
        </p>
      )}

      {minhaCarta?.aberta && minhaCarta.status === "pendente" && (
        <Link
          href="/aluno/coringa"
          className="block rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200"
        >
          🃏 Seu tema da carta coringa está com o professor para aprovação. Ele aparece para todos assim que for
          aprovado.
        </Link>
      )}

      {minhaCarta?.aberta && (!minhaCarta.tema || minhaCarta.status === "recusada") && (
        <Link
          href="/aluno/coringa"
          className="block rounded-3xl bg-gradient-to-br from-marca-950 via-marca-900 to-amber-900 p-5 text-white shadow-lg ring-2 ring-amber-300"
        >
          <p className="text-xs font-bold tracking-widest text-amber-300 uppercase">✦ Você ganhou a carta coringa ✦</p>
          <p className="mt-1 text-lg font-extrabold">Campeão da temporada {minhaCarta.temporada.nome}! 🏆</p>
          <p className="text-sm text-amber-50">
            {minhaCarta.status === "recusada"
              ? "O professor pediu outro tema. Escolha de novo uma página ou um subtítulo da apostila. ›"
              : "Escolha o tema de uma questão da próxima prova: uma página ou um subtítulo da apostila. ›"}
          </p>
        </Link>
      )}

      {cartas.length > 0 && (
        <CartasCoringa cartas={cartas} prova={faltam >= 0 ? temporada.data_prova : null} meuId={aluno.id} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-3xl bg-gradient-to-br from-marca-700 to-marca-900 p-4 text-white shadow-md sm:col-span-2">
          <div className="flex items-center gap-3">
            <Image
              src="/ilustracoes/sequencia.png"
              alt=""
              width={64}
              height={76}
              className={`h-14 w-auto shrink-0 ${eu?.sequencia ? "" : "opacity-50 grayscale"}`}
            />
            <div className="min-w-0 text-sm">
              <p className="text-base font-extrabold text-ouro-claro">Ofensiva rumo à prova</p>
              <p className="font-bold">
                {eu?.sequencia
                  ? `${eu.sequencia} ${eu.sequencia === 1 ? "desafio" : "desafios seguidos"}!`
                  : "Comece sua ofensiva!"}
                {eu && eu.bonus > 0 && <span className="font-normal text-marca-100"> · +{eu.bonus} pts de bônus</span>}
              </p>
              <p className="text-xs text-marca-100">
                {passos.filter((p) => p.passo === "feito").length} de {passos.length}{" "}
                {passos.length === 1 ? "desafio feito" : "desafios feitos"}
                {faltam >= 0 && ` · ${faltam === 0 ? "a prova é hoje" : `faltam ${faltam} dias para a prova`}`}
              </p>
            </div>
          </div>
          <TrilhaOfensiva passos={passos} />
          <p className="mt-2 text-xs text-marca-100">
            A ofensiva vai até a prova. Cada desafio feito em sequência dá de +10 a +20 pts de bônus; perder um desafio
            zera a sequência, mas não os pontos.
          </p>
        </section>

        <Link
          href="/aluno/perfil"
          className="flex items-center gap-3 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/70 p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-marca-900">Recompensas</p>
            <p className="text-sm text-marca-900/80">
              Suba de nível para liberar personagens e vença desafios para ganhar lendários!
            </p>
          </div>
          <Image src="/ilustracoes/bau.png" alt="" width={120} height={86} className="h-16 w-auto shrink-0" />
        </Link>
      </div>

      {erros.length > 0 && missao.tipo !== "revisao" && (
        <Link
          href="/aluno/revisao"
          className="flex items-center gap-3 rounded-3xl border border-marca-100 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <span className="text-3xl">📚</span>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-marca-900">Revisão de erros</p>
            <p className="text-sm text-slate-600">
              {erros.length} {erros.length === 1 ? "questão errada" : "questões erradas"} para revisar. É onde você mais
              aprende!
            </p>
          </div>
          <span className="font-bold text-marca-700">Revisar ›</span>
        </Link>
      )}

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold tracking-widest text-amber-800 uppercase">🏛️ Curiosidade do dia</p>
        <p className="mt-1 text-sm text-marca-950">{curiosidade}</p>
      </section>

      <MetaTurma meta={situacao.meta} />

      <MuralRanking top={top} eu={eu} total={total} medalhas={medalhas} alunoId={aluno.id} />

      {temporada.capitulos.length > 0 && (
        <Cartao>
          <h2 className="mb-4 flex items-center gap-2 font-extrabold text-marca-900">
            <Image src="/ilustracoes/icone-mapa.png" alt="" width={32} height={24} className="h-6 w-auto" />
            Trilha da temporada
          </h2>
          <ol className="relative ml-3 space-y-4 border-l-2 border-dashed border-marca-300 pl-6">
            {temporada.capitulos.map((cap, i) => {
              const d = progresso.capitulos.get(chaveCapitulo(cap));
              const estilo = DOMINIO[dominioCapitulo(d)];
              return (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ring-2 ${estilo.bola}`}
                  >
                    {estilo.marca ?? i + 1}
                  </span>
                  <span className="font-medium">{cap}</span>
                  <span className={`ml-2 text-xs ${estilo.texto}`}>
                    {d ? `${estilo.rotulo} · ${Math.round(d.acerto * 100)}%` : estilo.rotulo}
                  </span>
                </li>
              );
            })}
            <li className="relative font-semibold text-marca-700">
              <span className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full bg-ouro text-xs">
                🏁
              </span>
              Prova · {formatarData(temporada.data_prova)}
            </li>
          </ol>
        </Cartao>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-marca-900">
          <Image src="/ilustracoes/icone-desafios.png" alt="" width={36} height={28} className="h-7 w-auto" />
          Desafios abertos
        </h2>
        {abertos.length === 0 && <Vazio>Nenhum desafio aberto agora.</Vazio>}
        {abertos.map((d) => {
          const t = tentativas.get(d.id);
          const concluido = Boolean(t && (t.concluida_em || t.indice_atual >= t.ordem.length));
          if (d.tipo === "relampago") {
            return (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 p-5 text-white shadow-lg"
              >
                <div>
                  <p className="text-xs font-bold tracking-widest uppercase">⚡ CaduRush · em sala</p>
                  <p className="text-lg font-extrabold">{d.titulo}</p>
                  <p className="text-sm text-white/90">
                    Peso 3 · {d.pontos_por_acerto} pts por acerto · fecha {formatarDataHora(d.fecha_em)}
                  </p>
                </div>
                {concluido ? (
                  <BotaoLink href={`/aluno/desafio/${d.id}/resultado`} variante="secundario">
                    ✓ {Number(t!.pontos)} pts
                  </BotaoLink>
                ) : (
                  <Link
                    href={`/aluno/desafio/${d.id}`}
                    className="rounded-xl bg-white px-5 py-2.5 font-bold text-orange-700 shadow hover:bg-orange-50"
                  >
                    {t ? "Continuar" : "Entrar com o código"}
                  </Link>
                )}
              </div>
            );
          }
          return (
            <Cartao key={d.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{d.titulo}</p>
                <p className="text-sm text-slate-500">
                  {d.desafio_questoes[0]?.count ?? 0} questões · fecha {formatarDataHora(d.fecha_em)}
                </p>
              </div>
              {concluido ? (
                <BotaoLink href={`/aluno/desafio/${d.id}/resultado`} variante="secundario">
                  ✓ {Number(t!.pontos)} pts
                </BotaoLink>
              ) : (
                <BotaoLink href={`/aluno/desafio/${d.id}`}>▶ {t ? "Continuar" : "Começar desafio"}</BotaoLink>
              )}
            </Cartao>
          );
        })}
      </section>

      {outros.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-extrabold text-marca-900">Outros desafios</h2>
          {outros.map((d) => {
            const situacao = situacaoDesafio(d);
            const t = tentativas.get(d.id);
            return (
              <Cartao key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">
                    {d.tipo === "relampago" && "⚡ "}
                    {d.titulo}
                  </p>
                  <p className="text-sm text-slate-500">
                    {situacao === "agendado"
                      ? `Abre ${formatarDataHora(d.abre_em)}`
                      : `Fechou ${formatarDataHora(d.fecha_em)}`}
                  </p>
                </div>
                {situacao === "agendado" ? (
                  <Etiqueta cor="azul">Em breve</Etiqueta>
                ) : t ? (
                  <BotaoLink href={`/aluno/desafio/${d.id}/resultado`} variante="secundario">
                    {Number(t.pontos)} pts · ver gabarito
                  </BotaoLink>
                ) : (
                  <Etiqueta>Não feito</Etiqueta>
                )}
              </Cartao>
            );
          })}
        </section>
      )}
    </div>
  );
}

/** Cores da trilha conforme o domínio do capítulo. */
const DOMINIO = {
  novo: {
    bola: "bg-slate-200 text-slate-600 ring-slate-100",
    texto: "text-slate-400",
    rotulo: "a explorar",
    marca: null,
  },
  comecando: { bola: "bg-rose-500 text-white ring-rose-100", texto: "text-rose-600", rotulo: "começando", marca: null },
  avancando: {
    bola: "bg-amber-400 text-marca-950 ring-amber-100",
    texto: "text-amber-700",
    rotulo: "avançando",
    marca: null,
  },
  dominado: {
    bola: "bg-emerald-500 text-white ring-emerald-100",
    texto: "text-emerald-700",
    rotulo: "dominado",
    marca: "✓",
  },
} as const;

const ESTILO_MISSAO: Record<Missao["tipo"], { fundo: string; icone: string }> = {
  cadurush: { fundo: "from-amber-400 via-orange-500 to-rose-600", icone: "⚡" },
  desafio: { fundo: "from-emerald-500 to-emerald-700", icone: "🎯" },
  revisao: { fundo: "from-marca-500 to-marca-700", icone: "📚" },
  aguardar: { fundo: "from-sky-500 to-marca-700", icone: "✅" },
  prova: { fundo: "from-sky-500 to-marca-700", icone: "🏁" },
  encerrada: { fundo: "from-slate-500 to-slate-700", icone: "🏛️" },
};

/** Missão do dia: uma ação só, com botão grande. */
function CartaoMissao({ missao }: { missao: Missao }) {
  const estilo = ESTILO_MISSAO[missao.tipo];
  return (
    <section className={`rounded-3xl bg-gradient-to-br ${estilo.fundo} p-5 text-white shadow-lg`}>
      <p className="text-xs font-bold tracking-widest uppercase opacity-90">Missão do dia</p>
      <div className="mt-1 flex items-start gap-3">
        <span className="text-4xl leading-none">{estilo.icone}</span>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold">{missao.titulo}</h2>
          <p className="text-sm text-white/90">{missao.texto}</p>
        </div>
      </div>
      {missao.href && (
        <Link
          href={missao.href}
          className="mt-4 block rounded-2xl bg-white px-5 py-3.5 text-center text-base font-extrabold text-marca-900 shadow hover:bg-white/90"
        >
          {missao.botao} ›
        </Link>
      )}
    </section>
  );
}

/** Temas escolhidos pelos campeões (desta turma e das turmas da mesma série) para a próxima prova. */
function CartasCoringa({ cartas, prova, meuId }: { cartas: CartaCoringa[]; prova: string | null; meuId: string }) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-marca-950 via-marca-900 to-amber-900 p-5 text-white shadow-lg ring-1 ring-amber-300/50">
      <p className="text-xs font-bold tracking-widest text-amber-300 uppercase">🃏 Cartas coringa</p>
      <p className="text-sm text-amber-50">
        Os campeões da última temporada escolheram estes temas: cada um vira uma questão da próxima prova
        {prova ? ` (${formatarData(prova)})` : ""}.
      </p>
      <ul className="mt-3 space-y-2">
        {cartas.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <Avatar avatar={c.avatar} cor={c.cor} tamanho={48} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-amber-200">
                {c.apelido} · campeão da {c.turmaNome}
              </p>
              <p className="font-bold">“{c.tema}”</p>
            </div>
            {c.alunoId === meuId && (
              <Link href="/aluno/coringa" className="text-xs font-bold text-amber-300 underline">
                mudar
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const ESTILO_PASSO: Record<PassoOfensiva, { classe: string; marca: string; rotulo: string }> = {
  feito: { classe: "bg-ouro-claro text-marca-900", marca: "✓", rotulo: "feito" },
  perdido: { classe: "bg-white/15 text-white/60", marca: "✕", rotulo: "perdido" },
  aberto: { classe: "animate-pulse border-2 border-ouro-claro text-ouro-claro", marca: "!", rotulo: "aberto agora" },
  futuro: { classe: "border-2 border-white/30", marca: "", rotulo: "em breve" },
};

/** Um passo por desafio da temporada, até a bandeira da prova. */
function TrilhaOfensiva({ passos }: { passos: { id: string; passo: PassoOfensiva }[] }) {
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-1.5">
      {passos.map((p, i) => {
        const e = ESTILO_PASSO[p.passo];
        return (
          <li
            key={p.id}
            title={`Desafio ${i + 1}: ${e.rotulo}`}
            className={`flex size-6 items-center justify-center rounded-full text-xs font-black ${e.classe}`}
          >
            {e.marca}
          </li>
        );
      })}
      <li title="Prova" className="ml-1 text-lg leading-none">
        🏁
      </li>
    </ol>
  );
}
