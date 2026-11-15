import type { ReactNode } from 'react';

import { Button, Drawer } from '../ui';

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Convites do PWA (notificação, instalar): sobe de baixo no celular, modal no desktop. */
export function ConviteDrawer({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Agora não',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Drawer
      open={open}
      title={title}
      variant="dialog"
      onClose={loading ? () => {} : onCancel}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="button" fullWidth disabled={loading} onClick={onConfirm}>
            {loading ? 'Aguarde…' : confirmLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
        </div>
      }
    >
      <div className="text-body-md text-on-surface-variant">{children}</div>
    </Drawer>
  );
}
