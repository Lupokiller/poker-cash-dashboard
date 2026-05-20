/** Formata dígitos brasileiros para exibição (XX) XXXXX-XXXX — valor interno segue só com dígitos. */
export function formatBrazilPhoneInput(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) {
    return '';
  }
  if (d.length <= 2) {
    return `(${d}`;
  }
  if (d.length <= 7) {
    return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
