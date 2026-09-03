import { z } from 'zod';

export const infinitepaySchema = z.object({
  handle: z
    .string()
    .trim()
    .min(1, 'Informe a InfiniteTag')
    .transform((value) => value.replace(/^\$+/, '')),
});

export type InfinitePayFormValues = z.infer<typeof infinitepaySchema>;
