import { z } from 'zod';

export const criarPedidoSchema = z.object({
  cliente: z.object({
    primeiro_nome: z.string().min(1, 'Informe o nome'),
    sobrenome: z.string().optional(),
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
        retirar: z.array(z.string().min(1)).optional(),
        observacao: z.string().max(140).optional(),
      }),
    )
    .min(1, 'Adicione ao menos um item'),
});

export type CriarPedidoFormValues = z.infer<typeof criarPedidoSchema>;
