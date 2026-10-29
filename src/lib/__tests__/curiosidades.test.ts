import { describe, expect, it } from "vitest";
import { CURIOSIDADES_RESERVA, escolherCuriosidade, sementeDoDia } from "../curiosidades";

describe("escolherCuriosidade", () => {
  it("usa o banco fixo quando o professor não tem nenhuma", () => {
    expect(CURIOSIDADES_RESERVA).toContain(escolherCuriosidade([], ["Roma"], 7));
  });
  it("prefere as dos capítulos da temporada, sem ligar para acento e maiúsculas", () => {
    const lista = [
      { capitulo: "Grécia", texto: "outra" },
      { capitulo: "Revolução Francesa", texto: "da temporada" },
    ];
    expect(escolherCuriosidade(lista, ["revolucao francesa"], 5)).toBe("da temporada");
    expect(["outra", "da temporada"]).toContain(escolherCuriosidade(lista, ["Egito"], 5));
  });
  it("muda com o dia e é igual para toda a turma", () => {
    expect(sementeDoDia("2026-11-04", "t")).toBe(sementeDoDia("2026-11-04", "t"));
    expect(sementeDoDia("2026-11-04", "t")).not.toBe(sementeDoDia("2026-11-05", "t"));
  });
});
