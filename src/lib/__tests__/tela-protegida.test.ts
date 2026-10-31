import { describe, expect, it } from "vitest";
import { cliqueFora, ehMotivoZerada, elementoEstranho, teclaConta, textoMarca } from "../tela-protegida";

const elemento = (tagName: string, extra: Record<string, unknown> = {}) =>
  ({ nodeType: 1, tagName, ...extra }) as unknown as Node;

describe("tela protegida", () => {
  it("elemento criado pelo React não conta", () => {
    expect(elementoEstranho(elemento("DIV", { __reactFiber$abc123: {} }))).toBe(false);
  });
  it("elemento sem marca do React conta", () => {
    expect(elementoEstranho(elemento("DIV"))).toBe(true);
    expect(elementoEstranho(elemento("mark"))).toBe(true);
  });
  it("ignora texto, scripts, estilos e o anunciador de rotas do Next", () => {
    expect(elementoEstranho({ nodeType: 3 } as Node)).toBe(false);
    expect(elementoEstranho(elemento("STYLE"))).toBe(false);
    expect(elementoEstranho(elemento("script"))).toBe(false);
    expect(elementoEstranho(elemento("next-route-announcer"))).toBe(false);
  });
  it("teclas de volume não contam", () => {
    expect(teclaConta("AudioVolumeUp")).toBe(false);
    expect(teclaConta("a")).toBe(true);
    expect(teclaConta("Tab")).toBe(true);
  });
  it("valida o motivo vindo do cliente", () => {
    expect(ehMotivoZerada("teclado")).toBe(true);
    expect(ehMotivoZerada("outro")).toBe(false);
    expect(ehMotivoZerada(null)).toBe(false);
  });
});

describe("clique fora", () => {
  const alvo = (dentroDe: string | null) => ({
    closest: (sel: string) => (dentroDe && sel.includes(dentroDe) ? {} : null),
  });
  const clique = (pointerType: string, dentroDe: string | null, clientX = 100) =>
    ({ pointerType, clientX, target: alvo(dentroDe) }) as unknown as PointerEvent;

  it("clique de mouse fora de botão conta", () => {
    expect(cliqueFora(clique("mouse", null), 800)).toBe(true);
  });
  it("clique em botão, link ou alça de arrastar não conta", () => {
    expect(cliqueFora(clique("mouse", "button"), 800)).toBe(false);
    expect(cliqueFora(clique("mouse", '[role="button"]'), 800)).toBe(false);
  });
  it("toque no celular e clique na barra de rolagem não contam", () => {
    expect(cliqueFora(clique("touch", null), 800)).toBe(false);
    expect(cliqueFora(clique("mouse", null, 805), 800)).toBe(false);
  });
});

describe("marca d'água", () => {
  it("leva apelido, turma e hora de Brasília", () => {
    expect(textoMarca("LucasG · 8º A", new Date("2026-10-31T22:50:00Z"))).toBe("LucasG · 8º A · 31/10 19:50");
  });
});
