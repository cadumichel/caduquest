import { describe, expect, it } from "vitest";
import { apelidoImproprio } from "../apelido";

describe("apelidoImproprio", () => {
  it.each([
    "porra",
    "P0RR4",
    "poooorra",
    "p.o.r.r.a",
    "caralhinho",
    "Fdp",
    "vai tomar no cu",
    "cu",
    "BuCeTa_10",
    "s3x0",
    "puta",
    "pqp",
  ])("barra %s", (apelido) => expect(apelidoImproprio(apelido)).toBe(true));

  it.each([
    "Cunha",
    "Picasso",
    "Pauline",
    "Rolando",
    "Ana Clara",
    "Napoleão",
    "Robespierre",
    "Lucas_07",
    "Marcus",
    "Computador",
    "Disputa",
    "Pintor",
    "Abundante",
    "Mongol",
  ])("aceita %s", (apelido) => expect(apelidoImproprio(apelido)).toBe(false));
});
