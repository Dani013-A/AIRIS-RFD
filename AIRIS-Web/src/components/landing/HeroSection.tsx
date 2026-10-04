"use client";

import React from "react";
import { ArrowDownToLine, ChevronRight, GraduationCap, ShieldCheck } from "lucide-react";

export function HeroSection() {
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="home"
      className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-gradient-to-b from-[#E7EFF5]/40 via-white to-white"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading & Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Institutional Context Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7EFF5] border border-[#DCE6EE] text-xs font-semibold text-[#1E3E6B]">
              <GraduationCap size={15} className="text-[#5F7E97]" />
              <span>Technological Institute of the Philippines - Manila</span>
            </div>

            {/* Platform Acronym & Full Name */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#1E3E6B] leading-[1.1]">
                AIRIS
              </h1>
              <p className="text-lg sm:text-xl font-bold text-[#5F7E97] leading-snug">
                AI-Assisted Resume Analysis and Interview Simulation Platform for Fresh Graduates
              </p>
            </div>

            {/* Grounded Manuscript Purpose Statement */}
            <p className="text-base text-[#5F7E97] font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              Developed to support graduating students and job seekers in their transition into the workforce.
              AIRIS integrates virtual interview simulation, objective multi-factor response evaluation,
              and evidence-based resume analysis into a unified employability preparation environment.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <a
                href="#download"
                onClick={(e) => handleScrollTo(e, "download")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[#F59E73] hover:bg-[#e58d63] shadow-md shadow-[#F59E73]/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F59E73]"
              >
                <ArrowDownToLine size={18} />
                <span>Download Application</span>
              </a>

              <a
                href="#about"
                onClick={(e) => handleScrollTo(e, "about")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-[#1E3E6B] bg-white hover:bg-[#E7EFF5] border border-[#DCE6EE] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1E3E6B]"
              >
                <span>About the Platform</span>
                <ChevronRight size={16} />
              </a>
            </div>

            {/* Non-overclaiming Disclaimer Note */}
            <div className="flex items-center justify-center lg:justify-start gap-2 pt-2 text-xs text-[#5F7E97]">
              <ShieldCheck size={14} className="text-[#79D5C8]" />
              <span>Academic capstone initiative designed for preparation guidance and skills development.</span>
            </div>
          </div>

          {/* Right Column: Visual Interface Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md">
              {/* Decorative Subtle Backdrop */}
              <div className="absolute -inset-2 bg-gradient-to-tr from-[#79D5C8]/20 via-[#E7EFF5] to-[#F59E73]/20 rounded-3xl blur-lg opacity-60 -z-10" />

              {/* Card Shell */}
              <div className="bg-white rounded-3xl border border-[#DCE6EE] p-3 shadow-xl overflow-hidden">
                <div className="relative rounded-2xl overflow-hidden bg-[#1E3E6B]/5 aspect-[4/5] flex items-center justify-center">
                  <img
                    src="/airis-logo-final.png"
                    alt="AIRIS Mobile Application Interface Preview"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-[#E7EFF5] shadow-sm">
                    <p className="text-xs font-bold text-[#1E3E6B]">Mobile Readiness Suite</p>
                    <p className="text-[11px] text-[#5F7E97] mt-0.5">
                      Interview simulation and resume analysis tailored for TIP Manila graduates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
