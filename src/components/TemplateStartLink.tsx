import Link from "next/link";
import type { ReactNode } from "react";
import { templateEditorPath } from "@/lib/editor-start";

export function TemplateStartLink({ templateId, children, className }: { templateId: string; children: ReactNode; className?: string }) {
  return <Link href={templateEditorPath({ id: templateId })} prefetch={false} className={className}>{children}</Link>;
}
