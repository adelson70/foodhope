import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui';
import { notifyError } from '../../../services';
import { urlImagemProduto } from './produtoFormat';
import {
  arquivoImagemAceito,
  prepararImagemParaCrop,
} from './prepararImagemUpload';
import { ProdutoImagemCameraDialog } from './ProdutoImagemCameraDialog';
import { ProdutoImagemCropDialog } from './ProdutoImagemCropDialog';

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
  const cropSessionRef = useRef(0);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSession, setCropSession] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preparando, setPreparando] = useState(false);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewSrc =
    objectUrl ?? urlImagemProduto(imagemUrlAtual, imagemCacheKey);
  const podeRemover = Boolean(file || imagemUrlAtual);
  const ocupado = disabled || preparando;

  const fecharCrop = useCallback(() => {
    setCropOpen(false);
  }, []);

  const limparSessao = useCallback((session: number) => {
    if (cropSessionRef.current !== session) return;
    setCropOpen(false);
    setCropFile(null);
  }, []);

  function abrirCrop(arquivo: File) {
    const session = cropSessionRef.current + 1;
    cropSessionRef.current = session;
    setCropSession(session);
    setCropFile(arquivo);
    setCropOpen(true);
  }

  async function validarESelecionar(arquivo: File | undefined) {
    if (!arquivo || preparando) return;

    if (!arquivoImagemAceito(arquivo)) {
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

    setPreparando(true);
    try {
      const preparado = await prepararImagemParaCrop(arquivo);
      abrirCrop(preparado);
    } catch {
      notifyError(
        null,
        'Não foi possível ler esta foto. No iPhone, use a Galeria (Fotos) ou envie em JPEG/PNG.',
      );
    } finally {
      setPreparando(false);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const arquivo = input.files?.[0];
    void validarESelecionar(arquivo).finally(() => {
      input.value = '';
    });
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
            loading="lazy"
            decoding="async"
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
          disabled={ocupado}
          className="flex-1"
          onClick={() => galeriaRef.current?.click()}
        >
          <ImagePlus size={15} strokeWidth={1.75} />
          {preparando ? 'Preparando...' : 'Galeria'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={ocupado}
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
            disabled={ocupado}
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
        accept="image/*,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
        className="sr-only"
        tabIndex={-1}
        disabled={ocupado}
        onChange={onInputChange}
      />

      <ProdutoImagemCameraDialog
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(arquivo) => {
          void validarESelecionar(arquivo);
        }}
      />

      {cropFile ? (
        <ProdutoImagemCropDialog
          key={cropSession}
          open={cropOpen}
          file={cropFile}
          onClose={fecharCrop}
          onExited={() => limparSessao(cropSession)}
          onConfirm={(proximo) => {
            onChange(proximo);
            fecharCrop();
          }}
        />
      ) : null}
    </div>
  );
}
