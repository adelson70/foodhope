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
      offset={16}
      mobileOffset={12}
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
