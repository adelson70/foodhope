import { z } from 'zod';

const adicionalSchema = z.object({
  id: z
    .union([z.string(), z.literal('')])
    .optional()
    .transform((value) => (value && value.trim() !== '' ? value : undefined)),
  nome: z.string().min(1, 'Informe o nome do adicional'),
  preco: z.coerce
    .number({ error: 'Informe o preço do adicional' })
    .min(0, 'O valor não pode ser negativo'),
  ativo: z.boolean().default(true),
});

const ingredienteSchema = z.object({
  id: z
    .union([z.string(), z.literal('')])
    .optional()
    .transform((value) => (value && value.trim() !== '' ? value : undefined)),
  nome: z.string().min(1, 'Informe o nome do ingrediente'),
});

const variacaoSchema = z.object({
  id: z
    .union([z.string(), z.literal('')])
    .optional()
    .transform((value) => (value && value.trim() !== '' ? value : undefined)),
  nome: z.string().trim().min(1, 'Informe o nome da variação'),
  preco: z.coerce
    .number({ error: 'Informe o preço da variação' })
    .min(0, 'O valor não pode ser negativo')
    .max(99999999.99, 'O valor excede o limite permitido'),
  ativo: z.boolean().default(true),
});

export const produtoSchema = z
  .object({
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
    ativo: z.boolean().default(true),
    imprimirSeparado: z.boolean().default(false),
    ignorarImpressaoSozinho: z.boolean().default(false),
    categoriaId: z.string().nullable().optional(),
    adicionais: z.array(adicionalSchema).default([]),
    adicionalGlobalIds: z.array(z.string()).default([]),
    ingredientes: z.array(ingredienteSchema).default([]),
    tipo: z.enum(['SIMPLES', 'VARIAVEL']).default('SIMPLES'),
    variacoes: z.array(variacaoSchema).default([]),
  })
  .superRefine((values, ctx) => {
    if (values.tipo !== 'VARIAVEL') return;
    if (values.variacoes.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['variacoes'],
        message: 'Adicione ao menos uma variação',
      });
      return;
    }
    const vistos = new Set<string>();
    values.variacoes.forEach((variacao, index) => {
      const chave = variacao.nome.trim().toLowerCase();
      if (vistos.has(chave)) {
        ctx.addIssue({
          code: 'custom',
          path: ['variacoes', index, 'nome'],
          message: 'Já existe uma variação com esse nome',
        });
      }
      vistos.add(chave);
    });
  });

export type ProdutoFormValues = {
  nome: string;
  descricao: string;
  preco: number;
  ativo: boolean;
  imprimirSeparado: boolean;
  ignorarImpressaoSozinho: boolean;
  categoriaId: string | null;
  adicionais: Array<{
    id?: string;
    nome: string;
    preco: number;
    ativo: boolean;
  }>;
  adicionalGlobalIds: string[];
  ingredientes: Array<{
    id?: string;
    nome: string;
  }>;
  tipo: 'SIMPLES' | 'VARIAVEL';
  variacoes: Array<{
    id?: string;
    nome: string;
    preco: number;
    ativo: boolean;
  }>;
};
