import { poetBust } from "@/lib/game/content";
import { sfxTap } from "@/lib/game/sfx";
import { bustOf } from "@/lib/game/sprites";
import type { DialogueLine } from "@/lib/game/types";
import { useState } from "react";
import { SpeechBox } from "./speech-box";
import { Stage, StageHud } from "./stage";

export function Cutscene({
  bg,
  title,
  backTo,
  lines,
  poetId,
  poetName,
  monsterArt,
  onDone,
}: {
  bg: string;
  title?: string;
  backTo?: string;
  lines: DialogueLine[];
  poetId?: string;
  poetName?: string;
  monsterArt?: string;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const line = lines[index];
  if (!line) {
    onDone();
    return null;
  }
  const last = index >= lines.length - 1;
  const art =
    line.speaker === "tang"
      ? "/sprites/hero-bust.png"
      : poetName && line.name === poetName && poetId
        ? poetBust(poetId)
        : line.speaker === "narrator"
          ? "/sprites/hero-bust.png"
          : bustOf(monsterArt ?? "/sprites/demon.png");

  return (
    <Stage bg={bg} dim>
      <StageHud title={title} backTo={backTo} />
      <SpeechBox
        art={art}
        line={line}
        hint={last ? "进入" : "点一下继续"}
        onNext={() => {
          sfxTap();
          if (last) onDone();
          else setIndex((n) => n + 1);
        }}
      />
    </Stage>
  );
}
