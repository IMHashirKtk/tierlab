import { ItemImage } from "@/components/ItemImage";
import type { Template } from "@/types";
import { getItemImageUrl } from "@/lib/image-url";

/** Show the roster without implying that an unranked template has S/A placements. */
export function TemplateCover({ template, compact = false }: { template: Template; compact?: boolean }) {
  const limit = compact ? 4 : 8;
  const items = template.items.slice(0, limit);
  return (
    <div className="border-b border-zinc-800/70 bg-zinc-950/60 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300">{template.category}</span>
        <span className="text-[11px] text-zinc-400">{template.itemCount} items</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5" aria-label="Template roster preview">
        {items.map((item, index) => (
          <div key={item.id} title={item.name} className="relative aspect-square min-w-0 overflow-hidden rounded-lg border border-zinc-700/60 bg-zinc-800">
            {compact ? (item.imageUrl ?
              // eslint-disable-next-line @next/next/no-img-element -- small server-rendered public roster preview, no per-item hydration
              <img src={getItemImageUrl(item.imageUrl)} alt={item.name} width={120} height={120} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              : <span className="h-full flex items-center justify-center p-1 text-[10px] text-zinc-300 text-center break-words">{item.name}</span>)
              : <ItemImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />}
            {index === limit - 1 && template.itemCount > limit && <span className="absolute bottom-0 right-0 rounded-tl-lg bg-zinc-950/90 px-2 py-1 text-xs font-bold text-white">+{template.itemCount - limit}</span>}
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="py-6 text-center text-xs text-zinc-400">Build your own roster</p>}
    </div>
  );
}
