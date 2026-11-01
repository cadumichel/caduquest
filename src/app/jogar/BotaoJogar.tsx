"use client";
import { useState, useTransition } from "react";
import { Aviso, Botao } from "@/components/ui";
import { jogarEra } from "./actions";

export function BotaoJogar({
  era,
  children,
  variante = "primario",
}: {
  era: string;
  children: React.ReactNode;
  variante?: "primario" | "secundario" | "ouro";
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Botao
        variante={variante}
        className="w-full"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const r = await jogarEra(era);
            if (r?.erro) setErro(r.erro);
          })
        }
      >
        {pendente ? "Preparando…" : children}
      </Botao>
      {erro && <Aviso>{erro}</Aviso>}
    </div>
  );
}
