"use client";
import { startTransition, useActionState, type FormEvent } from "react";

export type EstadoAcao = { erro?: string; ok?: string };

/**
 * Como useActionState, mas sem o reset automático do formulário que o React
 * faz após uma action: se der erro, o que a pessoa digitou continua lá.
 */
export function useAcaoSemReset(acao: (estado: EstadoAcao, form: FormData) => Promise<EstadoAcao>) {
  const [estado, despachar, pendente] = useActionState<EstadoAcao, FormData>(acao, {});
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => despachar(dados));
  };
  return { estado, onSubmit, pendente };
}
