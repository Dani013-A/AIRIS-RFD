"use client";

import React from "react";
import Link from "next/link";
import { Mail, Lock, Shield, GraduationCap } from "lucide-react";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-white border-t border-[#DCE6EE] text-[#5F7E97] text-xs pt-14 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Row: Info & Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Col 1: Platform Identity */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E7EFF5] border border-[#DCE6EE] flex items-center justify-center overflow-hidden">
                <img
                  src="/OWL-STANDING-OPEN.svg"
                  alt="AIRIS Logo"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <span className="text-xl font-black tracking-tight text-[#1E3E6B]">
                AIRIS
              </span>
            </div>

            <p className="text-sm font-semibold text-[#1E3E6B]">
              AI-Assisted Resume Analysis and Interview Simulation Platform for Fresh Graduates
            </p>

            <p className="text-xs text-[#5F7E97] leading-relaxed max-w-md">
              Developed as an undergraduate academic capstone research project at the
              Technological Institute of the Philippines - Manila to support graduating seniors
              and fresh graduates in career preparation.
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#1E3E6B]">
              <GraduationCap size={15} className="text-[#5F7E97]" />
              <span>Technological Institute of the Philippines - Manila</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3E6B]">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="#home"
                  onClick={(e) => handleScrollTo(e, "home")}
                  className="hover:text-[#1E3E6B] transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#purpose"
                  onClick={(e) => handleScrollTo(e, "purpose")}
                  className="hover:text-[#1E3E6B] transition-colors"
                >
                  Purpose & Challenges
                </a>
              </li>
              <li>
                <a
                  href="#objectives"
                  onClick={(e) => handleScrollTo(e, "objectives")}
                  className="hover:text-[#1E3E6B] transition-colors"
                >
                  Project Objectives
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => handleScrollTo(e, "about")}
                  className="hover:text-[#1E3E6B] transition-colors"
                >
                  About AIRIS
                </a>
              </li>
              <li>
                <a
                  href="#download"
                  onClick={(e) => handleScrollTo(e, "download")}
                  className="hover:text-[#1E3E6B] transition-colors"
                >
                  Download Application
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Institutional Contact & Governance */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E3E6B]">
              Contact & Inquiries
            </h4>
            
            <div className="space-y-2">
              <a
                href="mailto:mdaespela@tip.edu.ph"
                className="inline-flex items-center gap-2 text-xs text-[#1E3E6B] font-semibold hover:text-[#F59E73] transition-colors"
              >
                <Mail size={14} className="text-[#5F7E97]" />
                <span>mdaespela@tip.edu.ph</span>
              </a>
              <p className="text-[11px] text-[#5F7E97] leading-relaxed">
                Direct project lead contact for capstone evaluations, staging access, and academic queries.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/privacy"
                className="inline-flex items-center gap-1.5 text-xs text-[#5F7E97] hover:text-[#1E3E6B] transition-colors"
              >
                <Shield size={13} />
                <span>Institutional Privacy Notice</span>
              </Link>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Discreet Admin Link */}
        <div className="pt-8 border-t border-[#DCE6EE] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[#5F7E97] text-center sm:text-left">
            © {currentYear} AIRIS. Academic Capstone Project, Technological Institute of the Philippines - Manila.
            All rights reserved.
          </p>

          {/* Discreet Administrator Login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F7E97] hover:text-[#1E3E6B] py-1 px-2.5 rounded-lg hover:bg-[#E7EFF5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3E6B]"
            aria-label="Administrator Portal Login"
          >
            <Lock size={12} className="text-[#5F7E97]" />
            <span>Administrator Login</span>
          </Link>
        </div>

      </div>
    </footer>
  );
}
