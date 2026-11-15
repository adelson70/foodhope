import { blocoItemCupom, rotuloMeioPagamento } from './impressao-texto.js';

const limpar = (t: string) =>
  t
    .replace(/\[\[\/?[A-Z]+\]\]/g, '')
    .split('\n')
    .filter(Boolean)
    .map((l) => l.replace(/ {2,}(?=R\$)/, ' … '));

describe('blocoItemCupom', () => {
  it('adicional por lanche: total da linha no item e adicional sem preço', () => {
    const { texto, total } = blocoItemCupom({
      quantidade: 2,
      nome: 'Xis Salada',
      precoUnitario: 20,
      adicionais: [{ nome: 'Frango', qtd: 2, preco: 5 }],
      retirada_venda: [{ nome: 'Ervilha' }],
      observacao: 'bem passado',
    });
    expect(total).toBe(50);
    expect(limpar(texto)).toEqual([
      '2X XIS SALADA … R$ 50,00',
      '  + FRANGO',
      '  SEM ERVILHA',
      '  OBS: BEM PASSADO',
    ]);
  });

  it('mostra a quantidade por lanche quando passa de 1', () => {
    const { texto, total } = blocoItemCupom({
      quantidade: 2,
      nome: 'Xis',
      precoUnitario: 20,
      adicionais: [{ nome: 'Bacon', qtd: 4, preco: 3 }],
    });
    expect(total).toBe(52);
    expect(limpar(texto)[1]).toBe('  + 2X BACON');
  });

  it('pedido antigo com adicional que não divide: formato antigo com preço', () => {
    const { texto, total } = blocoItemCupom({
      quantidade: 2,
      nome: 'Xis Salada',
      precoUnitario: 20,
      adicionais: [{ nome: 'Frango', qtd: 1, preco: 5 }],
    });
    expect(total).toBe(45);
    expect(limpar(texto)).toEqual(['2X XIS SALADA … R$ 40,00', '  + FRANGO … R$ 5,00']);
  });
});

describe('rotuloMeioPagamento', () => {
  it('traduz o capture_method do InfinitePay e usa CAIXA sem checkout', () => {
    expect(rotuloMeioPagamento('pix')).toBe('PIX');
    expect(rotuloMeioPagamento('credit_card', 1)).toBe('CREDITO');
    expect(rotuloMeioPagamento('credit_card', 3)).toBe('CREDITO 3X');
    expect(rotuloMeioPagamento('debit_card')).toBe('DEBITO');
    expect(rotuloMeioPagamento(null)).toBe('CAIXA');
  });
});
