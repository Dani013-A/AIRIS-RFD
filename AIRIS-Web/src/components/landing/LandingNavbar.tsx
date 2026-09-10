"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowDownToLine, Sparkles } from "lucide-react";

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "Purpose", href: "#purpose" },
    { label: "Objectives", href: "#objectives" },
    { label: "About", href: "#about" },
    { label: "Team", href: "#team" },
    { label: "Download", href: "#download" },
  ];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.substring(1);
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
      setMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-[#E7EFF5]"
          : "bg-white/80 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo & Wordmark */}
          <Link
            href="#home"
            onClick={(e) => handleScrollTo(e, "#home")}
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3E6B] rounded-lg p-1"
            aria-label="AIRIS Home"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#E7EFF5] border border-[#DCE6EE] flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
              <img
                src="/OWL-STANDING-OPEN.svg"
                alt="AIRIS Mascot"
                className="w-7 h-7 md:w-8 md:h-8 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black tracking-tight text-[#1E3E6B]">
                AIRIS
              </span>
              <span className="text-[10px] font-semibold text-[#5F7E97] -mt-1 hidden sm:block">
                T.I.P. Manila Capstone
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Main Navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="text-sm font-semibold text-[#5F7E97] hover:text-[#1E3E6B] transition-colors py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3E6B] rounded"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action: Download CTA & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <a
              href="#download"
              onClick={(e) => handleScrollTo(e, "#download")}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E3E6B] hover:bg-[#152c4d] shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E3E6B]"
            >
              <ArrowDownToLine size={14} />
              <span>Get App</span>
            </a>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-[#1E3E6B] hover:bg-[#E7EFF5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3E6B]"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E7EFF5] bg-white/98 px-4 pt-2 pb-6 shadow-xl transition-all">
          <nav className="flex flex-col space-y-3" aria-label="Mobile Navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3 py-2 rounded-lg text-base font-semibold text-[#1E3E6B] hover:bg-[#E7EFF5] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 border-t border-[#E7EFF5]">
              <a
                href="#download"
                onClick={(e) => handleScrollTo(e, "#download")}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white bg-[#1E3E6B] hover:bg-[#152c4d] transition-all"
              >
                <ArrowDownToLine size={16} />
                <span>Get App (Android)</span>
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
