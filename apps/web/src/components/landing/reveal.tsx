"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Aparece al entrar en pantalla (clase `landing-reveal` de landing.css). Sin
 * JS o con movimiento reducido el contenido se ve igual: solo se pierde el
 * efecto. */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.visible = "true";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const props = {
    ref,
    className: cn("landing-reveal", className),
    style: delay ? ({ "--landing-delay": `${delay}ms` } as CSSProperties) : undefined,
  };
  return as === "li" ? <li {...props}>{children}</li> : <div {...props}>{children}</div>;
}
