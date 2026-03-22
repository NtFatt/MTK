type CashierNumpadProps = {
  onDigit: (digit: number) => void;
  onDoubleZero: () => void;
  onTripleZero: () => void;
  onBackspace: () => void;
  onClear: () => void;
};

export function CashierNumpad({
  onDigit,
  onDoubleZero,
  onTripleZero,
  onBackspace,
  onClear,
}: CashierNumpadProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {[7, 8, 9].map((n) => (
        <button
          key={n}
          type="button"
          className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
          onClick={() => onDigit(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-sm font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
        onClick={onBackspace}
      >
        ⌫
      </button>

      {[4, 5, 6].map((n) => (
        <button
          key={n}
          type="button"
          className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
          onClick={() => onDigit(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-sm font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
        onClick={onClear}
      >
        C
      </button>

      {[1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
          onClick={() => onDigit(n)}
        >
          {n}
        </button>
      ))}
      <div className="rounded-[16px] border border-dashed border-[#ead8c0] bg-[#fffaf3]" />

      <button
        type="button"
        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
        onClick={() => onDigit(0)}
      >
        0
      </button>
      <button
        type="button"
        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
        onClick={onDoubleZero}
      >
        00
      </button>
      <button
        type="button"
        className="rounded-[16px] border border-[#dfc49f] bg-[#fffdf8] py-4 text-lg font-semibold text-[#4e2916] transition hover:bg-[#fff3e4]"
        onClick={onTripleZero}
      >
        000
      </button>
      <div className="rounded-[16px] border border-dashed border-[#ead8c0] bg-[#fffaf3]" />
    </div>
  );
}
