import { z } from 'zod';

export const ROLES_OPERADOR = ['ADMIN', 'OPERADOR', 'TOTEM'] as const;

export function usuarioSchema(isEdicao: boolean) {
  return z.object({
    nome: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
    senha: isEdicao
      ? z
          .string()
          .refine(
            (value) => value.length === 0 || value.length >= 4,
            'A senha deve ter pelo menos 4 caracteres',
          )
      : z.string().min(4, 'A senha deve ter pelo menos 4 caracteres'),
    role: z.enum(ROLES_OPERADOR),
  });
}

export type UsuarioFormValues = z.infer<ReturnType<typeof usuarioSchema>>;
