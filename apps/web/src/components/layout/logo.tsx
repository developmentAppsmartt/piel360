import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-piel360.webp"
      alt="Piel360"
      width={669}
      height={373}
      priority
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}
