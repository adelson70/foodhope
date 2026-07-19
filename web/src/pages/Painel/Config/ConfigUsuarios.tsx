import { useCallback, useEffect, useState } from 'react';
import { LogOut, Pencil, Plus, Trash2 } from 'lucide-react';

import { Button, ConfirmDialog, Skeleton } from '../../../components/ui';
import { useDeferredLoading } from '../../../hooks/useDeferredLoading';
import { getApiErrorMensagens, operadorService } from '../../../services';
import type { Operador, RoleOperador } from '../../../services/types';
import { useSessao } from '../../../routes/sessao';
import { ConfigBackLink } from './ConfigBackLink';
import { UsuarioDrawer } from './UsuarioDrawer';

const ROLE_LABEL: Record<RoleOperador, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  TOTEM: 'Totem',
};

export function ConfigUsuarios() {
  const { operador: atual } = useSessao();
  const [usuarios, setUsuarios] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [editando, setEditando] = useState<Operador | null>(null);
  const [excluindo, setExcluindo] = useState<Operador | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const showSkeleton = useDeferredLoading(loading);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const response = await operadorService.listar();
      if (!response.sucesso || !response.dados) {
        setErro('Não foi possível carregar os usuários.');
        setUsuarios([]);
        return;
      }
      setUsuarios(response.dados.operadores);
    } catch (error: unknown) {
      const mensagens = getApiErrorMensagens(error);
      setErro(mensagens[0] ?? 'Não foi possível carregar os usuários.');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function abrirCriar() {
    setEditando(null);
    setDrawerAberto(true);
  }

  function abrirEditar(usuario: Operador) {
    setEditando(usuario);
    setDrawerAberto(true);
  }

  function fecharDrawer() {
    setDrawerAberto(false);
    setEditando(null);
  }

  function handleSaved() {
    void carregar();
  }

  async function handleForcarLogout(usuario: Operador) {
    setBusyId(usuario.id);
    try {
      await operadorService.forcarLogout(usuario.id);
    } catch {
      return;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const id = excluindo.id;
    setBusyId(id);
    try {
      const response = await operadorService.deletar(id);
      if (!response.sucesso) return;
      setExcluindo(null);
      await carregar();
    } catch {
      return;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-dvh justify-center bg-background text-on-background">
      <div className="flex w-full max-w-md flex-col gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <ConfigBackLink to="/painel/configuracoes" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-title-md font-semibold text-on-surface">
            Usuários
          </h1>
          <p className="text-caption text-on-surface-variant">
            Administradores, operadores e totens
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 shrink-0 px-3"
          onClick={abrirCriar}
        >
          <Plus size={14} strokeWidth={1.75} />
          Novo
        </Button>
      </div>

      {showSkeleton ? (
        <ul
          className="flex flex-col gap-3"
          aria-busy="true"
          aria-label="Carregando"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index}>
              <Skeleton className="h-24 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      ) : null}

      {!showSkeleton && erro ? (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-caption text-danger">
          {erro}
        </div>
      ) : null}

      {!showSkeleton && !erro && usuarios.length === 0 ? (
        <p className="text-caption text-on-surface-variant">
          Nenhum usuário. Use “Novo” para criar.
        </p>
      ) : null}

      {!showSkeleton && !erro && usuarios.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {usuarios.map((usuario) => {
            const isSelf = usuario.id === atual.id;
            return (
              <li
                key={usuario.id}
                className="rounded-xl border border-operator-border bg-operator-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-md font-medium text-on-surface">
                      {usuario.nome}
                      {isSelf ? (
                        <span className="text-caption text-on-surface-variant">
                          {' '}
                          (você)
                        </span>
                      ) : null}
                    </p>
                    <span className="mt-1 inline-flex rounded-full bg-primary-container/30 px-2 py-0.5 text-caption font-medium text-primary">
                      {ROLE_LABEL[usuario.role]}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 flex-1 px-3"
                    disabled={busyId === usuario.id}
                    onClick={() => abrirEditar(usuario)}
                  >
                    <Pencil size={13} strokeWidth={1.75} />
                    Editar
                  </Button>
                  {!isSelf ? (
                    <Button
                      type="button"
                      variant="dangerGhost"
                      className="h-9 flex-1 px-3"
                      disabled={busyId === usuario.id}
                      onClick={() => setExcluindo(usuario)}
                    >
                      <Trash2 size={13} strokeWidth={1.75} />
                      Excluir
                    </Button>
                  ) : null}
                </div>

                {!isSelf ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 h-9 w-full px-3"
                    disabled={busyId === usuario.id}
                    onClick={() => void handleForcarLogout(usuario)}
                  >
                    <LogOut size={13} strokeWidth={1.75} />
                    Forçar logout
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <UsuarioDrawer
        open={drawerAberto}
        usuario={editando}
        onClose={fecharDrawer}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(excluindo)}
        title="Excluir usuário?"
        description={
          excluindo
            ? `"${excluindo.nome}" perderá o acesso imediatamente.`
            : undefined
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        loading={busyId === excluindo?.id}
        onConfirm={() => void confirmarExclusao()}
        onCancel={() => setExcluindo(null)}
      />
      </div>
    </div>
  );
}
