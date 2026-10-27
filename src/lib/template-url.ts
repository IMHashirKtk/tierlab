/** A template's database ID is stable; its public URL uses the assigned slug. */
export function templatePath(template: { id: string; slug?: string }): string {
  return `/template/${encodeURIComponent(template.slug || template.id)}`;
}
