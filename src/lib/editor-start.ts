import type { Template } from "@/types";

/** Public slugs identify detail pages; stable IDs identify editor inputs. */
export function templateEditorPath(template: Pick<Template, "id">) {
  return `/create?template=${encodeURIComponent(template.id)}`;
}
export type EditorStart = { kind: "blank" } | { kind: "project"; id: string } | { kind: "template"; id: string };
export function editorStart(params: Pick<URLSearchParams, "get">): EditorStart {
  const project = params.get("id");
  if (project) return { kind: "project", id: project };
  const template = params.get("template");
  return template === null ? { kind: "blank" } : { kind: "template", id: template.trim() };
}
export type TemplateStartResult = { status: "ready"; template: Template } | { status: "error"; reason: "not_found_or_unavailable" | "unavailable" };
export async function resolveTemplateStart(id: string, lookup: (id: string) => Promise<Template | null>): Promise<TemplateStartResult> {
  if (!id) return { status: "error", reason: "not_found_or_unavailable" };
  try {
    const template = await lookup(id);
    return template ? { status: "ready", template } : { status: "error", reason: "not_found_or_unavailable" };
  } catch { return { status: "error", reason: "unavailable" }; }
}
