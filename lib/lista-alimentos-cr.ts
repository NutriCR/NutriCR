/**
 * Lista de alimentos comunes de Costa Rica usada en la importación masiva.
 * Sin imports — seguro importar en cliente y servidor.
 */
export const LISTA_CR = [
  'arroz blanco', 'frijoles negros', 'frijoles rojos', 'pollo cocido', 'carne molida',
  'huevo', 'leche entera', 'queso', 'natilla', 'pan blanco',
  'tortilla de maíz', 'plátano maduro', 'plátano verde', 'yuca', 'papa',
  'zanahoria', 'chayote', 'ayote', 'tomate', 'cebolla',
  'chile dulce', 'ajo', 'culantro', 'apio', 'limón',
  'naranja', 'banano', 'mango', 'piña', 'sandía',
  'atún en lata', 'sardina', 'jamón', 'mortadela', 'salchicha',
  'aceite vegetal', 'mantequilla', 'azúcar', 'sal', 'avena',
  'pasta', 'espagueti', 'lechuga', 'pepino', 'brócoli',
  'coliflor', 'elote', 'palmito', 'pejibaye', 'cas',
] as const;

export type NombreAlimentoCR = (typeof LISTA_CR)[number];
