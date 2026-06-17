export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Soft brand glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 60rem at 50% -10%, #eef2ff 0%, transparent 55%), radial-gradient(40rem 40rem at 100% 100%, #faf5ff 0%, transparent 50%)",
        }}
      />
      <div className="relative w-full max-w-md gm-fade-up">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.18)]">
          {children}
        </div>
      </div>
    </div>
  );
}
