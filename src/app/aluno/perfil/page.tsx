import type { Metadata } from "next";
import { exigirAluno } from "@/lib/aluno-sessao";
import { medalhasDaTurma } from "@/lib/medalhas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { EscolherAvatar } from "./EscolherAvatar";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function Perfil() {
  const aluno = await exigirAluno();
  const medalhas = await medalhasDaTurma(criarClienteAdmin(), aluno.turmaId);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Meu perfil</h1>
      <EscolherAvatar
        apelido={aluno.apelido}
        avatarAtual={aluno.avatar}
        corAtual={aluno.cor}
        medalhas={medalhas.get(aluno.id) ?? 0}
      />
    </div>
  );
}
