export interface TemplateEditorial {
  topic: string;
  intro: string[];
  faqs: { question: string; answer: string }[];
  updated: string;
}

// Only individually reviewed entries belong here. Publishing a roster does not
// automatically qualify it for indexing. Task 3 supplies the reviewed content.
export const TEMPLATE_EDITORIAL: Record<string, TemplateEditorial> = {};
