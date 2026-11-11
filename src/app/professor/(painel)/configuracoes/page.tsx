import type { Metadata } from "next";
import { Titulo } from "@/components/ui";
import { padroesDoProfessor } from "@/lib/padroes";
import { exigirProfessor } from "@/lib/professor";
import { FormConfiguracoes } from "./FormConfiguracoes";

export const metadata: Metadata = { title: "Configurações" };

export default async function Configuracoes() {
  const { supabase } = await exigirProfessor();
  const padroes = await padroesDoProfessor(supabase);
  return (
    <div className="space-y-4">
      <Titulo>Configurações</Titulo>
      <p className="max-w-2xl text-sm text-slate-600">
        Padrões de todo desafio novo, criado aqui ou pelo Claude. Cada desafio ainda pode mudar o que quiser na hora de
        montar ou depois, na aba Ajustes. Mudar aqui não altera os desafios que já existem.
      </p>
      <FormConfiguracoes inicial={padroes} />
    </div>
  );
}
