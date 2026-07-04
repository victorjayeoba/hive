import "./_hive/hive.css";

import { IconifyRuntime } from "./_hive/components/IconifyRuntime";
import { UnicornBackground } from "./_hive/components/UnicornBackground";
import { GlobalGrid } from "./_hive/components/GlobalGrid";
import { Navbar } from "./_hive/components/Navbar";
import { Hero } from "./_hive/components/Hero";
import { Features } from "./_hive/components/Features";
import { Validation } from "./_hive/components/Validation";
import { TestimonialsMarquee } from "./_hive/components/TestimonialsMarquee";
import { FaqSection } from "./_hive/components/FaqSection";
import { Footer } from "./_hive/components/Footer";

// Title, description, and the social-preview (OG/Twitter) image are defined once
// in the root layout and inherited here — no per-page override needed.

export default function HiveLanding() {
  return (
    <div className="hive-root min-h-screen overflow-x-hidden selection:bg-purple-500 selection:text-white">
      {/* Iconify web-component runtime (installed from npm, not a CDN). */}
      <IconifyRuntime />

      <UnicornBackground />
      <GlobalGrid />

      <div className="relative z-10 flex flex-col w-full min-h-screen">
        <Navbar />
        <main className="w-full">
          <Hero />
          <Features />
          <Validation />
          <TestimonialsMarquee />
          <FaqSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
