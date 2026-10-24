import { randomInt } from "node:crypto";

// Sem 0/O, 1/I/L, para evitar confusão ao copiar do quadro.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function gerarCodigoTurma(): string {
  return Array.from({ length: 6 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}
