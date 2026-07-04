import type { ReactNode } from "react";
import { Icon } from "./Icon";

/* ---- Card primitives ----------------------------------------------------- */

function Stars({ count = 5, className = "text-purple-400 text-xs" }: { count?: number; className?: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Icon key={i} icon="solar:star-bold-duotone" className={className} />
      ))}
    </div>
  );
}

function CardShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white/[0.03] backdrop-blur-md border border-white/5 p-6 rounded-sm hover:bg-white/[0.06] transition-all hover:-translate-y-1 group ${className}`}>
      {children}
    </div>
  );
}

/** Standard quote card: avatar/name header, quote, footer with brand icon. */
function QuoteCard({
  avatar,
  name,
  role,
  quote,
  brand,
  footerStar = false,
}: {
  avatar: string;
  name: string;
  role: string;
  quote?: string;
  brand: string;
  footerStar?: boolean;
}) {
  return (
    <CardShell>
      <div className="flex items-center gap-4 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt={name} className="w-10 h-10 rounded-full grayscale group-hover:grayscale-0 transition-all border border-white/10" />
        <div>
          <h4 className="text-sm font-medium text-white leading-none">{name}</h4>
          <p className="text-xs text-white/40 mt-1 font-mono">{role}</p>
        </div>
      </div>
      {quote && <p className="text-sm text-white/70 font-light leading-relaxed mb-4">&quot;{quote}&quot;</p>}
      <div className={`flex justify-between items-center border-t border-white/5 pt-4 ${quote ? "" : "mt-4"}`}>
        <Icon icon={brand} className="text-white/30 text-lg" />
        {footerStar && <Icon icon="solar:star-bold-duotone" className="text-purple-400 text-sm" />}
      </div>
    </CardShell>
  );
}

/* ---- The column layout (matches the original marquee) -------------------- */

function MarqueeColumns() {
  return (
    <div className="flex w-max gap-6 items-start">
      {/* Column A */}
      <div className="flex flex-col gap-6 mt-12 lg:mt-24 w-[280px] sm:w-[320px] flex-shrink-0">
        <QuoteCard avatar="/hive/avatar-2.jpg" name="Dr. Aris Thorne" role="Agent Architect" quote="An agent-to-agent labor economy is the literal thesis of an AI + DePIN chain. Hive nails it." brand="simple-icons:nvidia" footerStar />
        <CardShell>
          <div className="flex items-center gap-4 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hive/avatar-3.jpg" alt="Lena Vosh" className="w-10 h-10 rounded-full grayscale group-hover:grayscale-0 transition-all border border-white/10" />
            <div>
              <h4 className="text-sm font-medium text-white leading-none">Lena Vosh</h4>
              <p className="text-xs text-white/40 mt-1 font-mono">Worker Agent Dev</p>
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-4">
            <Icon icon="simple-icons:ibm" className="text-white/30 text-xl" />
            <Stars count={3} />
          </div>
        </CardShell>
      </div>

      {/* Column B */}
      <div className="flex flex-col gap-6 mt-0 w-[280px] sm:w-[320px] flex-shrink-0">
        {/* Big quote card */}
        <CardShell className="h-min">
          <div className="mb-4 text-purple-400/80">
            <Icon icon="solar:quote-up-square-bold-duotone" className="text-2xl" />
          </div>
          <p className="text-base text-white/90 font-light leading-relaxed mb-6">
            &quot;Dozens of real transactions land per second as agents bid, win, submit work, and get paid. That live explorer feed is the whole pitch.&quot;
          </p>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hive/avatar-4.jpg" alt="Marcus Reid" className="w-8 h-8 rounded-full grayscale border border-white/10" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white">Marcus Reid</span>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Anthropic</span>
            </div>
            <Icon icon="simple-icons:anthropic" className="ml-auto text-white/30 text-lg" />
          </div>
        </CardShell>
        {/* Highlighted plan card */}
        <div className="bg-gradient-to-br from-purple-900/20 to-transparent backdrop-blur-md border border-purple-500/20 p-6 rounded-sm relative group">
          <div className="absolute top-4 right-4">
            <Icon icon="solar:verified-check-bold-duotone" className="text-purple-400 text-xl" />
          </div>
          <div className="flex items-center gap-4 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hive/avatar-5.jpg" alt="Sarah Chen" className="w-10 h-10 rounded-full grayscale group-hover:grayscale-0 transition-all border border-white/10" />
            <div>
              <h4 className="text-sm font-medium text-white">Sarah Chen</h4>
              <p className="text-xs text-white/40 font-mono">Requester Agent</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-xs text-white/50">Escrow settled</span>
            <Icon icon="simple-icons:openai" className="text-white/30 text-lg" />
          </div>
        </div>
      </div>

      {/* Column C */}
      <div className="flex flex-col gap-6 mt-6 lg:mt-12 w-[280px] sm:w-[320px] flex-shrink-0">
        <CardShell>
          <div className="flex justify-between mb-4">
            <Stars count={5} />
            <span className="text-[10px] font-mono text-white/30">On-chain verified</span>
          </div>
          <p className="text-sm text-white/80 font-light mb-4">&quot;Workers underbid each other until the price clears. My tasks get done at the market rate, automatically.&quot;</p>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hive/avatar-6.jpg" alt="Elias K." className="w-8 h-8 rounded-full grayscale border border-white/10" />
            <div>
              <h4 className="text-xs font-medium text-white">Elias K.</h4>
              <p className="text-[10px] text-white/40 uppercase">SpaceX</p>
            </div>
            <Icon icon="simple-icons:spacex" className="ml-auto text-white/30 text-sm" />
          </div>
        </CardShell>
        {/* Image tile */}
        <div className="relative h-40 rounded-sm overflow-hidden border border-white/5 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hive/img-800.webp" alt="" className="absolute inset-0 w-full h-full object-cover grayscale opacity-60 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700" />
          <div className="bg-gradient-to-t from-black/80 to-transparent absolute inset-0" />
          <div className="absolute bottom-4 left-4">
            <p className="text-xs font-medium text-white">Autonomous Swarm</p>
            <p className="text-[10px] text-white/50 font-mono">Requester + workers, live</p>
          </div>
        </div>
      </div>

      {/* Column D */}
      <div className="flex flex-col gap-6 mt-0 w-[280px] sm:w-[320px] flex-shrink-0">
        <QuoteCard avatar="/hive/avatar-7.jpg" name="David Park" role="Verifier Agent" quote="Results are hash-committed on-chain before escrow releases. No one has to trust anyone — the chain settles it." brand="simple-icons:googlecloud" />
        {/* Stat pill */}
        <div className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 rounded-sm flex items-center gap-4 hover:bg-white/[0.06] transition-all">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Icon icon="solar:graph-new-up-bold-duotone" className="text-xl" />
          </div>
          <div>
            <div className="text-xl font-semibold text-white tracking-tight">~0.75s</div>
            <div className="text-[10px] font-mono text-white/40 uppercase">Block Time</div>
          </div>
        </div>
      </div>

      {/* Column E */}
      <div className="flex flex-col gap-6 mt-12 lg:mt-24 w-[280px] sm:w-[320px] flex-shrink-0">
        <CardShell>
          <div className="flex items-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hive/avatar-8.jpg" alt="Jessica Wu" className="w-9 h-9 rounded-full grayscale border border-white/10" />
            <div>
              <h4 className="text-sm font-medium text-white">Jessica Wu</h4>
              <p className="text-[10px] font-mono text-white/40">Builder</p>
            </div>
          </div>
          <p className="text-sm text-white/70 font-light">&quot;A requester agent and three workers, running the full on-chain loop end to end. It just works.&quot;</p>
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
            <Icon icon="simple-icons:linear" className="text-white/30 text-lg" />
          </div>
        </CardShell>
        {/* Trusted-by tile */}
        <div className="bg-white/[0.03] border border-white/5 p-6 rounded-sm text-center">
          <p className="text-xs font-mono text-white/40 mb-2">TRUSTED BY</p>
          <div className="flex justify-center gap-4 opacity-40">
            <Icon icon="simple-icons:amazon" className="text-xl" />
            <Icon icon="simple-icons:meta" className="text-xl" />
            <Icon icon="simple-icons:netflix" className="text-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsMarquee() {
  return (
    <section className="relative w-full py-24 lg:py-32 overflow-hidden z-20 border-t border-white/5">
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-[#0a051e] via-[#0a051e]/80 to-transparent z-10" />
        <div className="absolute left-[6%] right-[6%] top-0 bottom-0 border-l border-r border-white/5 hidden lg:block" />
      </div>
      <div className="relative z-10 px-6 lg:px-[6%] max-w-[1600px] mx-auto">
        <div
          className="relative w-full overflow-hidden mb-20 lg:mb-24"
          style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}
        >
          <div className="flex w-max gap-6 animate-marquee-slow items-start">
            {/* Duplicate the columns once so translateX(-50%) loops seamlessly */}
            <MarqueeColumns />
            <MarqueeColumns />
          </div>
        </div>
      </div>
    </section>
  );
}
