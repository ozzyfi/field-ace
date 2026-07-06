import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

interface AppShellProps {
  title: string;
  subtitle?: string;
  back?: string | boolean;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AppShell({ title, subtitle, back, right, children, footer }: AppShellProps) {
  const router = useRouter();
  return (
    <div className="app-shell flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
          <div className="flex items-center">
            {back ? (
              typeof back === "string" ? (
                <Link to={back} className="btn-ghost -ml-2">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => router.history.back()}
                  className="btn-ghost -ml-2"
                  aria-label="Geri"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )
            ) : (
              <div className="h-9 w-9" />
            )}
          </div>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
            {subtitle ? (
              <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-end">{right}</div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-32 pt-4">{children}</main>

      {footer ? (
        <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-md">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}
