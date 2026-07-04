/**
 * Hive mark — the bee logo (top-down view). Renders the raster mark from
 * /public/logo.png. Kept as a component so the nav, footer, and anywhere else
 * share one source; size it with a className (e.g. "w-6 h-6").
 */
export function BeeLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-bee.png" alt="Hive" className={`object-contain ${className ?? ""}`} />
  );
}
