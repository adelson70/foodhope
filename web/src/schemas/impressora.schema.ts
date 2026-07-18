import { z } from 'zod';

export const impressoraSchema = z
  .object({
    ip: z.string(),
    dispositivo: z.string().nullable(),
  })
  .superRefine((values, ctx) => {
    const ip = values.ip.trim();
    const dispositivo = values.dispositivo?.trim() || null;

    if (ip && dispositivo) {
      ctx.addIssue({
        code: 'custom',
        path: ['ip'],
        message: 'Informe apenas o IP ou a porta local, não os dois',
      });
      return;
    }

    if (dispositivo) {
      if (
        !/^(?:\/dev\/(?:usb\/)?lp\d+|\/dev\/tty(?:USB|ACM)\d+|\/dev\/serial\/by-id\/[A-Za-z0-9._+-]+|COM\d+)$/i.test(
          dispositivo,
        )
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['dispositivo'],
          message: 'Dispositivo local inválido',
        });
      }
      return;
    }

    if (!ip || ip.length < 3) {
      ctx.addIssue({
        code: 'custom',
        path: ['ip'],
        message: 'Informe o IP ou escolha uma porta local',
      });
      return;
    }

    if (/\s/.test(ip)) {
      ctx.addIssue({
        code: 'custom',
        path: ['ip'],
        message: 'Informe um IP ou host:porta válido, sem espaços',
      });
    }
  });

export type ImpressoraFormValues = z.infer<typeof impressoraSchema>;
