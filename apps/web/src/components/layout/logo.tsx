import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  fullWidth = false,
}: {
  className?: string;
  /** Ocupa todo el ancho del contenedor (sidebar). */
  fullWidth?: boolean;
}) {
  return (
    <Image
      src="/logo-piel360.png"
      alt="Piel360"
      width={612}
      height={408}
      priority
      className={cn(
        fullWidth
          ? "h-auto w-full object-contain object-top -mt-6 -mb-6"
          : "h-14 w-auto object-contain",
        className,
      )}
    />
  );
}
