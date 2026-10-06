import type { ReactNode } from "react";

import { cardClass, containerClass, mutedTextClass, pageClass } from "@/lib/ui";

type PageShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
};

// Common page frame. While the session is loading (or redirecting to login)
// only the header is shown.
export default function PageShell({ title, description, actions, loading, children }: PageShellProps) {
  return (
    <main className={pageClass}>
      <div className={`${containerClass} space-y-6`}>
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            {description ? <p className={`mt-1 ${mutedTextClass}`}>{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>

        {loading ? (
          <section className={cardClass}>
            <p className={mutedTextClass}>Loading...</p>
          </section>
        ) : (
          children
        )}
      </div>
    </main>
  );
}
