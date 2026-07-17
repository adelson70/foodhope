import { z } from 'zod';

export const loginSchema = z.object({
  nome: z.string().min(1, 'Informe o nome de usuário'),
  senha: z.string().min(1, 'Informe a senha'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
