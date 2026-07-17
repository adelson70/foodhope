export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  triggerLabel?: string;
};

export function filterSelectOptions(
  options: SelectOption[],
  query: string,
): SelectOption[] {
  const termo = query.trim().toLocaleLowerCase('pt-BR');
  if (!termo) return options;

  return options.filter((option) => {
    const haystack =
      `${option.label} ${option.description ?? ''} ${option.triggerLabel ?? ''}`.toLocaleLowerCase(
        'pt-BR',
      );
    return haystack.includes(termo);
  });
}
