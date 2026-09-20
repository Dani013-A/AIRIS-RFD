"use client";

import React, { useEffect, useState } from "react";
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
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { formatAdminRoleLabel } from "../../types/auth.types";

interface LayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentAdmin, loading, initialized, initializeSession, logout } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("airis_sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("airis_sidebar_collapsed", String(next));
      return next;
    });
  };

  useEffect(() => {
    const unsubscribe = initializeSession();
    return () => unsubscribe();
  }, [initializeSession]);

  useEffect(() => {
    if (initialized && !currentAdmin && pathname !== "/login" && pathname !== "/forgot-password") {
      router.replace("/login");
    }
  }, [initialized, currentAdmin, pathname, router]);

  // Handle Escape key for mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

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
    <div className="flex h-screen w-screen p-3 md:p-4 bg-[#F4F7FA] gap-3 md:gap-4 overflow-hidden">
      {/* Desktop Collapsible Sidebar: Institutional Rail/Panel */}
      <aside
        className={`hidden md:flex flex-col bg-white rounded-2xl border border-gray-200 transition-all duration-200 shrink-0 justify-between ${
          isCollapsed ? "w-[72px] py-5 px-2.5 items-center" : "w-[260px] py-6 px-4"
        }`}
        aria-label="Admin Navigation"
      >
        {/* Sidebar Header: Branding & Collapse Toggle */}
        <div className="flex flex-col border-b border-gray-150 pb-4 w-full">
          <div className="flex items-center justify-between w-full">
            <div className={`flex items-center ${isCollapsed ? "justify-center w-full" : "gap-2.5"}`}>
              <OwlMascot size={isCollapsed ? 36 : 42} />
              {!isCollapsed && (
                <div>
                  <span className="text-base font-black tracking-tight text-[#1E3E6B] block">
                    AIRIS Admin
                  </span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Institutional Console
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={toggleCollapsed}
                aria-label="Collapse Sidebar"
                title="Collapse Sidebar"
                className="p-1 rounded-lg text-gray-400 hover:text-[#1E3E6B] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {isCollapsed && (
            <button
              onClick={toggleCollapsed}
              aria-label="Expand Sidebar"
              title="Expand Sidebar"
              className="mt-3 mx-auto p-1 rounded-lg text-gray-400 hover:text-[#1E3E6B] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 py-5 space-y-1.5 overflow-y-auto w-full">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                className={`flex items-center rounded-xl text-xs font-bold transition-colors ${
                  isCollapsed ? "justify-center h-10 w-10 mx-auto" : "gap-3 px-3.5 py-2.5"
                } ${
                  isActive
                    ? "bg-[#1E3E6B] text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-[#1E3E6B]"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer: User details & Sign Out */}
        <div className="pt-4 border-t border-gray-150 w-full space-y-3">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${currentAdmin.fullName} (${formatAdminRoleLabel(currentAdmin.role)})`}
                className="h-9 w-9 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-black text-xs cursor-default"
              >
                {currentAdmin.fullName?.charAt(0).toUpperCase() || "A"}
              </div>
              <button
                onClick={handleSignOut}
                aria-label="Sign Out"
                title="Sign Out"
                className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col px-1 space-y-1">
                <span className="text-xs font-extrabold text-[#1E3E6B] truncate">
                  {currentAdmin.fullName}
                </span>
                <span className="text-[11px] text-gray-500 font-medium truncate">
                  {currentAdmin.email}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                    {formatAdminRoleLabel(currentAdmin.role)}
                  </span>
                  {currentAdmin.role === "ojt_coordinator" && currentAdmin.assignedProgram && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {currentAdmin.assignedProgram}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content Area: Floating rounded institutional panel */}
      <div className="flex-1 h-full bg-white rounded-2xl flex flex-col overflow-hidden border border-gray-200">
        {/* Mobile Header Bar with Hamburger Button */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-gray-200 h-14 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="p-1.5 text-[#1E3E6B] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <OwlMascot size={28} />
              <span className="text-sm font-black text-[#1E3E6B]">AIRIS Admin</span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            aria-label="Sign Out"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </header>

        {/* View content container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#FAFBFD]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation Drawer / Slide-Over Modal */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Sliding drawer panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full p-6 flex flex-col justify-between shadow-2xl z-10 rounded-r-2xl border-r border-gray-200">
            <div className="space-y-6">
              {/* Drawer header with mascot & close button */}
              <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                <div className="flex items-center gap-2.5">
                  <OwlMascot size={36} />
                  <div>
                    <span className="text-sm font-black text-[#1E3E6B] block">AIRIS Admin</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Institutional Console
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close Menu"
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:text-[#1E3E6B] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-[#1E3E6B] text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-[#1E3E6B]"
                      }`}
                    >
                      <Icon size={18} className="shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer / User section */}
            <div className="space-y-3 pt-4 border-t border-gray-150">
              <div className="flex flex-col px-1 space-y-1">
                <span className="text-xs font-black text-[#1E3E6B] truncate">
                  {currentAdmin.fullName}
                </span>
                <span className="text-[11px] text-gray-500 font-medium truncate">
                  {currentAdmin.email}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                    {formatAdminRoleLabel(currentAdmin.role)}
                  </span>
                  {currentAdmin.role === "ojt_coordinator" && currentAdmin.assignedProgram && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {currentAdmin.assignedProgram}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
