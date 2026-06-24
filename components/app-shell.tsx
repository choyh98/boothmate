import Image from "next/image";
import Link from "next/link";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-[88px] max-w-6xl items-center justify-between px-5 md:px-8">
          <Link className="flex items-center" href="/">
            <Image src="/logo.svg" alt="부스메이트" width={136} height={42} priority />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-black text-booth-muted md:flex">
            <span className="text-booth-blue">MVP 구조</span>
            <span>인증 준비</span>
            <span>견적 플로우 준비</span>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
