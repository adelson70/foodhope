import { z } from 'zod';

import { isValidContato, onlyDigits } from '../lib/phone';

export const criarPedidoSchema = z.object({
  cliente: z.object({
    primeiro_nome: z.string().min(1, 'Informe o nome'),
    sobrenome: z.string().optional(),
    contato: z
      .string()
      .optional()
      .transform((value) => (value ? onlyDigits(value) : ''))
      .refine(
        (value) => value === '' || isValidContato(value),
        'Informe um telefone válido com DDI',
      ),
    cidade: z.string().optional(),
  }),
  itens: z
    .array(
      z.object({
        produtoId: z.string().min(1),
        qtd: z.number().int().min(1, 'Quantidade mínima é 1'),
        adicional: z
          .array(
            z.object({
              id: z.string().min(1),
              qtd: z.number().int().min(1),
            }),
          )
          .optional(),
        observacao: z.string().max(140).optional(),
      }),
    )
    .min(1, 'Adicione ao menos um item'),
});

export type CriarPedidoFormValues = z.infer<typeof criarPedidoSchema>;
