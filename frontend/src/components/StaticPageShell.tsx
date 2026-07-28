import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";

export function StaticPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="mb-8 text-3xl font-bold">{title}</h1>
        <div className="space-y-4 text-muted [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-text">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
