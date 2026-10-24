"use client";
import { useTransition, type ReactNode } from "react";
import { Botao } from "./ui";

/** Botão que pede confirmação antes de rodar uma server action. */
export function BotaoConfirmar({
  acao,
  pergunta,
  children,
  variante = "perigo",
  className,
}: {
  acao: () => Promise<unknown>;
  pergunta: string;
  children: ReactNode;
  variante?: "perigo" | "secundario" | "primario" | "fantasma";
  className?: string;
}) {
  const [pendente, iniciar] = useTransition();
  return (
    <Botao
      type="button"
      variante={variante}
      className={className}
      disabled={pendente}
      onClick={() => {
        if (confirm(pergunta)) iniciar(async () => void (await acao()));
      }}
    >
      {pendente ? "…" : children}
    </Botao>
  );
}
