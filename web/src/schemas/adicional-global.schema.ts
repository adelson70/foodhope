import { z } from 'zod';

export const adicionalGlobalSchema = z.object({
  nome: z.string().min(1, 'Informe o nome do adicional'),
  preco: z.coerce
    .number({ error: 'Informe o preço do adicional' })
    .min(0, 'O valor não pode ser negativo')
    .max(99999999.99, 'O valor excede o limite permitido'),
});

export type AdicionalGlobalFormValues = z.infer<typeof adicionalGlobalSchema>;
