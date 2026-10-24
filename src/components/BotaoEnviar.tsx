"use client";
import { createContext, useContext, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Botao } from "./ui";

/** Estado "enviando" de formulários que não usam a prop `action` (ver useAcaoSemReset). */
export const PendenteForm = createContext(false);

export function BotaoEnviar({
  children,
  pendente = "Salvando…",
  ...props
}: ComponentProps<typeof Botao> & { pendente?: string }) {
  const { pending } = useFormStatus();
  const pendenteContexto = useContext(PendenteForm);
  const emAndamento = pending || pendenteContexto;
  return (
    <Botao type="submit" disabled={emAndamento || props.disabled} {...props}>
      {emAndamento ? pendente : children}
    </Botao>
  );
}
