"use client";

import React, { useEffect, useState } from "react";

interface StreamingTextProps {
  text: string;
  speed?: number;
  className?: string;
  doneLabel?: string;
}

/** Typewriter-style streaming text with a status caret. Text is atomic for AT. */
export default function StreamingText({ text, speed = 18, className = "", doneLabel }: StreamingTextProps) {
  const [count, setCount] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setReduced(prefersReduced);
      if (prefersReduced) {
        setCount(text.length);
        return;
      }
      setCount(0);
      if (!text) return;
      interval = window.setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            if (interval !== undefined) window.clearInterval(interval);
            return c;
          }
          return c + 1;
        });
      }, speed);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [text, speed]);

  const done = count >= text.length;
  const visible = reduced ? text : text.slice(0, count);

  return (
    <p className={`font-mono ${className}`} aria-live="polite" aria-label={done && doneLabel ? doneLabel : text}>
      <span aria-hidden="true">
        {visible}
        {!done && <span className="stream-caret" />}
      </span>
    </p>
  );
}
