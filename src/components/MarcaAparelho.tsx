"use client";
import { useEffect } from "react";

/** Chaves da marca "já entrou neste aparelho" (localStorage). */
export const MARCA_TURMA = "cq_ja_entrou_turma";
export const MARCA_PUBLICO = "cq_ja_entrou_publico";

/** Lê a marca; sem acesso ao armazenamento, conta como "nunca entrou". */
export function temMarca(chave: string) {
  try {
    return window.localStorage.getItem(chave) === "1";
  } catch {
    return false;
  }
}

/**
 * Deixa a marca depois de um login bem-sucedido. Na próxima visita à tela de
 * entrada, o aparelho que nunca teve login abre direto em "Primeira vez aqui".
 */
export function MarcaAparelho({ chave }: { chave: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(chave, "1");
    } catch {
      // Navegação privada ou armazenamento bloqueado: segue sem a marca.
    }
  }, [chave]);
  return null;
}
