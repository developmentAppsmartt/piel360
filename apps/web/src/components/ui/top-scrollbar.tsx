"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Contenedor con scroll horizontal que repite la barra arriba, sincronizada
 * con la de abajo: en tablas anchas la barra de abajo queda fuera de la
 * vista y no se veía que había más columnas. Solo aparece si hay desborde.
 */
export function TopScrollbar({
  children,
  enabled = true,
  className,
}: {
  children: ReactNode;
  enabled?: boolean;
  className?: string;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scroll: 0, client: 0 });

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const measure = () => setSize({ scroll: body.scrollWidth, client: body.clientWidth });
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    if (body.firstElementChild) observer.observe(body.firstElementChild);
    return () => observer.disconnect();
  }, []);

  // Cada barra mueve a la otra; solo si difieren, así no rebotan.
  function follow(from: HTMLDivElement | null, to: HTMLDivElement | null) {
    if (!from || !to || Math.abs(to.scrollLeft - from.scrollLeft) < 1) return;
    to.scrollLeft = from.scrollLeft;
  }

  const overflowing = enabled && size.scroll > size.client + 1;

  return (
    <div className={className}>
      {overflowing ? (
        <div
          ref={topRef}
          className="overflow-x-auto overflow-y-hidden"
          onScroll={() => follow(topRef.current, bodyRef.current)}
          aria-hidden
        >
          <div style={{ width: size.scroll, height: 1 }} />
        </div>
      ) : null}
      <div
        ref={bodyRef}
        className="overflow-x-auto"
        onScroll={() => follow(bodyRef.current, topRef.current)}
      >
        {children}
      </div>
    </div>
  );
}
