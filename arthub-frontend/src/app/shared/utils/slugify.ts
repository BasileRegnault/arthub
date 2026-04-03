/**
 * Génère un slug à partir d'une chaîne.
 * Ex: "The Old Guitarist" → "the-old-guitarist"
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les diacritiques
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/**
 * Construit le segment d'URL "{id}-{slug}"
 */
export function toSlugId(id: number | string, title: string): string {
  return `${id}-${slugify(title)}`;
}

/**
 * Extrait l'id numérique depuis un segment "{id}-{slug}" ou un simple "{id}"
 */
export function extractId(slugId: string): string {
  return slugId.split('-')[0];
}
