import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-piel360.png"
      alt="Piel360"
      width={612}
      height={408}
      priority
      className={cn("h-14 w-auto object-contain", className)}
    />
  );
}
