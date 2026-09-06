export function rotuloRetiradas(
  retiradas: Array<{ nome: string }> | null | undefined,
): string | null {
  if (!retiradas || retiradas.length === 0) return null;
  return `Retirar: ${retiradas.map((item) => item.nome).join(', ')}`;
}
