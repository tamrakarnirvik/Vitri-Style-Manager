"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  House,
  Landmark,
  Menu,
  Settings2,
  ShoppingBag,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

type Item = { label: string; href: string; icon: LucideIcon };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Analytics",
    items: [
      { label: "Overview", href: "/", icon: House },
      { label: "Insights", href: "/insights", icon: BarChart3 },
      { label: "Reports", href: "/reports", icon: ClipboardList },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Sales", href: "/sales", icon: ShoppingBag },
      { label: "Orders & delivery", href: "/orders", icon: ClipboardList },
      { label: "Inventory", href: "/inventory", icon: Boxes },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Accounts", href: "/accounts", icon: Landmark },
      { label: "Expenses", href: "/expenses", icon: Wallet },
    ],
  },
  {
    label: "Workspace",
    items: [{ label: "Settings", href: "/settings", icon: Settings2 }],
  },
];
const allItems = groups.flatMap((group) => group.items);
const tabs: Item[] = [
  { label: "Home", href: "/", icon: House },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Sales", href: "/sales", icon: ShoppingBag },
  { label: "Stock", href: "/inventory", icon: Boxes },
];

function matchesRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function Sidebar({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-[76px] shrink-0 items-center gap-3 border-b border-[#edf0f5] px-6"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-xl font-bold text-white">v</span>
        <span className="min-w-0">
          <span className="block text-[19px] font-bold tracking-[-.05em] text-[#1c2b43]">vitristyle</span>
          <span className="block text-xs font-semibold tracking-[.11em] text-[#96a2b5] uppercase">Business Manager</span>
        </span>
      </Link>
      <nav aria-label="All pages" className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="vs-nav-group-title">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = matchesRoute(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    data-active={active}
                    className="vs-nav-link"
                  >
                    <Icon size={20} strokeWidth={1.85} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {active && <ChevronRight size={16} aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[#edf0f5] px-5 py-4">
        <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-[#f6f8fc] p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e3ebfc] text-sm font-bold text-[#285cbd]">
            {email && email !== "Admin" ? email.charAt(0).toUpperCase() : "VS"}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-[#233349]">Signed in</span>
            <span className="block truncate text-xs text-[#718097]" title={email}>{email}</span>
          </span>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

function MobileTabs({ pathname, onMore, moreOpen }: { pathname: string; onMore: () => void; moreOpen: boolean }) {
  const otherPage = !tabs.some((tab) => matchesRoute(pathname, tab.href));
  return (
    <nav aria-label="Mobile primary navigation" className="vs-mobile-bottom-nav lg:hidden">
      <div className="grid grid-cols-5 items-stretch">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = matchesRoute(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="vs-mobile-tab"
              data-active={active}
            >
              <Icon size={22} strokeWidth={active ? 2.15 : 1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-label="Open more pages"
          aria-controls="vs-mobile-drawer"
          aria-expanded={moreOpen}
          className="vs-mobile-tab"
          data-active={otherPage || moreOpen}
        >
          <Menu size={22} strokeWidth={otherPage || moreOpen ? 2.15 : 1.8} aria-hidden="true" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

export function AppShell({ children, email }: { children: ReactNode; email: string }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const section = allItems.find(({ href }) => matchesRoute(pathname, href))?.label ?? "Workspace";

  return (
    <div className="vs-app-shell min-h-dvh min-w-0 bg-[#f6f8fc] text-[#1a293d]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:bg-white focus:p-3">Skip to main content</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[258px] border-r border-[#e7ecf4] bg-white lg:block">
        <Sidebar email={email} />
      </aside>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              aria-label="Close navigation overlay"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 h-full w-full bg-[#1a293d]/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.16 }}
            />
            <motion.aside
              id="vs-mobile-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="All navigation pages"
              onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}
              className="absolute inset-y-0 left-0 w-[min(88vw,320px)] bg-white shadow-2xl"
              initial={reduced ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduced ? { opacity: 0 } : { x: "-100%" }}
              transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
            >
              <Sidebar email={email} onNavigate={() => setMenuOpen(false)} />
              <button
                type="button"
                autoFocus
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="absolute right-3 top-5 flex h-11 w-11 items-center justify-center rounded-xl text-[#708097] hover:bg-[#f4f7fb]"
              ><X size={21} /></button>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="min-w-0 lg:pl-[258px]">
        <header className="vs-app-header sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#e7ecf4] bg-white/95 px-4 backdrop-blur-md sm:px-7 lg:h-[68px] lg:px-9">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              aria-label="Open all navigation pages"
              aria-expanded={menuOpen}
              aria-controls="vs-mobile-drawer"
              onClick={() => setMenuOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#40526b] hover:bg-[#f4f7fb] lg:hidden"
            ><Menu size={23} /></button>
            <span className="hidden text-sm font-semibold text-[#91a0b4] sm:inline">Workspace</span>
            <ChevronRight size={16} className="hidden text-[#b5becc] sm:inline" aria-hidden="true" />
            <span className="truncate text-base font-semibold text-[#293950]">{section}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-[#e5eaf2] bg-[#fafbfd] px-3 py-1.5 text-xs font-semibold text-[#66758a] xl:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2eaf7d]" /> Private workspace
            </span>
            <Link className="vs-btn-secondary hidden sm:inline-flex" href="/orders"><ClipboardList size={17} /> Orders <ArrowUpRight size={15} /></Link>
            <Link className="vs-btn-primary" href="/sales"><ShoppingBag size={17} /> <span className="hidden min-[390px]:inline">Record sale</span><span className="min-[390px]:hidden">Sale</span></Link>
          </div>
        </header>
        <main id="main-content" className="vs-app-main mx-auto w-full min-w-0 max-w-[1530px] px-4 pt-5 sm:px-7 sm:pt-8 lg:px-9 lg:pb-14">
          <motion.div
            key={pathname}
            initial={reduced ? false : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      <MobileTabs pathname={pathname} onMore={() => setMenuOpen(true)} moreOpen={menuOpen} />
    </div>
  );
}
