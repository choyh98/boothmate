import { BackButton } from "@/components/auth/back-button";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-booth-bg">
      <main className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8">
        <BackButton />
        <div className="py-8 md:py-12">{children}</div>
      </main>
    </div>
  );
}
