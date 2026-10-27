import { CatalogPage } from "@/components/CatalogPage";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = pageMetadata("Tier List Templates by Category", "Browse image and text tier list templates by category. Find a roster, choose your ranking criteria, and open the editor.", "/templates");
export default function TemplatesPage() { return <CatalogPage />; }
