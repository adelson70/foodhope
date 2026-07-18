import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
} from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

import { Button } from '../../../components/ui';
import { useAnimatedPresence } from '../../../components/ui/useAnimatedPresence';
import { cn } from '../../../lib/cn';
import { lockAppScroll, unlockAppScroll } from '../../../lib/scrollLock';
import { notifyError } from '../../../services';
import { getCroppedImg } from './cropImage';

const ZOOM_SLIDER_MIN = 0;
const ZOOM_SLIDER_MAX = 100;
const CROP_ZOOM_MIN = 1;
const CROP_ZOOM_MAX = 4;
const CROP_ZOOM_DEFAULT = 1;
const LAYOUT_READY_MS = 100;

function sliderParaZoom(slider: number): number {
  return (
    CROP_ZOOM_MIN +
    (slider / ZOOM_SLIDER_MAX) * (CROP_ZOOM_MAX - CROP_ZOOM_MIN)
  );
}

function zoomParaSlider(zoom: number): number {
  const t =
    (zoom - CROP_ZOOM_MIN) / (CROP_ZOOM_MAX - CROP_ZOOM_MIN);
  return t * ZOOM_SLIDER_MAX;
}

type ProdutoImagemCropDialogProps = {
  open: boolean;
  file: File;
  onClose: () => void;
  onExited: () => void;
  onConfirm: (file: File) => void;
};

export function ProdutoImagemCropDialog({
  open,
  file,
  onClose,
  onExited,
  onConfirm,
}: ProdutoImagemCropDialogProps) {
  const { mounted, exiting, onExitAnimationEnd } = useAnimatedPresence(open);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const saiuRef = useRef(false);
  const imageSrcRef = useRef<string | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [layoutPronto, setLayoutPronto] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(CROP_ZOOM_DEFAULT);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processando, setProcessando] = useState(false);
  const [imagemPronta, setImagemPronta] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    imageSrcRef.current = url;
    setImageSrc(url);
    setLayoutPronto(false);
    setImagemPronta(false);
    setCrop({ x: 0, y: 0 });
    setZoom(CROP_ZOOM_DEFAULT);
    setCroppedAreaPixels(null);
    setProcessando(false);

    return () => {
      if (imageSrcRef.current === url) {
        imageSrcRef.current = null;
      }
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!mounted || exiting || !imageSrc) return;

    const timeoutId = window.setTimeout(() => {
      setLayoutPronto(true);
    }, LAYOUT_READY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [mounted, exiting, imageSrc]);

  useEffect(() => {
    if (open) {
      saiuRef.current = false;
      return;
    }

    if (mounted) return;

    if (saiuRef.current) return;
    saiuRef.current = true;
    onExitedRef.current();
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted || !exiting) return;

    const timeoutId = window.setTimeout(() => {
      if (saiuRef.current) return;
      saiuRef.current = true;
      onExitedRef.current();
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [open, mounted, exiting]);

  useEffect(() => {
    if (!mounted || exiting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !processando) {
        onCloseRef.current();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    lockAppScroll();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unlockAppScroll();
    };
  }, [mounted, exiting, processando]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function handlePanelAnimationEnd(event: AnimationEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    onExitAnimationEnd(event);
  }

  function handleMediaError() {
    notifyError(null, 'Não foi possível carregar a imagem.');
    onCloseRef.current();
  }

  async function handleConfirm() {
    const src = imageSrcRef.current ?? imageSrc;
    if (!src || !croppedAreaPixels || processando) return;

    setProcessando(true);
    try {
      const cortada = await getCroppedImg(src, croppedAreaPixels);
      onConfirm(cortada);
      onClose();
    } catch {
      notifyError(null, 'Não foi possível cortar a imagem.');
      setProcessando(false);
    }
  }

  const zoomSlider = Math.round(zoomParaSlider(zoom));
  const mostrarCropper = Boolean(imageSrc && layoutPronto && !exiting);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center overflow-hidden">
      <button
        type="button"
        aria-label="Fechar crop"
        className={cn(
          'absolute inset-0 bg-operator-bg/80',
          exiting ? 'overlay-exit' : 'overlay-enter',
        )}
        disabled={exiting || processando}
        onClick={exiting || processando ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="produto-crop-title"
        className={cn(
          'relative z-10 flex h-dvh w-full max-w-md flex-col',
          'bg-operator-surface border-x border-operator-border shadow-card',
          exiting ? 'overlay-exit' : 'overlay-enter',
        )}
        onAnimationEnd={handlePanelAnimationEnd}
      >
        <header className="flex shrink-0 flex-col gap-1 border-b border-operator-border px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2
            id="produto-crop-title"
            className="text-title-md font-semibold text-on-surface"
          >
            Ajustar foto
          </h2>
          <p className="text-caption text-on-surface-variant">
            Enquadre o produto no quadrado — é assim que a foto aparece no
            cardápio
          </p>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-operator-bg">
          {mostrarCropper ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={CROP_ZOOM_MIN}
              maxZoom={CROP_ZOOM_MAX}
              aspect={1}
              objectFit="cover"
              showGrid
              restrictPosition
              zoomWithScroll={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onMediaLoaded={() => setImagemPronta(true)}
              mediaProps={{
                onError: handleMediaError,
              }}
              style={{
                containerStyle: {
                  backgroundColor: 'var(--color-operator-bg)',
                },
                cropAreaStyle: {
                  border: '2px solid var(--color-primary)',
                },
              }}
            />
          ) : imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              className="size-full object-cover"
              draggable={false}
              onError={handleMediaError}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-caption text-on-surface-variant">
              Carregando foto...
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-4 border-t border-operator-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-caption text-on-surface-variant">
              <span>Zoom</span>
              <span>{zoomSlider}</span>
            </span>
            <input
              type="range"
              min={ZOOM_SLIDER_MIN}
              max={ZOOM_SLIDER_MAX}
              step={1}
              value={zoomSlider}
              disabled={processando || !imagemPronta}
              onChange={(event) =>
                setZoom(sliderParaZoom(Number(event.target.value)))
              }
              className="w-full accent-primary"
            />
          </label>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              disabled={processando}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={processando || !croppedAreaPixels || !imagemPronta}
              onClick={handleConfirm}
            >
              {processando ? 'Processando...' : 'Usar foto'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
