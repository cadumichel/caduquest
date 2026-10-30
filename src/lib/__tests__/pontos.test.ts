import { describe, expect, it } from "vitest";
import { arredondarPontos, formatarPontos } from "../pontos";

describe("pontos", () => {
  it("arredonda somas de frações a 2 casas", () => {
    expect(arredondarPontos(3.33 + 3.33 + 3.34 + 0.1 + 0.2)).toBe(10.3);
    expect(arredondarPontos(10 / 3)).toBe(3.33);
    expect(arredondarPontos(1.005)).toBe(1.01);
  });
  it("exibe com vírgula e no máximo 2 casas", () => {
    expect(formatarPontos(6.666666)).toBe("6,67");
    expect(formatarPontos(12.5)).toBe("12,5");
    expect(formatarPontos(40)).toBe("40");
    expect(formatarPontos("7.30")).toBe("7,3");
    expect(formatarPontos(null)).toBe("0");
  });
});
