/**
 * Personagens históricos para o avatar do aluno. Cada um é uma ilustração redonda
 * (256×256, WebP com fundo transparente fora do círculo) em public/personagens; os
 * especiais já vêm com a moldura dourada.
 */

export type Personagem = { nome: string; epoca: string; imagem: string };

const TODOS: Personagem[] = [
  { nome: "Cleópatra", epoca: "Egito Antigo", imagem: "/personagens/cleopatra.webp" },
  { nome: "Júlio César", epoca: "Roma Antiga", imagem: "/personagens/julio-cesar.webp" },
  { nome: "Faraó", epoca: "Egito Antigo", imagem: "/personagens/farao.webp" },
  { nome: "Legionário romano", epoca: "Roma Antiga", imagem: "/personagens/legionario-romano.webp" },
  { nome: "Viking", epoca: "Escandinávia medieval", imagem: "/personagens/viking.webp" },
  { nome: "Joana d'Arc", epoca: "França medieval", imagem: "/personagens/joana-d-arc.webp" },
  { nome: "Samurai", epoca: "Japão feudal", imagem: "/personagens/samurai.webp" },
  { nome: "Leonardo da Vinci", epoca: "Renascimento", imagem: "/personagens/leonardo-da-vinci.webp" },
  { nome: "Napoleão", epoca: "França, séc. XIX", imagem: "/personagens/napoleao.webp" },
  { nome: "Marie Curie", epoca: "Ciência, séc. XX", imagem: "/personagens/marie-curie.webp" },
  { nome: "Albert Einstein", epoca: "Ciência, séc. XX", imagem: "/personagens/albert-einstein.webp" },
  { nome: "Gandhi", epoca: "Índia, séc. XX", imagem: "/personagens/gandhi.webp" },
  { nome: "Frida Kahlo", epoca: "México, séc. XX", imagem: "/personagens/frida-kahlo.webp" },
  { nome: "Tiradentes", epoca: "Brasil, Inconfidência", imagem: "/personagens/tiradentes.webp" },
  { nome: "Dom Pedro I", epoca: "Brasil Império", imagem: "/personagens/dom-pedro-i.webp" },
  { nome: "Princesa Isabel", epoca: "Brasil Império", imagem: "/personagens/princesa-isabel.webp" },
  { nome: "Zumbi dos Palmares", epoca: "Brasil Colônia", imagem: "/personagens/zumbi-dos-palmares.webp" },
  { nome: "Dandara", epoca: "Brasil Colônia", imagem: "/personagens/dandara.webp" },
  { nome: "Santos Dumont", epoca: "Brasil, séc. XX", imagem: "/personagens/santos-dumont.webp" },
  { nome: "Getúlio Vargas", epoca: "Brasil, séc. XX", imagem: "/personagens/getulio-vargas.webp" },
  { nome: "Caçador pré-histórico", epoca: "Pré-História", imagem: "/personagens/cacador-pre-historico.webp" },
  { nome: "Hoplita grego", epoca: "Grécia Antiga", imagem: "/personagens/hoplita-grego.webp" },
  { nome: "Cavaleiro medieval", epoca: "Idade Média", imagem: "/personagens/cavaleiro-medieval.webp" },
  { nome: "Monge copista", epoca: "Idade Média", imagem: "/personagens/monge-copista.webp" },
  { nome: "Navegador português", epoca: "Grandes Navegações", imagem: "/personagens/navegador-portugues.webp" },
  { nome: "Pirata", epoca: "Séculos XVII–XVIII", imagem: "/personagens/pirata.webp" },
  { nome: "Guerreiro tupi", epoca: "Brasil, povos originários", imagem: "/personagens/guerreiro-tupi.webp" },
  { nome: "Cangaceiro", epoca: "Brasil, Nordeste", imagem: "/personagens/cangaceiro.webp" },
  { nome: "Pracinha da FEB", epoca: "Brasil, 2ª Guerra", imagem: "/personagens/pracinha-da-feb.webp" },
  { nome: "Astronauta", epoca: "Corrida espacial", imagem: "/personagens/astronauta.webp" },
  { nome: "Escudeira viking", epoca: "Escandinávia medieval", imagem: "/personagens/escudeira-viking.webp" },
  { nome: "Mulher ateniense", epoca: "Grécia Antiga", imagem: "/personagens/mulher-ateniense.webp" },
  { nome: "Camponesa medieval", epoca: "Idade Média", imagem: "/personagens/camponesa-medieval.webp" },
  { nome: "Dama da corte", epoca: "Europa, séc. XVIII", imagem: "/personagens/dama-da-corte.webp" },
  { nome: "Operária", epoca: "Revolução Industrial", imagem: "/personagens/operaria.webp" },
  { nome: "Sufragista", epoca: "Início do séc. XX", imagem: "/personagens/sufragista.webp" },
  { nome: "Baiana do acarajé", epoca: "Brasil, tradição afro-baiana", imagem: "/personagens/baiana-do-acaraje.webp" },
  { nome: "Enfermeira", epoca: "Guerra do Paraguai", imagem: "/personagens/enfermeira.webp" },
  { nome: "Aviadora", epoca: "Anos 1920", imagem: "/personagens/aviadora.webp" },
  { nome: "Cientista", epoca: "Ciência moderna", imagem: "/personagens/cientista.webp" },
  { nome: "Nefertiti", epoca: "Egito Antigo", imagem: "/personagens/nefertiti.webp" },
  { nome: "Elizabeth I", epoca: "Inglaterra, séc. XVI", imagem: "/personagens/elizabeth-i.webp" },
  { nome: "Maria Quitéria", epoca: "Brasil, Independência", imagem: "/personagens/maria-quiteria.webp" },
  { nome: "Rosa Parks", epoca: "EUA, direitos civis", imagem: "/personagens/rosa-parks.webp" },
  { nome: "Malala", epoca: "Paquistão, séc. XXI", imagem: "/personagens/malala.webp" },
];

