"use client";

import React from "react";
import { MessageSquare, CheckCircle, FileText, Compass } from "lucide-react";

export function PurposeSection() {
  const challenges = [
    {
      icon: MessageSquare,
      title: "Interview Preparation",
      description:
        "Provides fresh graduates with an interactive 3D NPC-based environment to practice realistic job interview scenarios in a low-stakes, self-paced setting.",
    },
    {
      icon: CheckCircle,
      title: "Response Assessment & Feedback",
      description:
        "Evaluates interview responses across semantic correctness, communication clarity, and holistic delivery, generating structured feedback to guide improvement.",
    },
    {
      icon: FileText,
      title: "Resume Quality & Evaluation",
      description:
        "Analyzes resume structure and content against target job requirements, examining skills match, education relevance, experience, and certifications.",
    },
    {
      icon: Compass,
      title: "Personalized Career Recommendations",
      description:
        "Compares candidate evidence with benchmark job competencies to identify genuine skill gaps and recommend actionable learning resources.",
    },
  ];

  return (
    <section id="purpose" className="py-20 bg-[#E7EFF5]/40 border-y border-[#DCE6EE]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F59E73]">
            Employability Challenges
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E3E6B] tracking-tight">
            Addressing Key Graduate Preparation Needs
          </h2>
          <p className="text-sm text-[#5F7E97] leading-relaxed">
            AIRIS addresses critical preparation barriers faced by fresh graduates entering the workforce,
            integrating simulation, assessment, and guidance into one platform.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-[#DCE6EE] shadow-sm hover:border-[#79D5C8] transition-all space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-[#E7EFF5] border border-[#DCE6EE] flex items-center justify-center text-[#1E3E6B]">
                  <Icon size={24} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-[#1E3E6B] tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#5F7E97] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
