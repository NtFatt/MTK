export function CustomerMythmakerBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,247,222,0.92),transparent_26%),linear-gradient(180deg,#fdf5e6_0%,#f7ead4_48%,#f2dcc1_100%)]" />
      <div className="absolute inset-0 opacity-[0.14] [background:repeating-linear-gradient(180deg,rgba(119,73,33,0.14)_0,rgba(119,73,33,0.14)_1px,transparent_1px,transparent_22px)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(91,56,27,0.28),transparent)]" />

      <div className="customer-hotpot-lantern customer-hotpot-lantern-left absolute left-[max(8px,2vw)] top-0 hidden md:block" />
      <div className="customer-hotpot-lantern customer-hotpot-lantern-right absolute right-[max(8px,2vw)] top-2 hidden md:block" />

      <div className="absolute left-[7%] top-[18%] h-40 w-40 rounded-full bg-[#ffd88c]/14 blur-3xl" />
      <div className="absolute right-[14%] top-[24%] h-44 w-44 rounded-full bg-[#ff8a5f]/10 blur-3xl" />
      <div className="absolute bottom-[18%] left-[18%] h-40 w-40 rounded-full bg-[#fff0c2]/16 blur-3xl" />

      <span className="customer-hotpot-steam absolute left-[18%] top-[52%]" />
      <span className="customer-hotpot-steam customer-hotpot-steam-delay-2 absolute left-[22%] top-[56%]" />
      <span className="customer-hotpot-steam customer-hotpot-steam-delay-3 absolute right-[16%] top-[34%]" />

      <div className="absolute inset-x-0 top-[17%] h-px bg-[linear-gradient(90deg,transparent,rgba(225,186,113,0.78),transparent)] opacity-80" />
      <div className="absolute inset-x-0 top-[68%] h-px bg-[linear-gradient(90deg,transparent,rgba(199,76,52,0.36),transparent)] opacity-80" />
    </div>
  );
}
