"use client";

import React, { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Item } from "@/types";

/* Stops a pointer/key event on a child button from starting a drag on the parent card. */
const stopDrag = {
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
  onTouchStart: (e: React.SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation(),
};

interface ItemCardProps {
  item: Item;
  onRemove?: () => void;
  removeLabel?: string;
  /** Rendered inside the DragOverlay (follows the pointer). */
  isOverlay?: boolean;
  isSelected?: boolean;
  onSelect?: (item: Item) => void;
}

export const ItemCard = React.memo(function ItemCard({
  item,
  onRemove,
  removeLabel = "Remove",
  isOverlay = false,
  isSelected = false,
  onSelect,
}: ItemCardProps) {
  return (
    <div
      onClick={() => onSelect?.(item)}
      className={`group relative rounded-lg border select-none overflow-hidden transition-all ${
        item.imageUrl
          ? "w-16 h-16 sm:w-20 sm:h-20 bg-zinc-950 flex items-center justify-center"
          : "px-3 py-2 bg-zinc-800 text-zinc-100 text-xs font-semibold flex items-center gap-2 max-w-[200px]"
      } ${
        isOverlay
          ? "border-indigo-400 shadow-2xl shadow-indigo-500/40 scale-105 cursor-grabbing z-50 ring-2 ring-indigo-500/40"
          : isSelected
          ? "border-indigo-400 ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/30 scale-[1.02] cursor-pointer"
          : "border-zinc-700/80 shadow-sm hover:border-zinc-500 cursor-grab"
      }`}
      title={item.name}
    >
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URLs / user content, not optimisable by next/image
        <img
          src={item.imageUrl}
          alt={item.name}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : (
        <span className="truncate">{item.name}</span>
      )}

      {onRemove && !isOverlay && (
        <button
          type="button"
          {...stopDrag}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`${removeLabel}: ${item.name}`}
          title={removeLabel}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity cursor-pointer shadow"
        >
          ×
        </button>
      )}
    </div>
  );
});

interface SortableItemProps {
  item: Item;
  onRemove: () => void;
  removeLabel: string;
  isSelected?: boolean;
  onSelect?: (item: Item) => void;
}

export const SortableItem = React.memo(function SortableItem({
  item,
  onRemove,
  removeLabel,
  isSelected,
  onSelect,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={`touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-lg ${
        isDragging ? "opacity-25 scale-95" : ""
      }`}
      {...attributes}
      {...listeners}
      aria-label={item.name}
    >
      <ItemCard
        item={item}
        onRemove={onRemove}
        removeLabel={removeLabel}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    </div>
  );
});

interface DropZoneProps {
  id: string;
  items: Item[];
  /** True while a dragged item is hovering over this container. */
  highlighted: boolean;
  className?: string;
  emptyHint: React.ReactNode;
  onRemoveItem: (item: Item) => void;
  removeLabel: string;
  selectedItemId?: string | null;
  onSelectItem?: (item: Item) => void;
}

/** A droppable, sortable container (tier row or unranked tray). Works even when empty. */
export const DropZone = React.memo(function DropZone({
  id,
  items,
  highlighted,
  className = "",
  emptyHint,
  onRemoveItem,
  removeLabel,
  selectedItemId,
  onSelectItem,
}: DropZoneProps) {
  const { setNodeRef } = useDroppable({ id });
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  return (
    <SortableContext id={id} items={itemIds} strategy={rectSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`flex flex-wrap content-start gap-2.5 transition-colors ${
          highlighted ? "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/40" : ""
        } ${className}`}
      >
        {items.length === 0
          ? emptyHint
          : items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                onRemove={() => onRemoveItem(item)}
                removeLabel={removeLabel}
                isSelected={selectedItemId === item.id}
                onSelect={onSelectItem}
              />
            ))}
      </div>
    </SortableContext>
  );
});
