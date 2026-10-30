import { describe, expect, it } from "vitest";
import { ehMotivoZerada, elementoEstranho, teclaConta } from "../tela-protegida";

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
