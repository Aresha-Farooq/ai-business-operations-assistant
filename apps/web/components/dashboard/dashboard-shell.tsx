"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CurrentWorkspace } from "@/lib/current-workspace";
import { LogoutButton } from "./logout-button";
import {
  AssistantIcon,
  CloseIcon,
  CustomersIcon,
  DashboardIcon,
  DocumentsIcon,
  InventoryIcon,
  KnowledgeIcon,
  MenuIcon,
  OrdersIcon,
  SettingsIcon,
} from "./icons";

type DashboardShellProps = {
  workspace: CurrentWorkspace;
  children: ReactNode;
};

type NavItem =
  | {
      id: string;
      label: string;
      href: string;
      icon: typeof DashboardIcon;
    }
  | {
      id: string;
      label: string;
      comingSoon: true;
      icon: typeof DashboardIcon;
    };

const navigation: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  {
    id: "assistant",
    label: "AI Assistant",
    href: "/dashboard/assistant",
    icon: AssistantIcon,
  },
  { id: "documents", label: "Documents", comingSoon: true, icon: DocumentsIcon },
  {
    id: "knowledge",
    label: "Knowledge Base",
    comingSoon: true,
    icon: KnowledgeIcon,
  },
  { id: "customers", label: "Customers", comingSoon: true, icon: CustomersIcon },
  { id: "inventory", label: "Inventory", comingSoon: true, icon: InventoryIcon },
  { id: "orders", label: "Orders", comingSoon: true, icon: OrdersIcon },
  { id: "settings", label: "Settings", comingSoon: true, icon: SettingsIcon },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function navClassName(active: boolean) {
  return `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
    active
      ? "bg-slate-800 text-white"
      : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
  }`;
}

export function DashboardShell({ workspace, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <>
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white">
          <AssistantIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold tracking-tight text-white">Alliance AI</p>
          <p className="text-xs text-slate-400">Business Operations</p>
        </div>
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => {
          if ("comingSoon" in item) {
            const Icon = item.icon;
            return (
              <span
                key={item.id}
                aria-disabled="true"
                title="Coming soon"
                className="flex cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                  Soon
                </span>
              </span>
            );
          }

          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={navClassName(active)}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <LogoutButton
          onLoggedOut={() => setMobileOpen(false)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-slate-200 md:sticky md:top-0 md:flex md:h-screen">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-navigation"
            className="relative z-50 flex h-full w-72 max-w-[85vw] flex-col bg-slate-900 text-slate-200 shadow-xl"
          >
            <div className="flex justify-end p-3">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileOpen(true)}
            >
              <span className="sr-only">Open navigation</span>
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                Workspace
              </p>
              <h1 className="truncate text-base font-semibold text-slate-900">
                {workspace.organizationName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {workspace.userName}
            </span>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
              aria-hidden="true"
            >
              {initials(workspace.userName)}
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
