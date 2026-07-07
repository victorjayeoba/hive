// Skeleton loader shown while the first snapshot is loading — mirrors the real
// dashboard layout (counters, agents row, task feed) so the page doesn't jump
// when data arrives. Pure presentational; no data.

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-[var(--panel)]/60 ${className}`} />;
}

export function DashboardSkeleton({ isError }: { isError?: boolean }) {
  return (
    <div className="space-y-8">
      {/* intro line + post button */}
      <Shimmer className="h-3 w-3/4 max-w-md" />
      <div className="flex items-center justify-between gap-2">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-9 w-24" />
      </div>

      {/* counters grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-md border border-[var(--line)] bg-[var(--panel)]/30 p-3 sm:p-4">
            <Shimmer className="mb-2 h-6 w-14" />
            <Shimmer className="h-2.5 w-12" />
          </div>
        ))}
      </div>

      {/* agents row + task feed */}
      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section className="order-last lg:order-none">
          <Shimmer className="mb-3 h-2.5 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-md border border-[var(--line)] bg-[var(--panel)]/30 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Shimmer className="h-3 w-20" />
                  <Shimmer className="h-4 w-16" />
                </div>
                <Shimmer className="mb-3 h-3 w-2/3" />
                <div className="space-y-1.5 rounded-sm border border-[var(--line)] bg-black/20 p-2">
                  <Shimmer className="h-2.5 w-full" />
                  <Shimmer className="h-2.5 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="order-first lg:order-none">
          <Shimmer className="mb-3 h-2.5 w-20" />
          <div className="flex gap-3 overflow-hidden pb-2 lg:block lg:space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[220px] shrink-0 rounded-md border border-[var(--line)] bg-[var(--panel)]/30 p-3 lg:w-auto"
              >
                <div className="flex items-center gap-2.5">
                  <Shimmer className="h-6 w-6 rounded-full" />
                  <Shimmer className="h-3 w-24" />
                </div>
                <Shimmer className="mt-3 h-2.5 w-full" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <p className="text-center font-mono text-[11px] text-[var(--text-faint)]">
        {isError
          ? "indexer unreachable — retrying…"
          : "connecting to the live market…"}
      </p>
    </div>
  );
}
