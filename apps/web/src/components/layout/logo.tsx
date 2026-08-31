import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  fullWidth = false,
  compact = false,
}: {
  className?: string;
  /** Ocupa todo el ancho del contenedor (sidebar). */
  fullWidth?: boolean;
  /** Versión compacta para sidebar contraído (solo icono). */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Image
        src="/logo-piel360.png"
        alt="Piel360"
        width={40}
        height={40}
        priority
        className={cn("size-10 rounded-lg object-cover object-left", className)}
      />
    );
  }

  return (
    <Image
      src="/logo-piel360.png"
      alt="Piel360"
      width={612}
      height={408}
      priority
      className={cn(
        fullWidth
          ? "h-auto max-h-24 w-full object-contain object-left"
          : "h-14 w-auto object-contain",
        className,
      )}
    />
  );
}
