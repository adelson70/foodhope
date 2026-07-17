import { z } from 'zod';

const adicionalSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'Informe o nome do adicional'),
  preco: z.coerce
    .number({ error: 'Informe o preço do adicional' })
    .min(0, 'O valor não pode ser negativo'),
});

export const produtoSchema = z.object({
  nome: z
    .string()
    .min(5, 'Nome do produto deve ser no minimo de 5 letras'),
  descricao: z
    .string()
    .refine(
      (value) => value.trim().length === 0 || value.trim().length >= 10,
      'Descrição deve ter no mínimo 10 caracteres',
    ),
  preco: z.coerce
    .number({ error: 'Informe o preço' })
    .min(0, 'O valor não pode ser negativo')
    .max(99999999.99, 'O valor excede o limite permitido'),
  adicionais: z.array(adicionalSchema).default([]),
});

export type ProdutoFormValues = z.infer<typeof produtoSchema>;
