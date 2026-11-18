import type { Metadata } from "next";
import { Aviso, Cartao, Subtitulo, Titulo } from "@/components/ui";
import { padroesDoProfessor } from "@/lib/padroes";
import { exigirProfessor } from "@/lib/professor";
import { FormConfiguracoes } from "./FormConfiguracoes";
import { FormSenha } from "./FormSenha";

export const metadata: Metadata = { title: "Configurações" };

export default async function Configuracoes() {
  const { supabase, email } = await exigirProfessor();
  const [padroes, { data: usuario }] = await Promise.all([padroesDoProfessor(supabase), supabase.auth.getUser()]);
  // Conta criada só pelo Google não tem senha no CaduQuest.
  const temSenha = usuario.user?.identities?.some((i) => i.provider === "email") ?? true;

  return (
    <div className="space-y-4">
      <Titulo>Configurações</Titulo>
      <p className="max-w-2xl text-sm text-slate-600">
        Padrões de todo desafio novo, criado aqui ou pelo Claude. Cada desafio ainda pode mudar o que quiser na hora de
        montar ou depois, na aba Ajustes. Mudar aqui não altera os desafios que já existem.
      </p>
      <FormConfiguracoes inicial={padroes} />

      <Cartao className="max-w-md space-y-3">
        <Subtitulo>Minha conta</Subtitulo>
        <p className="text-sm text-slate-600">
          Você entra como <strong>{email}</strong>.
        </p>
        {temSenha ? (
          <FormSenha email={email} />
        ) : (
          <Aviso tipo="info">Você entra com o Google. Para mudar a senha, mude a senha da sua conta Google.</Aviso>
        )}
      </Cartao>
    </div>
  );
}
