// Mapa de emoji por nome de ingrediente / combo
// Usado pra dar vibe visual no card sem precisar de imagens.

const INGREDIENT_EMOJI: Record<string, string> = {
  // Frutas
  Banana: '🍌',
  Abacaxi: '🍍',
  Morango: '🍓',
  Kiwi: '🥝',
  Uva: '🍇',
  Manga: '🥭',

  // Complementos
  Amendoim: '🥜',
  'Canudo wafer': '🥢',
  Confete: '🎉',
  Granola: '🌾',
  Ovomaltine: '🥛',
  'Leite em pó': '🥛',
  Chocopoll: '🍭',
  Paçoca: '🍬',
  Sucrilhos: '🥣',
  Bis: '🍫',

  // Caldas
  Caramelo: '🍯',
  'Leite Condensado': '🥛',
  Mel: '🍯',
  Chocolate: '🍫',

  // Premium
  Nutella: '🍫',
  'Creme de Ovomaltine': '🍫',
};

export function ingredientEmoji(name: string, fallback = '🍨'): string {
  return INGREDIENT_EMOJI[name] ?? fallback;
}

const COMBO_EMOJI: Record<string, string> = {
  'Casa Especial': '🌟',
  'Pré-Treino': '💪',
  Chocolovers: '🍫',
  Frutado: '🍓',
  Tradicional: '🍇',
};

export function comboEmoji(name: string): string {
  return COMBO_EMOJI[name] ?? '🍨';
}
