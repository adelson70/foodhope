import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';

import {
  Button,
  Input,
  Label,
  PhoneInput,
} from '../../components/ui';
import {
  appendPedidoLocal,
  loadClienteLocal,
  saveClienteLocal,
} from '../../lib/clienteStorage';
import { formatarMoeda } from '../../lib/currency';
import { onlyDigits } from '../../lib/phone';
import {
  checkoutClienteSchema,
  type CheckoutClienteValues,
} from '../../schemas/checkout-cliente.schema';
import { pedidoService } from '../../services';
import { getVisitorId } from '../../services/visitor';
import {
  totalCarrinho,
  useCarrinhoStore,
} from '../../stores/carrinho.store';
import { CarrinhoLista } from './CarrinhoLista';

export function Carrinho() {
  const navigate = useNavigate();
  const itens = useCarrinhoStore((state) => state.itens);
  const clear = useCarrinhoStore((state) => state.clear);
  const total = totalCarrinho(itens);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutClienteValues>({
    resolver: zodResolver(checkoutClienteSchema),
    defaultValues: {
      primeiro_nome: '',
      sobrenome: '',
      contato: '',
      cidade: '',
    },
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const visitorId = await getVisitorId();
      if (cancelled) return;
      const perfil = await loadClienteLocal(visitorId);
      if (!perfil || cancelled) return;
      reset({
        primeiro_nome: perfil.primeiro_nome,
        sobrenome: perfil.sobrenome,
        contato: perfil.contato,
        cidade: perfil.cidade,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [reset]);

  async function onSubmit(values: CheckoutClienteValues) {
    if (itens.length === 0) return;

    const cliente = {
      primeiro_nome: values.primeiro_nome,
      sobrenome: values.sobrenome,
      contato: onlyDigits(values.contato),
      cidade: values.cidade,
    };

    const response = await pedidoService.criar(
      {
        cliente,
        itens: itens.map((item) => ({
          id: item.produtoId,
          qtd: item.qtd,
          adicional:
            item.adicionais.length > 0
              ? item.adicionais.map((adic) => ({
                  id: adic.id,
                  qtd: adic.qtd,
                }))
              : undefined,
          observacao: item.observacao,
        })),
      },
      { silentSuccess: true },
    );

    if (!response.sucesso || !response.dados?.pedido) return;

    const pedido = response.dados.pedido;
    await saveClienteLocal(cliente);
    await appendPedidoLocal({
      id: pedido.id,
      numero: String(pedido.numero),
      nome_completo: pedido.nome_completo,
      createdAt: pedido.createdAt ?? new Date().toISOString(),
      itens: itens.map((item) => ({
        nome: item.nome,
        qtd: item.qtd,
        preco: item.preco,
        adicionais: item.adicionais.map((adic) => ({
          nome: adic.nome,
          preco: adic.preco,
          qtd: adic.qtd,
        })),
        observacao: item.observacao,
      })),
    });

    clear();
    navigate('/confirmado', {
      replace: true,
      state: { numero: String(pedido.numero) },
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h2 className="text-title-md text-on-surface">Carrinho</h2>
        <p className="text-caption text-on-surface-variant">
          Revise os itens e finalize o pedido
        </p>
      </div>

      <CarrinhoLista itens={itens} />

      {itens.length > 0 ? (
        <>
          <div className="flex items-center justify-between rounded-xl border border-operator-border bg-operator-card px-4 py-3">
            <span className="text-subtitle-md text-on-surface">Total</span>
            <span className="text-title-md text-primary">
              {formatarMoeda(total)}
            </span>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <h3 className="text-subtitle-md text-on-surface">Seus dados</h3>
            <div className="space-y-2">
              <Label htmlFor="carrinho-nome">Nome</Label>
              <Input
                id="carrinho-nome"
                placeholder="Primeiro nome"
                autoComplete="given-name"
                error={Boolean(errors.primeiro_nome)}
                {...register('primeiro_nome')}
              />
              {errors.primeiro_nome ? (
                <p className="px-1 text-caption text-danger">
                  {errors.primeiro_nome.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrinho-sobrenome">Sobrenome</Label>
              <Input
                id="carrinho-sobrenome"
                placeholder="Sobrenome"
                autoComplete="family-name"
                error={Boolean(errors.sobrenome)}
                {...register('sobrenome')}
              />
              {errors.sobrenome ? (
                <p className="px-1 text-caption text-danger">
                  {errors.sobrenome.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrinho-contato">Contato</Label>
              <Controller
                name="contato"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    id="carrinho-contato"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={Boolean(errors.contato)}
                  />
                )}
              />
              {errors.contato ? (
                <p className="px-1 text-caption text-danger">
                  {errors.contato.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrinho-cidade">Cidade</Label>
              <Input
                id="carrinho-cidade"
                placeholder="Cidade"
                autoComplete="address-level2"
                error={Boolean(errors.cidade)}
                {...register('cidade')}
              />
              {errors.cidade ? (
                <p className="px-1 text-caption text-danger">
                  {errors.cidade.message}
                </p>
              ) : null}
            </div>

            <p className="text-center text-caption text-on-surface-variant">
              Ao finalizar o pedido, você concorda com os{' '}
              <Link
                to="/termos"
                className="text-primary underline-offset-2 hover:underline"
              >
                Termos de Uso
              </Link>{' '}
              e a{' '}
              <Link
                to="/privacidade"
                className="text-primary underline-offset-2 hover:underline"
              >
                Política de Privacidade
              </Link>
              .
            </p>

            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Fazer pedido'}
            </Button>
          </form>
        </>
      ) : null}
    </div>
  );
}
