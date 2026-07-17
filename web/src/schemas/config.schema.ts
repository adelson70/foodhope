import { z } from 'zod';

export const configSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  senha: z
    .string()
    .refine(
      (value) => value.length === 0 || value.length >= 4,
      'A senha deve ter pelo menos 4 caracteres',
    ),
});

export type ConfigFormValues = z.infer<typeof configSchema>;
