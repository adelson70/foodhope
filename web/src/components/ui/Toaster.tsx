import { Toaster as SonnerToaster } from 'sonner';

import 'sonner/dist/styles.css';

export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="top-right"
      closeButton={false}
      expand
      visibleToasts={3}
      duration={4200}
      gap={10}
      offset={{
        top: 'max(1rem, env(safe-area-inset-top))',
        right: 16,
      }}
      mobileOffset={{
        top: 'max(0.75rem, env(safe-area-inset-top))',
        right: 12,
      }}
      className="font-sans"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'w-auto bg-transparent border-0 shadow-none p-0',
        },
      }}
    />
  );
}
