/** Texto dos alertas de um aluno no resultado do desafio (só o painel do professor vê). */
export type ContagemAlertas = {
  zeradasPorSaida: number;
  zeradasTeclado: number;
  zeradasTela: number;
  zeradasClique: number;
  zeradasSemMouse: number;
  verificacoes: number;
  verificacoesErradas: number;
  saidasTela: number;
  esgotadas: number;
};

const n = (q: number, um: string, varios: string) => `${q} ${q === 1 ? um : varios}`;

/** graves = tiraram pontos; avisos = só registrados. */
export function descreverAlertas(l: ContagemAlertas): { graves: string[]; avisos: string[] } {
  const porSaida = l.zeradasPorSaida - l.zeradasTeclado - l.zeradasClique - l.zeradasSemMouse - l.zeradasTela;
  const graves = [
    l.zeradasTeclado > 0 && n(l.zeradasTeclado, "zerada por tecla", "zeradas por tecla"),
    l.zeradasClique > 0 && n(l.zeradasClique, "zerada por clique fora", "zeradas por clique fora"),
    l.zeradasSemMouse > 0 && n(l.zeradasSemMouse, "zerada sem mexer o mouse", "zeradas sem mexer o mouse"),
    l.zeradasTela > 0 && n(l.zeradasTela, "zerada por extensão", "zeradas por extensão"),
    porSaida > 0 && n(porSaida, "zerada por sair da tela", "zeradas por sair da tela"),
    l.verificacoesErradas > 0 && n(l.verificacoesErradas, "questão teste errada", "questões teste erradas"),
  ].filter((x): x is string => Boolean(x));
  const avisos = [
    l.saidasTela > 0 && porSaida <= 0 && `saiu da tela ${l.saidasTela}×`,
    l.esgotadas > 0 && n(l.esgotadas, "com tempo esgotado", "com tempo esgotado"),
  ].filter((x): x is string => Boolean(x));
  return { graves, avisos };
}
