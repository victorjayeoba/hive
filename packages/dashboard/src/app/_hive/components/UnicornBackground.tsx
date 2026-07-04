/**
 * Fixed ambient background: a deep purple-to-black diagonal gradient with two
 * large blurred colour glows. (The original also mounted a UnicornStudio WebGL
 * scene here; we keep the static gradient layer, which is what renders when the
 * scene is absent.)
 */
export function UnicornBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#0e0725] via-[#050211] to-black" />
      <div className="absolute top-[-10%] right-[-10%] w-[600px] lg:w-[900px] h-[600px] lg:h-[900px] bg-purple-900/10 rounded-full blur-[80px] lg:blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] lg:w-[700px] h-[500px] lg:h-[700px] bg-indigo-900/10 rounded-full blur-[80px] lg:blur-[120px]" />
    </div>
  );
}
