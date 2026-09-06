import type { DialogueLine } from "@/lib/game/types";
import { useEffect, useState } from "react";

export function SpeechBox({
  art,
  line,
  hint,
  showToken,
  disabled,
  onNext,
}: {
  art: string;
  line: DialogueLine;
  hint: string;
  showToken?: boolean;
  disabled?: boolean;
  onNext: () => void;
}) {
  const [shown, setShown] = useState("");
  const done = shown.length >= line.text.length;

  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(line.text.slice(0, i));
      if (i >= line.text.length) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [line.text]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!done) {
          setShown(line.text);
          return;
        }
        onNext();
      }}
      className="tap pop-in absolute inset-x-2 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-20 text-left"
    >
      <div className="ui-speech">
        <div className="relative z-10 flex items-start gap-3 px-3 pt-4 pb-3.5">
          <img
            src={art}
            alt=""
            className="h-[6.2rem] w-[4.2rem] shrink-0 self-end object-contain object-bottom"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
          <div className="min-w-0 flex-1 pt-1">
            {line.name ? (
              <p className="title-ink text-lg">{line.name}</p>
            ) : (
              <p className="text-[11px] tracking-widest text-ink-soft">旁白</p>
            )}
            <p className="poem-line mt-1 min-h-12 pr-1 text-sm leading-relaxed text-ink">
              {shown}
              {!done ? <span className="caret">▌</span> : null}
            </p>
            <div className="mt-1 flex items-center justify-end gap-2 pr-1">
              {showToken ? <img src="/ui/jade-btn.png" alt="" className="h-6 w-6 object-contain idle-bob" /> : null}
              <p className="text-[11px] tracking-widest text-ink/45">{hint}</p>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
