"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "../../store/authStore";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { OwlMascot } from "../ui/OwlMascot";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  History,
  ShieldAlert,
  LogOut,
  Menu,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentAdmin, loading, initialized, initializeSession, logout } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initializeSession();
    return () => unsubscribe();
  }, [initializeSession]);

  useEffect(() => {
    if (initialized && !currentAdmin && pathname !== "/login" && pathname !== "/forgot-password") {
      router.replace("/login");
    }
  }, [initialized, currentAdmin, pathname, router]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace("/login");
    } catch {
      // Signout completed locally
    }
  };

  const navItems = [
    { label: "Analytics", href: "/dashboard", icon: LayoutDashboard },
    { label: "Users", href: "/students", icon: Users },
    { label: "Reports", href: "/reports", icon: FileSpreadsheet },
    { label: "Audit Logs", href: "/audit", icon: History },
    { label: "Privacy & Co.", href: "/privacy", icon: ShieldAlert },
  ];

  if (!initialized || (loading && !currentAdmin)) {
    return (
      <div className="flex min-h-screen h-screen items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen p-4 md:p-5 bg-white gap-4 md:gap-5 overflow-hidden">
      {/* Sidebar navigation: floating rounded panel */}
      <aside className="hidden md:flex md:w-64 flex-col bg-sidebar-bg rounded-[32px] py-8 px-4 shrink-0 shadow-xs justify-between">

        {/* Header containing Owl Mascot logo */}
        <div className="flex flex-col items-center pb-6 border-b border-[#A5C2DA]/30">
          <OwlMascot size={70} />
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-8 space-y-2.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#A5C2DA]/50 text-brand-primary"
                    : "text-brand-slate hover:bg-brand-primary/5 hover:text-brand-primary"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / User section with Sign Out button */}
        <div className="space-y-4 pt-4 border-t border-[#A5C2DA]/30">
          <div className="flex flex-col px-3">
            <span className="text-xs font-bold text-brand-primary truncate">{currentAdmin.fullName}</span>
            <span className="text-[10px] text-brand-slate font-semibold truncate">{currentAdmin.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area: Floating rounded panel */}
      <div className="flex-1 h-full bg-panel-bg rounded-[32px] flex flex-col overflow-hidden shadow-xs border border-[#A5C2DA]/20">

        {/* Mobile Header Bar */}
        <header className="flex md:hidden items-center justify-between px-6 py-4 bg-white border-b border-[#A5C2DA]/20 h-16">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-brand-primary rounded-full items-center justify-center flex border border-white">
              <span className="text-white text-xs font-black">A</span>
            </div>
            <span className="text-sm font-black text-brand-primary">AIRIS Admin</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center h-8 w-8 rounded-full border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-all"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* View content container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
