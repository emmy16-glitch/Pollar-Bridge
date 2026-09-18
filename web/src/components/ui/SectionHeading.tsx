import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  align?: "left" | "center";
  tone?: "violet" | "emerald" | "amber";
}

const eyebrowTone: Record<string, string> = {
  violet: "text-violet-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  align = "left",
  tone = "violet",
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div className={`flex flex-col gap-2 ${centered ? "text-center items-center" : ""}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-xs font-mono uppercase tracking-wider ${eyebrowTone[tone]}`}>
          {eyebrow}
        </span>
        {actionHref && (
          <Link
            href={actionHref}
            className="text-xs text-violet-400 hover:text-violet-300 font-medium inline-flex items-center gap-1"
          >
            <span>{actionLabel ?? "View all"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h2>
      {description && (
        <p className={`text-sm text-slate-400 leading-relaxed ${centered ? "max-w-xl mx-auto" : "max-w-2xl"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
