import { z } from 'zod';

import { isValidContato, onlyDigits } from '../lib/phone';

export const checkoutClienteSchema = z.object({
  primeiro_nome: z.string().min(1, 'Informe o nome'),
  sobrenome: z.string().min(1, 'Informe o sobrenome'),
  contato: z
    .string()
    .min(1, 'Informe o telefone')
    .transform(onlyDigits)
    .refine(isValidContato, 'Informe um telefone válido com DDI'),
  cidade: z.string().min(1, 'Informe a cidade'),
});

export type CheckoutClienteValues = z.infer<typeof checkoutClienteSchema>;

export const checkoutTotemSchema = z.object({
  nome_completo: z.string().trim().min(1, 'Informe o nome completo'),
});

export type CheckoutTotemValues = z.infer<typeof checkoutTotemSchema>;
