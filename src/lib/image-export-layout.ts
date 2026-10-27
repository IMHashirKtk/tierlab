export type ImageExportLayout = "compact" | "16:9" | "9:16" | "1:1";

/** Layout uses logical pixels; resolution only controls raster density. */
export function imageExportLayout(layout: ImageExportLayout) {
  const landscape = layout === "16:9";
  return {
    width: landscape ? 1920 : 1080,
    minHeight: layout === "compact" ? 0 : layout === "9:16" ? 1920 : 1080,
    padding: landscape ? 48 : 32,
    labelWidth: landscape ? 144 : 96,
    itemSize: landscape ? 240 : 192,
    gap: 12,
    rowPadding: 12,
  };
}
