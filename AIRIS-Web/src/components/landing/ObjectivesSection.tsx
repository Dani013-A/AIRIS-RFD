"use client";

import React from "react";
import { MonitorPlay, BrainCircuit, FileSearch } from "lucide-react";

export function ObjectivesSection() {
  const objectives = [
    {
      number: "01",
      icon: FileSearch,
      title: "Evidence-Based Resume Analysis Module",
      manuscriptText:
        "Develop a Resume Analysis module that evaluates resume content and provides recommendations to help users improve resume quality.",
      focus: "ATS criteria evaluation and gap-driven career recommendations.",
    },
    {
      number: "02",
      icon: MonitorPlay,
      title: "Interview Simulation Virtual Environment",
      manuscriptText:
        "Develop an interview simulation virtual environment that allows graduating students and job seekers to practice job interview scenarios through a 3D NPC-based environment.",
      focus: "Realistic 3D interview environment and scenario-based question sets.",
    },
    {
      number: "03",
      icon: BrainCircuit,
      title: "AI-Powered Interview Assessment Module",
      manuscriptText:
        "Develop an AI-powered Interview Assessment module that evaluates interview responses based on Semantic Correctness, Communication Clarity, and AI Holistic Evaluation, and generates feedback to support performance improvement.",
      focus: "Multi-dimensional response scoring and constructive actionable guidance.",
    },
  ];

  return (
    <section id="objectives" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F59E73]">
            Research & Development
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E3E6B] tracking-tight">
            Project Objectives
          </h2>
          <p className="text-sm text-[#5F7E97] leading-relaxed">
            The platform architecture was designed around three specific objectives established in the
            AIRIS project manuscript to deliver an end-to-end employability preparation system.
          </p>
        </div>

        {/* Objectives Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {objectives.map((obj, idx) => {
            const Icon = obj.icon;
            return (
              <div
                key={idx}
                className="flex flex-col justify-between bg-[#E7EFF5]/30 rounded-2xl p-6 sm:p-7 border border-[#DCE6EE] hover:border-[#1E3E6B]/30 transition-all space-y-6"
              >
                <div className="space-y-4">
                  {/* Top Bar: Number & Icon */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#5F7E97] px-2.5 py-1 rounded-md bg-white border border-[#DCE6EE]">
                      Objective {obj.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#DCE6EE] flex items-center justify-center text-[#1E3E6B]">
                      <Icon size={20} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-[#1E3E6B] tracking-tight">
                    {obj.title}
                  </h3>

                  {/* Authoritative Manuscript Formulation */}
                  <blockquote className="text-sm text-[#5F7E97] leading-relaxed italic border-l-2 border-[#F59E73] pl-3 py-0.5">
                    &quot;{obj.manuscriptText}&quot;
                  </blockquote>
                </div>

                {/* Scope Note */}
                <div className="pt-4 border-t border-[#DCE6EE]/60 text-xs text-[#5F7E97]">
                  <strong className="text-[#1E3E6B]">Core Scope:</strong> {obj.focus}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
