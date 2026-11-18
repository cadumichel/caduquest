import { describe, expect, it } from "vitest";
import { mensagemErroSupabase, validarNovaSenha } from "./senha-professor";

const ok = { atual: "senhaAntiga1", nova: "senhaNova123", confirmacao: "senhaNova123" };

describe("validarNovaSenha", () => {
  it("aceita uma troca válida", () => {
    expect(validarNovaSenha(ok)).toBeNull();
  });
  it("exige a senha atual", () => {
    expect(validarNovaSenha({ ...ok, atual: "" })).toMatch(/senha atual/);
  });
  it("exige pelo menos 8 caracteres", () => {
    expect(validarNovaSenha({ ...ok, nova: "abc1234", confirmacao: "abc1234" })).toMatch(/pelo menos 8/);
  });
  it("recusa mais de 72 bytes", () => {
    const longa = "á".repeat(40); // 80 bytes
    expect(validarNovaSenha({ ...ok, nova: longa, confirmacao: longa })).toMatch(/no máximo/);
  });
  it("recusa espaço nas pontas", () => {
    expect(validarNovaSenha({ ...ok, nova: " senhaNova123", confirmacao: " senhaNova123" })).toMatch(/espaço/);
  });
  it("exige confirmação igual", () => {
    expect(validarNovaSenha({ ...ok, confirmacao: "outraCoisa1" })).toMatch(/confirmação/);
  });
  it("exige senha diferente da atual", () => {
    expect(validarNovaSenha({ atual: "mesmaSenha1", nova: "mesmaSenha1", confirmacao: "mesmaSenha1" })).toMatch(
      /diferente/,
    );
  });
});

describe("mensagemErroSupabase", () => {
  it("traduz códigos conhecidos e tem mensagem padrão", () => {
    expect(mensagemErroSupabase("same_password")).toMatch(/diferente/);
    expect(mensagemErroSupabase("reauthentication_needed")).toMatch(/entre de novo/);
    expect(mensagemErroSupabase(undefined)).toMatch(/Tente de novo/);
  });
});
