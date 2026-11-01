import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { partidaDoJogador } from "@/lib/publico/jogo";
import { eraPorId } from "@/lib/publico/regras";
import { exigirJogador } from "@/lib/publico/sessao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { JogoPublico } from "./JogoPublico";

export const metadata: Metadata = { title: "Desafio" };

export default async function PaginaPartida({ params }: PageProps<"/jogar/partida/[id]">) {
  const { id } = await params;
  const jogador = await exigirJogador();
  const partida = await partidaDoJogador(criarClienteAdmin(), jogador.id, id);
  if (!partida) notFound();
  if (partida.concluida_em) redirect(`/jogar/partida/${id}/resultado`);
  const era = eraPorId(partida.era);
  return (
    <JogoPublico
      partidaId={id}
      titulo={era ? `${era.emoji} ${era.nome}` : "Desafio"}
      valeRanking={partida.vale_ranking}
      jaComecou={partida.indice_atual > 0}
      apelido={jogador.apelido}
    />
  );
}
