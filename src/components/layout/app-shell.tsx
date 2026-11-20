"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BarChart3, Boxes, LayoutDashboard, Menu, ReceiptText, Settings2, ShoppingBag, Wallet, X, Landmark, type LucideIcon } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

type NavItem = { label: string; href: string; icon: LucideIcon };
const navigation: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Sales", href: "/sales", icon: ShoppingBag },
  { label: "Expenses", href: "/expenses", icon: Wallet },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Accounts", href: "/accounts", icon: Landmark },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className="space-y-1 px-3">{navigation.map(({href,label,icon:Icon}) => {
    const active = pathname === href;
    return <Link key={href} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-[background-color,color,transform] duration-200 motion-safe:hover:translate-x-0.5 motion-reduce:transition-none ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />{label}
    </Link>;
  })}</nav>;
}

function SidebarContent({ onNavigate, email }: { onNavigate?: () => void; email: string }) {
  return <>
    <Link href="/" onClick={onNavigate} className="flex h-21 items-center gap-3 px-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white"><ShoppingBag size={20} strokeWidth={1.8} /></span>
      <span><span className="block text-lg font-bold tracking-tight">vitristyle</span><span className="block text-[11px] uppercase tracking-widest text-neutral-400">Manager</span></span>
    </Link>
    <div className="border-t border-neutral-100 pt-5"><p className="mb-3 px-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Workspace</p><Navigation onNavigate={onNavigate}/></div>
    <div className="mt-auto border-t border-neutral-100 px-5 py-5"><div className="rounded-xl bg-neutral-50 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-neutral-800"><ReceiptText size={15}/> Signed in</div><p className="mt-2 truncate text-xs text-neutral-500" title={email}>{email}</p><p className="mt-2 text-xs leading-5 text-neutral-500">Phase 4 · Cash & stock control</p></div><div className="mt-3"><SignOutButton /></div></div>
  </>;
}

export function AppShell({ children, email }: { children: ReactNode; email: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const pageName = navigation.find((n)=>n.href===pathname)?.label ?? "Workspace";
  return <div className="min-h-screen bg-neutral-50 text-neutral-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-neutral-200 bg-white lg:flex"><SidebarContent email={email} /></aside>
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
      <button type="button" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(true)} className="rounded-lg p-2 transition hover:bg-neutral-100"><Menu size={22}/></button>
      <Link href="/" className="font-bold tracking-tight">vitristyle <span className="font-normal text-neutral-400">Manager</span></Link>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">VS</span>
    </header>
    <AnimatePresence>
      {menuOpen && <div className="fixed inset-0 z-50 lg:hidden">
        <motion.button type="button" aria-label="Close navigation menu" className="absolute inset-0 bg-black/40" onClick={()=>setMenuOpen(false)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?0:0.2}} />
        <motion.aside className="absolute inset-y-0 left-0 flex w-[min(84vw,290px)] flex-col bg-white shadow-xl" initial={reduced?false:{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}} transition={{duration:reduced?0:0.24,ease:"easeOut"}}>
          <div className="absolute right-4 top-5 z-10"><button type="button" aria-label="Close menu" onClick={()=>setMenuOpen(false)} className="rounded-lg p-2 hover:bg-neutral-100"><X size={20}/></button></div>
          <SidebarContent email={email} onNavigate={()=>setMenuOpen(false)} />
        </motion.aside>
      </div>}
    </AnimatePresence>
    <div className="lg:pl-[248px]">
      <div className="hidden h-19 items-center justify-between border-b border-neutral-200 bg-white px-8 lg:flex"><div className="text-sm text-neutral-500">Workspace <span className="mx-2 text-neutral-300">/</span><span className="font-medium text-neutral-900">{pageName}</span></div><div className="flex items-center gap-3"><span className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500">Phase 4 · Live</span><span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">VS</span><span className="max-w-[200px] truncate text-sm font-medium" title={email}>{email}</span></div></div>
      <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9"><motion.div key={pathname} initial={reduced?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:0.22}}>{children}</motion.div></main>
    </div>
  </div>;
}
