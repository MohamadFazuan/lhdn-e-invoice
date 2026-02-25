import Image from 'next/image';

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className }: LogoProps) {
  const inner = Math.round(size * 0.5);

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div
        className="flex items-center justify-center rounded-lg bg-zinc-900 shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src="/icons/logo.svg"
          alt="invoisJer! logo"
          width={inner}
          height={inner}
          priority
        />
      </div>
      {showText && (
        <span className="font-semibold tracking-tight text-zinc-900">invoisJer!</span>
      )}
    </div>
  );
}