const porNome = (nomes: string[]) =>
  nomes.map((n) => {
    const p = TODOS.find((t) => t.nome === n);
    if (!p) throw new Error(`Personagem não encontrado: ${n}`);
    return p;
  });

/**
 * Ordem fixa = índice salvo em alunos.avatar. Personagens novos entram sempre no
 * fim, para não mudar o avatar de quem já escolheu.
 */
export const PERSONAGENS = porNome([
  // 0–19: básicos
  "Caçador pré-histórico",
  "Faraó",
  "Hoplita grego",
  "Legionário romano",
  "Viking",
  "Cavaleiro medieval",
  "Monge copista",
  "Samurai",
  "Navegador português",
  "Guerreiro tupi",
  "Pirata",
  "Dandara",
  "Princesa Isabel",
  "Cangaceiro",
  "Santos Dumont",
  "Frida Kahlo",
  "Getúlio Vargas",
  "Gandhi",
  "Pracinha da FEB",
  "Astronauta",
  // 20–29: especiais
  "Cleópatra",
  "Júlio César",
  "Joana d'Arc",
  "Leonardo da Vinci",
  "Zumbi dos Palmares",
  "Tiradentes",
  "Napoleão",
  "Dom Pedro I",
  "Marie Curie",
  "Albert Einstein",
  // 30–39: básicos
  "Escudeira viking",
  "Mulher ateniense",
  "Camponesa medieval",
  "Dama da corte",
  "Operária",
  "Sufragista",
  "Baiana do acarajé",
  "Enfermeira",
  "Aviadora",
  "Cientista",
  // 40–44: especiais
  "Nefertiti",
  "Elizabeth I",
  "Maria Quitéria",
  "Rosa Parks",
  "Malala",
]);
export const TOTAL_PERSONAGENS = PERSONAGENS.length;

const indice = (nome: string) => PERSONAGENS.findIndex((p) => p.nome === nome);

/** Especiais na ordem de desbloqueio: o 1º desafio vencido libera o 1º, o 2º libera o 2º, e assim por diante. */
export const ORDEM_ESPECIAIS = [
  "Cleópatra",
  "Nefertiti",
  "Júlio César",
  "Joana d'Arc",
  "Elizabeth I",
  "Leonardo da Vinci",
  "Zumbi dos Palmares",
  "Tiradentes",
  "Maria Quitéria",
  "Napoleão",
  "Dom Pedro I",
  "Rosa Parks",
  "Marie Curie",
  "Albert Einstein",
  "Malala",
].map(indice);

/** Liberados para todos, na ordem da tela de escolha (dois do 1º lote, um do 2º, intercalados). */
export const BASICOS = Array.from({ length: 10 }, (_, k) => [2 * k, 2 * k + 1, 30 + k]).flat();

export const ehEspecial = (avatar: number) => ORDEM_ESPECIAIS.includes(avatar);

/** Quantas medalhas o aluno precisa para usar este avatar (0 para os básicos). */
export const medalhasNecessarias = (avatar: number) => ORDEM_ESPECIAIS.indexOf(avatar) + 1;
