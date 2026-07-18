import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import { notifyError } from '../../../services';
import { urlImagemProduto } from './produtoFormat';
import { ProdutoImagemCameraDialog } from './ProdutoImagemCameraDialog';
import { ProdutoImagemCropDialog } from './ProdutoImagemCropDialog';

const MIME_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 50 * 1024 * 1024;

type ProdutoImagemFieldProps = {
  file: File | null;
  imagemUrlAtual?: string | null;
  imagemCacheKey?: string | null;
  onChange: (file: File | null) => void;
  onRemoverImagemAtual?: () => void;
  disabled?: boolean;
};

export function ProdutoImagemField({
  file,
  imagemUrlAtual,
  imagemCacheKey,
  onChange,
  onRemoverImagemAtual,
  disabled = false,
}: ProdutoImagemFieldProps) {
  const galeriaId = useId();
  const galeriaRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const previewSrc =
    objectUrl ?? urlImagemProduto(imagemUrlAtual, imagemCacheKey);
  const podeRemover = Boolean(file || imagemUrlAtual);

  function abrirCrop(arquivo: File) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    const url = URL.createObjectURL(arquivo);
    setCropSrc(url);
    setCropOpen(true);
  }

  function fecharCrop() {
    setCropOpen(false);
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  }

  function validarESelecionar(arquivo: File | undefined) {
    if (!arquivo) return;

    if (!MIME_PERMITIDOS.has(arquivo.type)) {
      notifyError(
        null,
        'Formato de imagem inválido. Use JPEG, PNG, WebP ou GIF.',
      );
      return;
    }

    if (arquivo.size > MAX_BYTES) {
      notifyError(null, 'A imagem deve ter no máximo 50MB.');
      return;
    }

    abrirCrop(arquivo);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    validarESelecionar(arquivo);
  }

  function handleRemover() {
    if (file) {
      onChange(null);
      return;
    }

    onChange(null);
    if (imagemUrlAtual) {
      onRemoverImagemAtual?.();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-operator-border bg-operator-bg">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="Prévia do produto"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 text-on-surface-variant">
            <ImagePlus size={27} strokeWidth={1.5} />
            <span className="text-caption">Sem imagem</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="flex-1"
          onClick={() => galeriaRef.current?.click()}
        >
          <ImagePlus size={15} strokeWidth={1.75} />
          Galeria
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="flex-1"
          onClick={() => setCameraOpen(true)}
        >
          <Camera size={15} strokeWidth={1.75} />
          Tirar foto
        </Button>
        {podeRemover ? (
          <Button
            type="button"
            variant="dangerGhost"
            disabled={disabled}
            aria-label="Remover imagem"
            className="size-12 shrink-0 px-0 py-0 disabled:opacity-40"
            onClick={handleRemover}
            title="Remover imagem"
          >
            <Trash2 size={17} strokeWidth={1.75} />
          </Button>
        ) : null}
      </div>

      <input
        id={galeriaId}
        ref={galeriaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={onInputChange}
      />

      <ProdutoImagemCameraDialog
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={validarESelecionar}
      />

      <ProdutoImagemCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onClose={fecharCrop}
        onConfirm={onChange}
      />
    </div>
  );
}
