/**
 * Curiosidade histórica do dia. As do professor chegam pelo conector junto com os
 * lotes de questões; enquanto não houver nenhuma, vale este banco fixo.
 */
export const CURIOSIDADES_RESERVA = [
  "Os egípcios antigos usavam um calendário de 365 dias: 12 meses de 30 dias e mais 5 dias de festa no fim do ano.",
  "O Código de Hamurábi, da Mesopotâmia, tem cerca de 280 leis e é um dos conjuntos de leis escritas mais antigos que conhecemos.",
  "Os fenícios criaram um alfabeto de 22 letras que deu origem aos alfabetos grego e latino, que usamos até hoje.",
  "Os Jogos Olímpicos da Grécia Antiga eram dedicados a Zeus e aconteciam em Olímpia a cada quatro anos.",
  "A democracia de Atenas não incluía todos: mulheres, estrangeiros e escravizados não podiam votar.",
  "Pompeia foi soterrada pela erupção do Vesúvio em 79 d.C., e as cinzas preservaram casas, pinturas e até pães.",
  "A Grande Muralha da China não foi feita de uma vez: são muralhas erguidas e reformadas por várias dinastias ao longo de uns 2 mil anos.",
  "Os vikings chegaram à América do Norte por volta do ano 1000, quase 500 anos antes de Colombo.",
  "A Peste Negra, no século XIV, matou entre um terço e metade da população da Europa.",
  "A prensa de tipos móveis de Gutenberg, por volta de 1450, barateou os livros e ajudou a espalhar as ideias da Reforma.",
  "Os maias criaram uma escrita própria, calendários muito precisos e usavam o número zero.",
  "Tenochtitlán, a capital asteca, foi construída sobre um lago e tinha mais habitantes que muitas cidades europeias da época.",
  "A esquadra de Pedro Álvares Cabral chegou ao litoral da atual Bahia em abril de 1500.",
  "O nome Brasil vem do pau-brasil, árvore cuja tinta vermelha era muito valorizada na Europa.",
  "Antes de 1500, milhões de indígenas viviam no território que hoje é o Brasil, falando centenas de línguas diferentes.",
  "O Quilombo dos Palmares, na serra da Barriga (atual Alagoas), resistiu por quase um século.",
  "Tiradentes era o apelido de Joaquim José da Silva Xavier, que também trabalhava como dentista prático.",
  "A família real portuguesa chegou ao Brasil em 1808, fugindo das tropas de Napoleão.",
  "A Independência do Brasil foi proclamada em 1822, mas Portugal só a reconheceu em 1825.",
  "Dom Pedro II assumiu o trono com apenas 14 anos, em 1840, no chamado Golpe da Maioridade.",
  "A Guerra do Paraguai (1864–1870) foi o maior conflito armado da história da América do Sul.",
  "O Brasil foi o último país das Américas a abolir a escravidão, com a Lei Áurea, em 13 de maio de 1888.",
  "A Revolução Francesa começou em 1789 com a tomada da Bastilha, prisão que simbolizava o poder do rei.",
  "A Revolução Industrial começou na Inglaterra no século XVIII, com máquinas a vapor e fábricas de tecidos.",
  "No início da Revolução Industrial, crianças trabalhavam nas fábricas em jornadas de 12 horas ou mais.",
  "A Primeira Guerra Mundial (1914–1918) foi a primeira a usar em grande escala tanques, aviões e gases tóxicos.",
  "As mulheres brasileiras conquistaram o direito de votar em 1932.",
  "O Brasil enviou cerca de 25 mil soldados da FEB para lutar na Itália durante a Segunda Guerra Mundial.",
  "Brasília foi inaugurada em 1960, no governo de Juscelino Kubitschek, para levar o desenvolvimento ao interior.",
  "O Muro de Berlim dividiu a cidade de 1961 a 1989 e virou o grande símbolo da Guerra Fria.",
  "Em 1969, a missão Apollo 11 levou os primeiros seres humanos a pisar na Lua.",
  "A Constituição de 1988 ficou conhecida como Constituição Cidadã por ampliar direitos depois da ditadura militar.",
];

/** Número estável para o dia e a turma: todos da turma veem a mesma curiosidade no mesmo dia. */
export function sementeDoDia(dia: string, turmaId: string): number {
  let h = 2166136261;
  for (const c of `${dia}:${turmaId}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();

/**
 * Escolhe a curiosidade do dia: primeiro as do professor ligadas aos capítulos da
 * temporada, depois qualquer uma do professor e, por fim, o banco fixo.
 */
export function escolherCuriosidade(
  doProfessor: { capitulo: string | null; texto: string }[],
  capitulos: string[],
  semente: number,
): string {
  const caps = new Set(capitulos.map(normalizar));
  const daTemporada = doProfessor.filter((c) => c.capitulo && caps.has(normalizar(c.capitulo)));
  const lista = daTemporada.length
    ? daTemporada.map((c) => c.texto)
    : doProfessor.length
      ? doProfessor.map((c) => c.texto)
      : CURIOSIDADES_RESERVA;
  return lista[semente % lista.length];
}
