import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import { notifyError } from '../../../services';
import { urlImagemProduto } from './produtoFormat';

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
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export function ProdutoImagemField({
  file,
  imagemUrlAtual,
  onChange,
  disabled = false,
}: ProdutoImagemFieldProps) {
  const galeriaId = useId();
  const cameraId = useId();
  const galeriaRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewSrc = objectUrl ?? urlImagemProduto(imagemUrlAtual);

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

    onChange(arquivo);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    validarESelecionar(arquivo);
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
            <ImagePlus size={32} strokeWidth={1.5} />
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
          <ImagePlus size={18} strokeWidth={1.75} />
          Galeria
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="flex-1"
          onClick={() => cameraRef.current?.click()}
        >
          <Camera size={18} strokeWidth={1.75} />
          Tirar foto
        </Button>
        {file || imagemUrlAtual ? (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || !file}
            aria-label="Remover imagem selecionada"
            className="size-12 shrink-0 px-0 py-0 text-danger hover:bg-danger/10 disabled:opacity-40"
            onClick={() => onChange(null)}
            title={
              file
                ? 'Remover seleção'
                : 'A imagem atual só muda ao escolher outra'
            }
          >
            <Trash2 size={20} strokeWidth={1.75} />
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
      <input
        id={cameraId}
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        disabled={disabled}
        onChange={onInputChange}
      />
    </div>
  );
}
