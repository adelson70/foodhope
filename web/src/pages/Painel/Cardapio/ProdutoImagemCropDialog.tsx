import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

import { Button } from '../../../components/ui';
import { useAnimatedPresence } from '../../../components/ui/useAnimatedPresence';
import { cn } from '../../../lib/cn';
import { notifyError } from '../../../services';
import { getCroppedImg } from './cropImage';

const ZOOM_SLIDER_MIN = -10;
const ZOOM_SLIDER_MAX = 100;
const CROP_ZOOM_MIN = 0.4;
const CROP_ZOOM_MAX = 4;
const CROP_ZOOM_DEFAULT = 1;

function sliderParaZoom(slider: number): number {
  if (slider <= 0) {
    return (
      CROP_ZOOM_MIN +
      ((slider - ZOOM_SLIDER_MIN) / (0 - ZOOM_SLIDER_MIN)) *
        (CROP_ZOOM_DEFAULT - CROP_ZOOM_MIN)
    );
  }

  return (
    CROP_ZOOM_DEFAULT +
    (slider / ZOOM_SLIDER_MAX) * (CROP_ZOOM_MAX - CROP_ZOOM_DEFAULT)
  );
}

function zoomParaSlider(zoom: number): number {
  if (zoom <= CROP_ZOOM_DEFAULT) {
    const t =
      (zoom - CROP_ZOOM_MIN) / (CROP_ZOOM_DEFAULT - CROP_ZOOM_MIN);
    return ZOOM_SLIDER_MIN + t * (0 - ZOOM_SLIDER_MIN);
  }

  const t =
    (zoom - CROP_ZOOM_DEFAULT) / (CROP_ZOOM_MAX - CROP_ZOOM_DEFAULT);
  return t * ZOOM_SLIDER_MAX;
}

type ProdutoImagemCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirm: (file: File) => void;
};

export function ProdutoImagemCropDialog({
  open,
  imageSrc,
  onClose,
  onConfirm,
}: ProdutoImagemCropDialogProps) {
  const { mounted, exiting, onExitAnimationEnd } = useAnimatedPresence(open);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(CROP_ZOOM_DEFAULT);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(CROP_ZOOM_DEFAULT);
    setCroppedAreaPixels(null);
    setProcessando(false);
  }, [open, imageSrc]);

  useEffect(() => {
    if (!mounted || exiting) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !processando) {
        onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, exiting, onClose, processando]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels || processando) return;

    setProcessando(true);
    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels);
      onConfirm(file);
      onClose();
    } catch {
      notifyError(null, 'Não foi possível cortar a imagem.');
      setProcessando(false);
    }
  }

  const zoomSlider = Math.round(zoomParaSlider(zoom));

  if (!mounted || !imageSrc) return null;

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
          exiting ? 'drawer-exit' : 'drawer-enter',
        )}
        onAnimationEnd={onExitAnimationEnd}
      >
        <header className="flex shrink-0 flex-col gap-1 border-b border-operator-border px-4 py-4">
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

        <div
          className="relative min-h-0 flex-1"
          style={{
            backgroundColor: 'var(--color-operator-bg)',
            backgroundImage: [
              'linear-gradient(45deg, color-mix(in srgb, var(--color-on-surface) 10%, transparent) 25%, transparent 25%)',
              'linear-gradient(-45deg, color-mix(in srgb, var(--color-on-surface) 10%, transparent) 25%, transparent 25%)',
              'linear-gradient(45deg, transparent 75%, color-mix(in srgb, var(--color-on-surface) 10%, transparent) 75%)',
              'linear-gradient(-45deg, transparent 75%, color-mix(in srgb, var(--color-on-surface) 10%, transparent) 75%)',
            ].join(', '),
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={CROP_ZOOM_MIN}
            maxZoom={CROP_ZOOM_MAX}
            aspect={1}
            showGrid
            restrictPosition={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: {
                backgroundColor: 'transparent',
              },
              cropAreaStyle: {
                border: '2px solid var(--color-primary)',
              },
            }}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-4 border-t border-operator-border px-4 py-4">
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
              disabled={processando}
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
              disabled={processando || !croppedAreaPixels}
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
