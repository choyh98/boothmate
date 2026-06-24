type AuthCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthCard({ eyebrow, title, description, children }: AuthCardProps) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-6xl items-center px-5 py-12 md:px-8">
      <section className="mx-auto w-full max-w-xl rounded-[28px] border border-white/80 bg-white p-6 shadow-soft md:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-booth-blue">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-booth-ink md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base font-semibold leading-7 text-booth-muted">
          {description}
        </p>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}
