import { z } from 'zod';

export const categoriaSchema = z.object({
  nome: z.string().min(1, 'Informe o nome da categoria'),
});

export type CategoriaFormValues = z.infer<typeof categoriaSchema>;
