import { z } from 'zod';

export const impressoraSchema = z.object({
  ip: z
    .string()
    .trim()
    .min(3, 'Informe o IP ou host:porta da impressora')
    .regex(/^\S+$/, 'Informe um IP ou host:porta válido, sem espaços'),
});

export type ImpressoraFormValues = z.infer<typeof impressoraSchema>;
