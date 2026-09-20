import { Info } from 'lucide-react';

import { Button, Drawer } from '../../../components/ui';
import {
  APP_GIT_SHA,
  APP_GIT_SHA_CURTO,
  APP_VERSION,
} from '../../../lib/appInfo';

type ConfigSobreDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function ConfigSobreDrawer({ open, onClose }: ConfigSobreDrawerProps) {
  return (
    <Drawer
      open={open}
      title="Sobre"
      onClose={onClose}
      footer={
        <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-container/30 text-primary">
            <Info size={19} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-body-md font-medium text-on-surface">Food Hope</p>
            <p className="text-caption text-on-surface-variant">
              Plataforma de pedidos e painel de gestão
            </p>
          </div>
        </div>

        <dl className="flex flex-col gap-3 rounded-xl border border-operator-border bg-surface-container-low p-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-caption text-on-surface-variant">Versão</dt>
            <dd className="text-body-md font-medium text-on-surface">
              {APP_VERSION}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-operator-border pt-3">
            <dt className="text-caption text-on-surface-variant">Hash</dt>
            <dd
              className="break-all font-mono text-body-md text-on-surface"
              title={APP_GIT_SHA}
            >
              {APP_GIT_SHA_CURTO}
              {APP_GIT_SHA !== 'dev' && APP_GIT_SHA.length > 7 ? (
                <span className="mt-1 block text-caption text-on-surface-variant">
                  {APP_GIT_SHA}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>
    </Drawer>
  );
}
