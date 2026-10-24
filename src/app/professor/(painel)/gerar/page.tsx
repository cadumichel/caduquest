import type { Metadata } from "next";
import { Titulo } from "@/components/ui";
import { exigirProfessor } from "@/lib/professor";
import { FormGerar } from "./FormGerar";

export const metadata: Metadata = { title: "Gerar com o Claude" };

// A geração de um lote pode levar mais de um minuto.
export const maxDuration = 300;

export default async function Gerar() {
  const { supabase } = await exigirProfessor();
  const { data } = await supabase.from("questoes").select("capitulo").not("capitulo", "is", null);
  const capitulos = [...new Set((data ?? []).map((c) => c.capitulo as string))].sort();
  return (
    <div className="space-y-4">
      <Titulo>Gerar questões com o Claude</Titulo>
      <FormGerar capitulos={capitulos} />
    </div>
  );
}
