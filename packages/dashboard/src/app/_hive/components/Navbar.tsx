"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BeeLogo } from "./BeeLogo";

const LINKS = ["Protocol", "How it works", "BOT Chain", "Docs"];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="relative z-50 w-full h-[100px] flex items-center justify-between px-6 lg:px-[6%] border-b border-white/5 bg-[#0a051e]/80 backdrop-blur-md animate-reveal sticky top-0">
        <div className="flex items-center gap-1.5 h-[60px] md:h-[100px]">
          <BeeLogo className="w-8 h-8" />
          <span className="text-lg font-semibold tracking-tight text-white">Hive</span>
        </div>

        <div className="hidden md:flex uppercase text-sm font-medium text-white/60 gap-x-8 items-center">
          {LINKS.map((l) => (
            <a key={l} href="#" className="hover:text-white transition-colors">
              {l}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/app"
            className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white text-black py-2.5 px-5 rounded-sm hover:bg-purple-50 transition-colors"
          >
            Enter the Hive
          </a>
          <button
            onClick={() => setOpen(true)}
            className="md:hidden text-white/70 hover:text-white transition-colors outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-[#0a051e]/95 backdrop-blur-xl flex flex-col pt-32 px-8 transition-[transform,opacity] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-8 right-6 text-white/70 hover:text-white outline-none"
          aria-label="Close menu"
        >
          <X className="w-8 h-8" />
        </button>
        <nav className="flex flex-col gap-8 text-2xl font-medium tracking-tight">
          {LINKS.map((l) => (
            <a
              key={l}
              href="#"
              onClick={() => setOpen(false)}
              className="hover:text-purple-400 transition-colors border-b border-white/10 pb-4"
            >
              {l}
            </a>
          ))}
        </nav>
        <div className="mt-auto mb-12">
          <a
            href="/app"
            className="flex w-full items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider bg-white text-black py-4 rounded-sm hover:bg-purple-50 transition-colors"
          >
            Enter the Hive
          </a>
        </div>
      </div>
    </>
  );
}
