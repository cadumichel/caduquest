"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { PendenteForm } from "./BotaoEnviar";
import { useAcaoSemReset } from "./useAcaoSemReset";
import { Aviso } from "./ui";

type Estado = { erro?: string; ok?: string };

/** Formulário com server action que mostra erro/sucesso; limpa os campos após sucesso se pedido. */
export function FormAcao({
  acao,
  children,
  className = "space-y-3",
  limparAoSalvar = false,
}: {
  acao: (estado: Estado, form: FormData) => Promise<Estado>;
  children: ReactNode;
  className?: string;
  limparAoSalvar?: boolean;
}) {
  const { estado, onSubmit, pendente } = useAcaoSemReset(acao);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok && limparAoSalvar) ref.current?.reset();
  }, [estado, limparAoSalvar]);
  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      <PendenteForm value={pendente}>
        {estado.erro && <Aviso>{estado.erro}</Aviso>}
        {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
        {children}
      </PendenteForm>
    </form>
  );
}
