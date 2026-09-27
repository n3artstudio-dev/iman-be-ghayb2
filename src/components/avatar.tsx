import { Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/format";
import { AVATAR_COLORS } from "@/lib/theme";

export function Avatar({
  name,
  color,
  size = 44,
  online,
  ring,
  bot,
  group,
  className,
}: {
  name: string;
  color?: string;
  size?: number;
  online?: boolean;
  ring?: "unseen" | "seen" | null;
  bot?: boolean;
  group?: boolean;
  className?: string;
}) {
  const grad = AVATAR_COLORS[color ?? "gold"] ?? AVATAR_COLORS.gold;
  const letter = Array.from((name || "؟").trim())[0] ?? "؟";
  const iconSize = size * 0.48;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div
        className={cn(
          "grid h-full w-full select-none place-items-center rounded-full bg-linear-to-br font-bold text-night-950 shadow-inner",
          grad,
          ring === "unseen" && "ring-2 ring-gold-400 ring-offset-2 ring-offset-night-900",
          ring === "seen" && "ring-2 ring-slate-600 ring-offset-2 ring-offset-night-900",
        )}
        style={{ fontSize: size * 0.42 }}
      >
        {bot ? (
          <Sparkles style={{ width: iconSize, height: iconSize }} />
        ) : group ? (
          <Users style={{ width: iconSize, height: iconSize }} />
        ) : (
          letter
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 end-0 h-3 w-3 rounded-full border-2 border-night-900 bg-emerald-400" />
      )}
    </div>
  );
}
