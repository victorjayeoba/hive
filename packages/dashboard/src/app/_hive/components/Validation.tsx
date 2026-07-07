import Link from "next/link";
import { Icon } from "./Icon";
import { FlashlightCard } from "./ui/FlashlightCard";

function Stars({ count = 5, width = 20 }: { count?: number; width?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Icon key={i} icon="solar:star-bold-duotone" width={width} />
      ))}
    </>
  );
}

export function Validation() {
  return (
    <section className="overflow-hidden lg:py-32 text-white w-full z-20 pt-24 pb-24 relative">
      {/* Structural frame */}
      <div className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block">
        <div className="absolute top-0 bottom-0 w-[1px] bg-white/5 left-[6%]" />
        <div className="absolute top-0 bottom-0 w-[1px] bg-white/5 left-[28%]">
          <div
            className="absolute w-[1px] h-[200px] bg-gradient-to-b from-transparent via-purple-500/50 to-transparent beam-v"
            style={{ animation: "7s ease 0s infinite normal none running beam-v" }}
          />
        </div>
        <div className="absolute top-0 bottom-0 w-[1px] bg-white/5 left-[62%]">
          <div
            className="absolute w-[1px] h-[200px] bg-gradient-to-b from-transparent via-purple-500/50 to-transparent beam-v"
            style={{ animation: "5s ease 2s infinite normal none running beam-v" }}
          />
        </div>
        <div className="absolute top-0 bottom-0 w-[1px] bg-white/5 right-[6%]" />
        <div className="absolute left-0 right-0 h-[1px] bg-white/5 top-0" />
        <div className="absolute left-0 right-0 h-[1px] bg-white/5 bottom-0" />
      </div>

      <div className="lg:px-[6%] z-10 max-w-[1600px] mr-auto ml-auto pr-6 pl-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* Left column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Heading card */}
            <FlashlightCard className="hover:bg-white/[0.04] transition-all duration-500 border border-white/5 hover:border-white/10 rounded-sm backdrop-blur-lg p-10 lg:p-12 flex flex-col justify-center min-h-[240px]">
              <h2 className="leading-[0.95] lg:text-6xl text-4xl font-medium text-white tracking-tighter z-10 mb-2 relative">
Only possible <span className="text-white/30"> on BOT Chain.</span>
              </h2>
              <div className="absolute -top-6 -right-6 opacity-[0.03] text-white">
                <Icon icon="solar:chat-square-like-bold-duotone" width={240} />
              </div>
            </FlashlightCard>

            {/* 99.99% image stat */}
            <div className="group lg:h-[500px] overflow-hidden h-[420px] border-white/5 hover:border-white/10 border rounded-sm relative backdrop-blur-lg transition-all duration-500 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hive/data-network.webp"
                alt="Data Network Structure"
                className="transition-transform duration-1000 group-hover:scale-105 filter group-hover:saturate-100 w-full h-full object-cover absolute inset-0"
              />
              <div className="bg-gradient-to-t from-black/60 via-black/20 to-transparent absolute inset-0" />
              <div className="absolute bottom-10 right-10 text-right">
                <span className="block text-6xl lg:text-8xl font-semibold text-white tracking-tighter drop-shadow-lg">~0.75s</span>
                <span className="block text-white/80 font-mono text-sm uppercase tracking-widest mt-0">Per Block · Near-Zero Fees</span>
              </div>
              <div className="absolute top-8 left-8 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                Live On-Chain
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Featured testimonial */}
            <FlashlightCard className="hover:bg-white/[0.04] text-white p-10 rounded-sm transition-all duration-500 hover:-translate-y-1 h-full flex flex-col justify-between border border-white/5 hover:border-white/10 backdrop-blur-lg">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex gap-1 text-purple-400 mb-8">
                  <Stars width={20} />
                </div>
                <p className="text-xl font-light leading-relaxed mb-10 text-white/90">
                  &quot;A continuously-clearing auction between agents needs sub-second blocks to feel live and near-zero fees to be worth running. On a slow or expensive chain, this design is absurd. On BOT Chain, it&apos;s just how agents transact.&quot;
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-6 relative z-10">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/hive/elena.webp"
                    alt="Elena Rostova"
                    className="w-12 h-12 rounded-full border-2 border-white/10 grayscale group-hover:grayscale-0 transition-all object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-white text-base">Elena Rostova</h4>
                    <div className="flex items-center gap-2 text-xs text-white/40 mt-1">
                      <span className="uppercase tracking-wide">CTO</span>
                      <span className="w-1 h-1 bg-white/30 rounded-full" />
                      <Icon icon="simple-icons:openai" width={14} className="opacity-60" />
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/60 group-hover:bg-purple-500 group-hover:text-white transition-all cursor-pointer">
                  <Icon icon="solar:arrow-right-up-bold-duotone" width={20} />
                </div>
              </div>
            </FlashlightCard>

            {/* Small testimonial — Marcus Chen */}
            <SmallTestimonial
              quote="Escrow, auction clearing, and reputation all live in the contracts. It's native, deep use of the chain — not an RPC swap bolted onto an off-chain app."
              name="Marcus Chen"
              role="Agent Dev"
              brand="simple-icons:vercel"
              avatar="/hive/avatar-1.jpg"
            />

            {/* Small testimonial — Sarah Jenkins */}
            <SmallTestimonial
              quote="A $0.002 task can't carry a $2 gas fee. Near-zero fees are the whole reason machine-to-machine micropayments are finally economical here."
              name="Sarah Jenkins"
              role="Protocol Eng"
              brand="simple-icons:stripe"
              avatar="/hive/avatar-2.jpg"
            />
          </div>
        </div>

        {/* CTA banner */}
        <div className="hover:bg-white/[0.04] rounded-sm p-8 lg:px-12 lg:py-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group border border-white/5 hover:border-white/10 backdrop-blur-lg transition-all duration-500">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,33,128,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] bg-[position:0_0,0_0] transition-all duration-1000 group-hover:bg-[position:100%_100%,0_0]" />
          <div className="relative z-10 text-center md:text-left">
            <h3 className="text-3xl lg:text-4xl font-medium text-white tracking-tight mb-2">Watch the market settle in real time.</h3>
            <p className="text-white/50 text-base font-light">Real agents, real bids, real payouts — every action on-chain.</p>
          </div>
          <Link href="/app" className="relative z-10 bg-white text-black pl-8 pr-6 py-4 rounded-sm font-semibold text-xs uppercase tracking-widest hover:bg-purple-50 transition-all flex items-center gap-4 group/btn whitespace-nowrap">
            Enter the Hive
            <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center group-hover/btn:scale-110 transition-transform">
              <Icon icon="solar:arrow-right-bold-duotone" className="text-sm" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SmallTestimonial({
  quote,
  name,
  role,
  brand,
  avatar,
}: {
  quote: string;
  name: string;
  role: string;
  brand: string;
  avatar: string;
}) {
  return (
    <FlashlightCard className="hover:bg-white/[0.04] p-8 rounded-sm border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-1 text-white backdrop-blur-lg">
      <div className="flex gap-1 text-purple-400 mb-6 relative z-10">
        <Stars width={18} />
      </div>
      <p className="text-base font-normal leading-relaxed mb-8 text-slate-400 relative z-10">&quot;{quote}&quot;</p>
      <div className="flex items-center justify-between border-t border-white/10 pt-6 relative z-10">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar}
            alt={name}
            className="w-10 h-10 rounded-full border border-white/10 grayscale group-hover:grayscale-0 transition-all"
          />
          <div>
            <h4 className="font-medium text-white text-sm">{name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{role}</span>
              <span className="w-1 h-1 bg-slate-700 rounded-full" />
              <Icon icon={brand} width={14} />
            </div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-purple-600 group-hover:text-white transition-all cursor-pointer">
          <Icon icon="solar:arrow-right-up-bold-duotone" width={16} />
        </div>
      </div>
    </FlashlightCard>
  );
}
