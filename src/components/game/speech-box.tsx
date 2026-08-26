import type { DialogueLine } from "@/lib/game/types";
import { useEffect, useState } from "react";

export function SpeechBox({
  art,
  line,
  hint,
  showKey,
  disabled,
  onNext,
}: {
  art: string;
  line: DialogueLine;
  hint: string;
  showKey?: boolean;
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
      className="tap pop-in absolute inset-x-2 bottom-[max(0.6rem,env(safe-area-inset-bottom))] z-20 h-[16.75rem] text-left"
    >
      <img src="/ui/speech-panel.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
      <div className="relative z-10 flex h-full items-center gap-3 px-[14%] pt-[20%] pb-[22%]">
        <img
          src={art}
          alt=""
          className="h-[6.2rem] w-[4.2rem] shrink-0 object-contain object-bottom"
          onError={(event) => {
            event.currentTarget.src = "/sprites/poets/default.png";
          }}
        />
        <div className="min-w-0 flex-1">
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
            {showKey ? <img src="/sprites/key.png" alt="" className="h-6 w-6 object-contain idle-bob" /> : null}
            <p className="text-[11px] tracking-widest text-ink/45">{hint}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
