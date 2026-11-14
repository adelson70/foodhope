export function rotuloRetiradas(
  retiradas: Array<{ nome: string }> | null | undefined,
  qtdLanches = 1,
): string | null {
  if (!retiradas || retiradas.length === 0) return null;
  const rotulo = qtdLanches > 1 ? 'Retirar de cada' : 'Retirar';
  return `${rotulo}: ${retiradas.map((item) => item.nome).join(', ')}`;
}
