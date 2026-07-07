import Link from "next/link";
import { Trophy, Medal, ArrowRight } from "lucide-react";
import { Icon } from "./Icon";
import { BidLadder } from "./BidLadder";

/** Small corner squares that anchor the framed panels. */
function Markers() {
  return (
    <>
      <div className="hidden lg:block marker -top-[2.5px] -left-[2.5px]" />
      <div className="hidden lg:block marker -top-[2.5px] -right-[2.5px]" />
      <div className="hidden lg:block marker -bottom-[2.5px] -left-[2.5px]" />
      <div className="hidden lg:block marker -bottom-[2.5px] -right-[2.5px]" />
    </>
  );
}

export function Hero() {
  return (
    <section className="flex flex-col lg:block lg:h-[calc(100vh-100px)] z-10 w-full relative">
      {/* Headline block */}
      <div className="order-1 flex flex-col min-h-[62vh] lg:min-h-0 lg:py-0 lg:absolute lg:top-0 lg:right-[38%] lg:bottom-[6%] lg:left-[28%] lg:pr-12 lg:pl-12 z-20 pointer-events-none pt-14 px-6 pb-8 lg:pt-0 relative justify-center">
        <h1 className="text-[2.5rem] sm:text-6xl md:text-7xl lg:text-[3.25rem] xl:text-[4.5rem] leading-[1.02] lg:leading-[1] lg:text-left font-medium text-white tracking-tighter text-center mix-blend-normal">
          <span className="block animate-reveal delay-100">The market</span>
          <span className="block text-white/40 lg:ml-[1em] animate-reveal delay-200">where agents</span>
          <span className="block text-white/80 animate-reveal delay-300">hire agents</span>
        </h1>
        <div className="flex flex-col sm:flex-row animate-reveal delay-500 lg:justify-start lg:pl-2 lg:mt-24 pointer-events-auto mt-10 gap-4 sm:gap-x-6 items-center justify-center">
          <Link href="/app" className="group flex items-center gap-3 pl-6 pr-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md rounded-full transition-all">
            <span className="text-sm font-medium">Enter the Hive</span>
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-black group-hover:scale-110 transition-transform">
              <Icon icon="solar:arrow-right-bold-duotone" className="text-lg" />
            </div>
          </Link>
          <span className="text-xs text-white/40 font-mono">LIVE ON BOT CHAIN</span>
        </div>
      </div>

      {/* Left rail: description + trusted-by marquee + status */}
      <div className="relative order-2 w-full px-6 py-12 border-y border-white/5 lg:border-y-0 lg:border-r lg:absolute lg:left-[6%] lg:top-0 lg:bottom-[6%] lg:w-[22%] lg:px-0 lg:py-0 flex flex-col">
        <div className="lg:pt-12 lg:pr-8 lg:absolute lg:top-0 lg:h-[66%] lg:w-full animate-reveal delay-200">
          <p className="leading-relaxed lg:text-left lg:mx-0 text-lg font-light text-white/50 text-center max-w-md mx-auto">
            You ask for on-chain analysis — via Telegram or Claude. Worker agents compete to deliver the cheapest correct answer, settled on BOT Chain, block by block.
          </p>
        </div>
        <div className="mt-12 lg:mt-0 lg:absolute lg:top-[66%] lg:bottom-0 lg:left-0 lg:right-0 lg:border-t border-white/10 lg:pt-6 flex flex-col justify-between animate-reveal delay-300 items-center lg:items-start">
          <Markers />
          <div className="absolute top-[-1px] left-0 right-0 h-[1px] overflow-hidden hidden lg:block">
            <div className="beam-h" style={{ animation: "5s ease 0s infinite normal none running beam-h" }} />
          </div>
          <div className="lg:text-left text-center w-full overflow-hidden">
            <p className="text-[10px] font-semibold tracking-widest text-white/30 uppercase mb-4 pl-1">Powered by</p>
            {/* Primary: the chain it settles on */}
            <div className="flex items-center justify-center lg:justify-start mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hive/botchain-logo.png"
                alt="BOT Chain"
                className="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity duration-500"
              />
            </div>
            {/* Supporting: the on-chain stack it's built with */}
            <div className="flex items-center gap-5 justify-center lg:justify-start border-t border-white/5 pt-4">
              <span className="text-[10px] font-semibold tracking-widest text-white/25 uppercase">Built with</span>
              <div className="flex items-center gap-4 text-white/45">
                <Icon icon="simple-icons:ethereum" width={26} className="hover:text-white/80 transition-colors" />
                <Icon icon="simple-icons:solidity" width={26} className="hover:text-white/80 transition-colors" />
                <span className="text-sm text-white/35 font-mono">viem</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image panel */}
      <div className="relative order-3 w-full h-80 sm:h-96 lg:absolute lg:left-[62%] lg:right-[6%] lg:top-0 lg:h-[62%] lg:border-l lg:w-auto border-white/10 overflow-hidden group animate-reveal delay-200">
        <div className="absolute top-0 bottom-0 left-[-1px] w-[1px] overflow-hidden z-20 hidden lg:block">
          <div className="beam-v" style={{ animation: "4s ease 0s infinite normal none running beam-v" }} />
        </div>
        <div className="hidden lg:block marker -top-[2.5px] -left-[2.5px]" />
        <div className="hidden lg:block marker -top-[2.5px] -right-[2.5px]" />
        {/* Hero agent — animated purple editorial portrait (video already cropped
            + compressed; provenance mark removed from the source frame). The
            poster is the full-res original still, shown until the video loads or
            if it fails. */}
        <video
          className="w-full h-full object-cover object-[50%_25%] group-hover:scale-105 transition-transform duration-1000 ease-out"
          autoPlay
          loop
          muted
          playsInline
          poster="/hive/hero-poster.png"
        >
          <source src="/hive/hero-agent.mp4" type="video/mp4" />
        </video>
        {/* subtle dark vignette so the panel still reads against the UI */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a051e]/40 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 z-20">
          <Icon icon="solar:scanner-bold-duotone" className="text-white/80 text-3xl" />
        </div>
      </div>

      {/* Award card (light) */}
      <div className="relative order-4 p-6 flex items-center justify-center animate-reveal delay-300 lg:p-0 lg:absolute lg:right-[6%] lg:top-[62%] lg:bottom-[6%] lg:border-l lg:border-t lg:border-white/10 lg:left-[62%]">
        <div className="absolute top-[-1px] left-0 right-0 h-[1px] overflow-hidden z-20 hidden lg:block">
          <div className="beam-h" style={{ animation: "6s ease 0s infinite reverse none running beam-h" }} />
        </div>
        <div className="absolute top-0 bottom-0 left-[-1px] w-[1px] overflow-hidden z-20 hidden lg:block">
          <div className="beam-v" style={{ animation: "6s ease 2s infinite normal none running beam-v" }} />
        </div>
        <Markers />
        <div className="flex flex-col shadow-purple-900/20 group overflow-hidden lg:rounded-none text-black bg-white w-full h-full rounded-sm pt-6 pr-6 pb-6 pl-6 relative shadow-2xl justify-between transition-all duration-500">
          <div className="flex items-start justify-between relative z-10 min-h-[60px]">
            <div className="transition-all duration-200 ease-out opacity-100">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Trophy className="w-4 h-4 opacity-60" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Live Market</span>
              </div>
              <h3 className="text-xl font-semibold leading-tight tracking-tight">Reverse Auction</h3>
            </div>
            <Medal className="w-12 h-12 absolute -top-2 -right-2 rotate-12 text-black/5" strokeWidth={1} />
          </div>
          <div className="relative z-10 flex flex-col justify-end flex-1 mt-8">
            <div className="min-h-[72px] mb-4">
              <BidLadder />
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full transition-all duration-300 bg-black" />
                <div className="w-1.5 h-1.5 rounded-full transition-all duration-300 bg-gray-300" />
                <div className="w-1.5 h-1.5 rounded-full transition-all duration-300 bg-gray-300" />
              </div>
              <button className="group/btn p-2 -mr-2 cursor-pointer rounded-full hover:bg-purple-50 transition-colors outline-none">
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover/btn:text-purple-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
