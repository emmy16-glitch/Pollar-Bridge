import React from "react";
import Link from "next/link";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

export default function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <div className="p-10 rounded-2xl border border-dashed border-slate-700 bg-[#0D1326]/60 text-center space-y-3">
      <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto">
        <Inbox className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      {description && <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">{description}</p>}
      {actionHref && (
        <Link
          href={actionHref}
          className="inline-block px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
        >
          {actionLabel ?? "Take action"}
        </Link>
      )}
    </div>
  );
}
