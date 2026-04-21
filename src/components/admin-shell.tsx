"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, ChevronRight, CircleDollarSign, Home, Newspaper, Users } from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { APP_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Home", icon: Home },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/bills", label: "Bills", icon: CircleDollarSign },
  { href: "/admin/newspapers", label: "Papers", icon: Newspaper },
  { href: "/admin/transactions", label: "Transactions", icon: ArrowLeftRight },
];

export function AdminShell({
  title,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeLink = links.find((link) => pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`)));
  const breadcrumbItems = [
    { label: "Admin", href: "/admin" },
    ...(pathname === "/admin" ? [] : [{ label: activeLink?.label ?? title, href: activeLink?.href ?? pathname }]),
    ...(activeLink && title !== activeLink.label ? [{ label: title, href: pathname }] : []),
  ];

  return (
    <div className="pb-24 md:pb-6">
      <div className="hidden md:grid md:min-h-screen md:grid-cols-[280px_minmax(0,1fr)] md:items-start md:gap-4">
        <aside className="app-card sticky top-[10px] ml-[10px] flex min-h-[calc(100vh-20px)] flex-col p-3">
          <div className="px-3 py-3">
            <p className="text-s font-semibold uppercase tracking-[0.18em] text-emerald-700">{APP_CONFIG.appName}</p>
          </div>

          <nav className="mt-2 flex flex-1 flex-col gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active =
                pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                    active
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <form action={logoutAction} className="mt-4 border-t border-slate-200 pt-3">
            <Button type="submit" variant="outline" className="h-11 w-full rounded-2xl">
              Logout
            </Button>
          </form>
        </aside>

        <div className="flex min-w-0 flex-col gap-4 px-4 py-4 sm:px-6">
          <header className="px-1 py-1">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
              {breadcrumbItems.map((item, index) => (
                <div key={`${item.href}-${item.label}`} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="size-4 text-slate-400" /> : null}
                  {index === breadcrumbItems.length - 1 ? (
                    <span className="font-medium text-slate-900">{item.label}</span>
                  ) : (
                    <Link href={item.href} className="transition hover:text-slate-900">
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</h1>
          </header>

          <div className="flex flex-col gap-4">{children}</div>
        </div>
      </div>

      <div className="md:hidden">
        <div className="app-shell flex flex-col gap-4">
          <header className="px-1 py-1">
            <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
              {breadcrumbItems.map((item, index) => (
                <div key={`${item.href}-${item.label}`} className="flex items-center gap-1">
                  {index > 0 ? <ChevronRight className="size-4 text-slate-400" /> : null}
                  {index === breadcrumbItems.length - 1 ? (
                    <span className="font-medium text-slate-900">{item.label}</span>
                  ) : (
                    <Link href={item.href} className="transition hover:text-slate-900">
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <div className="mt-2 flex items-center justify-between gap-3">
              <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
              <form action={logoutAction}>
                <Button type="submit" variant="outline" className="h-11 rounded-2xl px-5">
                  Logout
                </Button>
              </form>
            </div>
          </header>

          <div className="flex flex-col gap-4">{children}</div>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium",
                  active ? "bg-emerald-50 text-emerald-800" : "text-slate-500",
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
