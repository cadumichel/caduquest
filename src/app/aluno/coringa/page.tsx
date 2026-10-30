import type { Metadata } from "next";
import { Aviso, BotaoLink, Vazio } from "@/components/ui";
import { exigirAluno } from "@/lib/aluno-sessao";
import { cartaDoAluno, PRAZO_DIAS } from "@/lib/carta-coringa";
import { formatarData } from "@/lib/datas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { FormCarta } from "./FormCarta";

export const metadata: Metadata = { title: "Carta coringa" };

export default async function PaginaCoringa() {
  const aluno = await exigirAluno();
  const carta = await cartaDoAluno(criarClienteAdmin(), aluno.id, aluno.turmaId);
  if (!carta) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-marca-900">🃏 Carta coringa</h1>
        <Vazio>
          A carta coringa é do campeão de cada temporada: quem termina em 1º lugar escolhe o tema de uma questão da
          próxima prova. Vença a temporada para ganhar a sua!
        </Vazio>
        <BotaoLink href="/aluno" variante="secundario">
          Voltar ao início
        </BotaoLink>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-marca-950 via-marca-900 to-amber-900 p-6 text-white shadow-lg ring-1 ring-amber-300/50">
        <p className="text-xs font-bold tracking-widest text-amber-300 uppercase">✦ Carta coringa ✦</p>
        <h1 className="mt-1 text-2xl font-extrabold">Você venceu a temporada {carta.temporada.nome}! 🏆</h1>
        <p className="mt-2 text-sm text-amber-50">
          Seu prêmio: escolher o tema de uma questão da próxima prova. Escolha uma página ou um subtítulo da apostila
          que esteja no conteúdo da próxima prova. O professor decide o formato e a dificuldade da questão.
        </p>
        {carta.proximaProva && (
          <p className="mt-2 text-xs text-amber-200">
            Próxima prova: {formatarData(carta.proximaProva)}. Dá para escolher ou mudar o tema até {PRAZO_DIAS} dias
            antes dela.
          </p>
        )}
      </section>
      {carta.status === "pendente" && (
        <Aviso tipo="info">
          Seu tema “{carta.tema}” está com o professor. Ele aparece para todos, com o seu personagem, assim que for
          aprovado (o professor pode ajustar o texto).
        </Aviso>
      )}
      {carta.status === "aprovada" && (
        <Aviso tipo="ok">Tema aprovado: “{carta.tema}”. Ele já aparece para todos na página inicial!</Aviso>
      )}
      {carta.status === "recusada" && (
        <Aviso>O professor pediu outro tema. Escolha uma página ou um subtítulo que esteja no conteúdo da prova.</Aviso>
      )}
      {carta.aberta ? (
        <FormCarta temaAtual={carta.status === "recusada" ? null : carta.tema} />
      ) : (
        <Vazio>
          {carta.tema
            ? `O prazo terminou. Seu tema: "${carta.tema}".`
            : "O prazo para escolher o tema desta carta já terminou."}
        </Vazio>
      )}
    </div>
  );
}
