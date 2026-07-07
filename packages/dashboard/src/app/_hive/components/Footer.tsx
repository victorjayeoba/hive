import { Icon } from "./Icon";
import { BeeLogo } from "./BeeLogo";

const REPO = "https://github.com/victorjayeoba/hive";
const EXPLORER = "https://scan.bohr.life";

type FLink = { label: string; href: string; external?: boolean; status?: boolean };

const COLUMNS: { title: string; links: FLink[] }[] = [
  {
    title: "Protocol",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Live dashboard", href: "/app", status: true },
      { label: "Explorer", href: EXPLORER, external: true },
      { label: "BOT Chain", href: "https://www.botchain.ai/", external: true },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: REPO, external: true },
      { label: "Developer docs", href: "https://dev-docs.botchain.ai/docs/", external: true },
      { label: "Faucet", href: "https://faucet.botchain.ai/basic", external: true },
    ],
  },
];

const SOCIALS: { icon: string; label: string; href: string }[] = [
  { icon: "simple-icons:x", label: "Twitter", href: "https://x.com/BOTChain_ai" },
  { icon: "simple-icons:github", label: "GitHub", href: REPO },
];

export function Footer() {
  return (
    <footer className="relative w-full border-t border-white/5 bg-[#0a051e] z-20 pt-24 pb-12">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-[6%]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-24">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-white mb-6">
              <BeeLogo className="w-8 h-8" />
              <span className="font-bold tracking-tight">Hive</span>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h4 className="text-xs font-mono text-white/40 uppercase mb-6">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="flex items-center text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {l.label}
                      {l.status && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Connect */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-mono text-white/40 uppercase mb-6">Connect</h4>
            <ul className="space-y-4">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <Icon icon={s.icon} className="text-xs" /> {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact cards */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row gap-4 lg:justify-end">
            {[
              { kicker: "Live", label: "Open Dashboard", href: "/app", external: false },
              { kicker: "Source", label: "View on GitHub", href: REPO, external: true },
            ].map((c) => (
              <a
                key={c.label}
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="group flex flex-col justify-between p-6 w-full sm:w-48 h-32 border border-white/10 hover:bg-white/[0.03] hover:border-white/20 transition-all rounded-sm"
              >
                <div className="w-full flex justify-end">
                  <Icon icon="solar:arrow-right-up-linear" className="text-white/40 group-hover:text-purple-400 transition-colors" />
                </div>
                <div>
                  <span className="block text-xs font-mono text-white/40 mb-1">{c.kicker}</span>
                  <span className="block text-sm font-medium text-white">{c.label}</span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
          <p className="text-xs text-white/30">Hive · an on-chain agent labor market. Built for the BOT Chain Builder Challenge.</p>
          <div className="flex gap-6">
            <a href="https://www.botchain.ai/" target="_blank" rel="noreferrer" className="text-xs text-white/30 hover:text-white transition-colors">BOT Chain</a>
            <a href={EXPLORER} target="_blank" rel="noreferrer" className="text-xs text-white/30 hover:text-white transition-colors">Explorer</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
