import React from "react";

interface LogoProps {
  /** Rendered width/height in px. */
  size?: number;
  className?: string;
}

/**
 * PollarBridge mark: two arcs meeting at a keystone.
 * Violet arc = the African local leg in, emerald arc = the Bolivian payout out,
 * white keystone = the verified settlement point. Bridge deck underneath.
 * Inline SVG so it inherits layout and needs no network request.
 */
export default function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="PollarBridge logo"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="lg-bg" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#161D38" />
          <stop offset="1" stopColor="#0A0E1D" />
        </linearGradient>
        <linearGradient id="lg-violet" x1="14" y1="16" x2="50" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="lg-emerald" x1="14" y1="48" x2="50" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#lg-bg)" />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="15.25"
        stroke="#8B5CF6"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path d="M14 41.5 H50" stroke="#3B4A6B" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M15 41.5 C 23 18, 41 18, 49 41.5"
        stroke="url(#lg-violet)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M15 47.5 C 23 27, 41 27, 49 47.5"
        stroke="url(#lg-emerald)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.92"
      />
      <circle cx="15" cy="41.5" r="3.1" fill="#A78BFA" />
      <circle cx="49" cy="41.5" r="3.1" fill="#34D399" />
      <circle cx="32" cy="26.5" r="3.3" fill="#F8FAFC" />
    </svg>
  );
}
