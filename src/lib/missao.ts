import { formatarDataHora } from "./datas";
import { situacaoDesafio, type TipoDesafio } from "./tipos-banco";

/**
 * Missão do dia: uma única ação clara para o aluno, calculada só com os dados
 * que já existem (desafios, tentativas, erros e data da prova). O professor não
 * precisa cadastrar nada.
 */

export type DesafioMissao = { id: string; tipo?: TipoDesafio; titulo: string; abre_em: string; fecha_em: string };

export type Missao = {
  tipo: "cadurush" | "desafio" | "revisao" | "aguardar" | "prova" | "encerrada";
  titulo: string;
  texto: string;
  href?: string;
  botao?: string;
};

/** "fecha em 3 horas", "faltam 2 dias"... */
export function prazo(fechaEm: string, agora = new Date()): string {
  const ms = new Date(fechaEm).getTime() - agora.getTime();
  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return "fecha em menos de 1 hora";
  if (horas < 24) return `fecha em ${horas} ${horas === 1 ? "hora" : "horas"}`;
  const dias = Math.floor(horas / 24);
  return `${dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`} para fechar`;
}

export function calcularMissao({
  desafios,
  concluidos,
  iniciados,
  errosParaRevisar,
  diasAteProva,
  agora = new Date(),
}: {
  desafios: DesafioMissao[];
  concluidos: Set<string>;
  iniciados: Set<string>;
  errosParaRevisar: number;
  diasAteProva: number;
  agora?: Date;
}): Missao {
  const pendentes = desafios
    .filter((d) => situacaoDesafio(d, agora) === "aberto" && !concluidos.has(d.id))
    .sort((a, b) => a.fecha_em.localeCompare(b.fecha_em));

  const rush = pendentes.find((d) => d.tipo === "relampago");
  if (rush) {
    return {
      tipo: "cadurush",
      titulo: "O CaduRush está aberto!",
      texto: `${rush.titulo}: peça o código do dia ao professor (${prazo(rush.fecha_em, agora)}).`,
      href: `/aluno/desafio/${rush.id}`,
      botao: iniciados.has(rush.id) ? "Continuar o CaduRush" : "Entrar no CaduRush",
    };
  }

  const semanal = pendentes[0];
  if (semanal) {
    return {
      tipo: "desafio",
      titulo: iniciados.has(semanal.id) ? "Termine o seu desafio" : "Faça o desafio da semana",
      texto: `${semanal.titulo} (${prazo(semanal.fecha_em, agora)}).`,
      href: `/aluno/desafio/${semanal.id}`,
      botao: iniciados.has(semanal.id) ? "Continuar" : "Começar agora",
    };
  }

  if (errosParaRevisar > 0) {
    const n = Math.min(errosParaRevisar, 5);
    return {
      tipo: "revisao",
      titulo: "Revise seus erros",
      texto: `Você tem ${errosParaRevisar} ${errosParaRevisar === 1 ? "questão errada" : "questões erradas"} para revisar. Uma rodada rápida de ${n} já ajuda na prova!`,
      href: "/aluno/revisao",
      botao: "Começar a revisão",
    };
  }

  const proximo = desafios
    .filter((d) => situacaoDesafio(d, agora) === "agendado")
    .sort((a, b) => a.abre_em.localeCompare(b.abre_em))[0];
  if (proximo) {
    return {
      tipo: "aguardar",
      titulo: "Tudo em dia!",
      texto: `O próximo desafio, ${proximo.titulo}, abre ${formatarDataHora(proximo.abre_em)}.`,
    };
  }

  if (diasAteProva >= 0) {
    return {
      tipo: "prova",
      titulo: "Tudo em dia!",
      texto:
        diasAteProva === 0
          ? "A prova é hoje. Boa sorte!"
          : `${diasAteProva === 1 ? "Falta 1 dia" : `Faltam ${diasAteProva} dias`} para a prova. Revise a trilha da temporada.`,
    };
  }
  return { tipo: "encerrada", titulo: "Temporada encerrada", texto: "Aguarde a próxima temporada do professor." };
}

/** Próximo CaduRush agendado, para o aviso na página inicial. */
export function proximoCaduRush<D extends DesafioMissao>(desafios: D[], agora = new Date()): D | null {
  return (
    desafios
      .filter((d) => d.tipo === "relampago" && situacaoDesafio(d, agora) === "agendado")
      .sort((a, b) => a.abre_em.localeCompare(b.abre_em))[0] ?? null
  );
}
