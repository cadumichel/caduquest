import { describe, expect, it } from "vitest";
import {
  saidasRestantes,
  descreverRegraSaidas,
  avisoCliqueTolerado,
  cliquesRestantes,
  descreverRegraCliques,
  cliqueFora,
  cliqueSemMovimento,
  ehMotivoZerada,
  mouseMexeu,
  MOVIMENTOS_MIN,
  elementoEstranho,
  teclaConta,
  textoMarca,
} from "../tela-protegida";

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

describe("resposta sem mexer o mouse", () => {
  const mov = (pointerType: string, movementX: number, movementY = 0, isTrusted = true) =>
    ({ pointerType, movementX, movementY, isTrusted }) as unknown as PointerEvent;

  it("movimento real do mouse ou touchpad conta", () => {
    expect(mouseMexeu(mov("mouse", 3))).toBe(true);
    expect(mouseMexeu(mov("mouse", 0, -1))).toBe(true);
  });
  it("movimento parado (página mudou sob o cursor), por script ou por toque não conta", () => {
    expect(mouseMexeu(mov("mouse", 0, 0))).toBe(false);
    expect(mouseMexeu(mov("mouse", 5, 0, false))).toBe(false);
    expect(mouseMexeu(mov("touch", 5))).toBe(false);
  });
  it("clique sem movimento ou depois de um salto só (agente de navegador) zera", () => {
    const clique = { pointerType: "mouse", isTrusted: true } as PointerEvent;
    expect(cliqueSemMovimento(clique, 0)).toBe(true);
    expect(cliqueSemMovimento(clique, 1)).toBe(true);
    expect(cliqueSemMovimento(clique, MOVIMENTOS_MIN)).toBe(false);
    expect(cliqueSemMovimento(clique, 40)).toBe(false);
  });
  it("toque na tela e caneta não zeram", () => {
    expect(cliqueSemMovimento({ pointerType: "touch", isTrusted: true } as PointerEvent, 0)).toBe(false);
    expect(cliqueSemMovimento({ pointerType: "pen", isTrusted: true } as PointerEvent, 0)).toBe(false);
  });
});

describe("marca d'água", () => {
  it("leva apelido, turma e hora de Brasília", () => {
    expect(textoMarca("LucasG · 8º A", new Date("2026-10-31T22:50:00Z"))).toBe("LucasG · 8º A · 31/10 19:50");
  });
});

describe("regra de cliques fora", () => {
  it("sem escolha (ou sem o SQL) é proibido: o próximo zera", () => {
    expect(cliquesRestantes({}, 0)).toBe(0);
    expect(descreverRegraCliques({})).toBe("clique fora zera");
  });
  it("permitido não conta", () => {
    expect(cliquesRestantes({ regra_cliques: "permitido" }, 5)).toBeNull();
  });
  it("tolerância desconta os avisos já usados", () => {
    const d = { regra_cliques: "tolerancia", tolerancia_cliques: 2 };
    expect(cliquesRestantes(d, 0)).toBe(2);
    expect(cliquesRestantes(d, 1)).toBe(1);
    expect(cliquesRestantes(d, 2)).toBe(0);
    expect(cliquesRestantes(d, 9)).toBe(0);
  });
  it("aviso ao aluno não cita o mouse", () => {
    for (const n of [0, 1, 3]) expect(avisoCliqueTolerado(n).toLowerCase()).not.toContain("mouse");
  });
});

describe("regra de saídas da tela", () => {
  it("padrão proibido; tolerância desconta", () => {
    expect(saidasRestantes({}, 0)).toBe(0);
    const d = { regra_saidas: "tolerancia", tolerancia_saidas: 3 };
    expect(saidasRestantes(d, 1)).toBe(2);
    expect(saidasRestantes(d, 5)).toBe(0);
    expect(descreverRegraSaidas(d)).toContain("3 saídas toleradas");
  });
});
