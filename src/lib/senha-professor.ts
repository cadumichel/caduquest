/** Regras da troca de senha do professor (tela Configurações). */

export const SENHA_MIN = 8;
export const SENHA_MAX = 72; // limite do bcrypt usado pelo Supabase Auth

export type DadosSenha = { atual: string; nova: string; confirmacao: string };

/** Confere o que dá para conferir sem o servidor. Devolve a mensagem de erro ou null. */
export function validarNovaSenha({ atual, nova, confirmacao }: DadosSenha): string | null {
  if (!atual) return "Digite a sua senha atual.";
  if (nova.length < SENHA_MIN) return `A nova senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  if (new TextEncoder().encode(nova).length > SENHA_MAX) return `A nova senha pode ter no máximo ${SENHA_MAX} caracteres.`;
  if (nova.trim() !== nova) return "A nova senha não pode começar nem terminar com espaço.";
  if (nova !== confirmacao) return "A confirmação não é igual à nova senha.";
  if (nova === atual) return "A nova senha precisa ser diferente da atual.";
  return null;
}

/** Traduz os códigos de erro do Supabase Auth ao trocar a senha. */
export function mensagemErroSupabase(codigo: string | undefined): string {
  switch (codigo) {
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
    case "weak_password":
      return "Senha fraca demais. Use letras e números, com pelo menos 8 caracteres.";
    case "reauthentication_needed":
    case "session_not_found":
    case "session_expired":
      return "Por segurança, saia do painel, entre de novo e troque a senha logo em seguida.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    default:
      return "Não foi possível trocar a senha agora. Tente de novo em instantes.";
  }
}
