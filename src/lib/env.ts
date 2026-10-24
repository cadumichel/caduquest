function obrigatoria(nome: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

export const supabaseUrl = () => obrigatoria("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabasePublishableKey = () =>
  obrigatoria("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const supabaseSecretKey = () => obrigatoria("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);

export const segredoSessaoAluno = () =>
  new TextEncoder().encode(obrigatoria("ALUNO_SESSAO_SEGREDO", process.env.ALUNO_SESSAO_SEGREDO));

/** E-mails autorizados a entrar como professor (separados por vírgula). Vazio = qualquer conta. */
export const emailsProfessores = () =>
  (process.env.PROFESSORES_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
