import { Link, useRouterState } from "@tanstack/react-router";
import { ClipboardList, MessageSquare, History } from "lucide-react";

const tabs = [
  { to: "/", label: "İşlerim", icon: ClipboardList },
  { to: "/assistant", label: "Asistan", icon: MessageSquare },
  { to: "/history", label: "Geçmiş", icon: History },
] as const;

export function BottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {tabs.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} />
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
