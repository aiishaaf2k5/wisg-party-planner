"use client";

import { ProFlyerPreset } from "@/lib/flyer/pro-presets";

function deco(id: string) {
  const key = id.toLowerCase();
  if (key.includes("eid")) return ["moon", "lantern", "stars"];
  if (key.includes("floral") || key.includes("garden") || key.includes("blush")) {
    return ["petals", "floral", "frame"];
  }
  if (key.includes("red") || key.includes("carpet") || key.includes("gala")) {
    return ["spotlight", "gold", "lux"];
  }
  if (key.includes("marble")) return ["marble", "geo", "gold"];
  if (key.includes("black-gold")) return ["confetti", "rings", "vip"];
  if (key.includes("tropical") || key.includes("summer")) return ["sun", "leaf", "vibe"];
  if (key.includes("winter")) return ["snow", "ice", "glow"];
  return ["style", "event", "design"];
}

export default function ProPresetThumbnail({ preset }: { preset: ProFlyerPreset }) {
  const [c1, c2, c3] = preset.palette;
  const [t1, t2, t3] = deco(preset.id);

  return (
    <div
      className="relative h-44 w-full overflow-hidden rounded-xl border"
      style={{
        background: `linear-gradient(145deg, ${c1}, ${c2})`,
        borderColor: "rgba(255,255,255,0.45)",
      }}
    >
      <div className="absolute inset-x-0 top-2 flex items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
        <span>IWSG</span>
        <span>{t1}</span>
      </div>

      <div className="absolute left-3 right-3 top-10 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/85">Invitation</div>
        <div className="mt-1 text-xl font-extrabold leading-none text-white">{preset.label}</div>
      </div>

      <div className="absolute left-3 right-3 top-[92px] rounded-full border border-white/45 bg-white/85 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-[0.1em] text-gray-900">
        Date • Time • Venue
      </div>

      <div className="absolute left-3 right-3 top-[118px] flex justify-between text-[9px] text-white/95">
        <span>{t2}</span>
        <span>{t3}</span>
      </div>

      <div
        className="absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-30"
        style={{ background: c3 }}
      />
      <div
        className="absolute -bottom-10 -left-8 h-24 w-24 rounded-full opacity-25"
        style={{ background: c3 }}
      />
    </div>
  );
}

