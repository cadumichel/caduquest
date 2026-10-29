import type { Metadata } from "next";
import { exigirAluno } from "@/lib/aluno-sessao";
import { errosParaRevisar } from "@/lib/revisao";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { BotaoLink, Vazio } from "@/components/ui";
import { Revisao } from "./Revisao";

export const metadata: Metadata = { title: "Revisão de erros" };

export default async function PaginaRevisao() {
  const aluno = await exigirAluno();
  const erros = await errosParaRevisar(criarClienteAdmin(), aluno.id, aluno.turmaId);
  if (!erros.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-marca-900">Revisão de erros</h1>
        <Vazio>
          Nada para revisar agora. As questões que você errar aparecem aqui quando o desafio fechar e o gabarito sair.
        </Vazio>
        <BotaoLink href="/aluno" variante="secundario">
          Voltar ao início
        </BotaoLink>
      </div>
    );
  }
  return <Revisao pendentes={erros.length} />;
}
