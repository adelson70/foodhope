import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';

import { Button } from '../../../components/ui';
import { useAnimatedPresence } from '../../../components/ui/useAnimatedPresence';
import { cn } from '../../../lib/cn';
import { lockAppScroll, unlockAppScroll } from '../../../lib/scrollLock';
import { notifyError } from '../../../services';

type ProdutoImagemCameraDialogProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

export function ProdutoImagemCameraDialog({
  open,
  onClose,
  onCapture,
}: ProdutoImagemCameraDialogProps) {
  const { mounted, exiting, onExitAnimationEnd } = useAnimatedPresence(open);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [pronto, setPronto] = useState(false);
  const [capturando, setCapturando] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setPronto(false);
    setCapturando(false);

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1920 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setPronto(true);
        }
      } catch {
        notifyError(
          null,
          'Não foi possível acessar a câmera. Verifique a permissão.',
        );
        onClose();
      }
    }

    void iniciar();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!mounted || exiting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !capturando) {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    lockAppScroll();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockAppScroll();
    };
  }, [mounted, exiting, onClose, capturando]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !pronto || capturando) return;

    setCapturando(true);
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      notifyError(null, 'Aguarde a câmera carregar.');
      setCapturando(false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      notifyError(null, 'Não foi possível capturar a foto.');
      setCapturando(false);
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          notifyError(null, 'Não foi possível capturar a foto.');
          setCapturando(false);
          return;
        }

        const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.92,
    );
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center overflow-hidden">
      <button
        type="button"
        aria-label="Fechar câmera"
        className={cn(
          'absolute inset-0 bg-operator-bg/80',
          exiting ? 'overlay-exit' : 'overlay-enter',
        )}
        disabled={exiting || capturando}
        onClick={exiting || capturando ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="produto-camera-title"
        className={cn(
          'relative z-10 flex h-dvh w-full max-w-md flex-col',
          'bg-operator-surface border-x border-operator-border shadow-card',
          exiting ? 'drawer-exit' : 'drawer-enter',
        )}
        onAnimationEnd={onExitAnimationEnd}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-operator-border px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2
            id="produto-camera-title"
            className="text-title-md font-semibold text-on-surface"
          >
            Tirar foto
          </h2>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-operator-bg">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="size-full object-cover"
          />

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <div className="aspect-square w-[min(100%,70vw)] max-w-sm rounded-xl border-2 border-primary shadow-primary-glow" />
            <p className="max-w-xs text-center text-caption text-on-surface">
              Enquadre o produto no quadrado para caber todas as informações
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-operator-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={capturando}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!pronto || capturando}
            onClick={handleCapture}
          >
            <Camera size={18} strokeWidth={1.75} />
            {capturando ? 'Capturando...' : 'Capturar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
