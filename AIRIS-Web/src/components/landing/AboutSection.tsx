"use client";

import React from "react";
import { Building2, Layers, Shield, Cpu } from "lucide-react";

export function AboutSection() {
  const capabilities = [
    {
      icon: Layers,
      title: "Dual Resume Ingestion",
      description:
        "Supports both digital document uploads (PDF, DOCX) and live camera image capture with on-device OCR, feeding a consistent evaluation pipeline.",
    },
    {
      icon: Cpu,
      title: "Objective ATS Evaluation",
      description:
        "Evaluates candidate resumes across four criteria: Skills Match, Education Relevance, Experience & Internship, and Certifications.",
    },
    {
      icon: Building2,
      title: "3D Virtual Simulation",
      description:
        "Provides an interactive, low-anxiety 3D mock interview environment where students practice structured spoken responses before entering actual interviews.",
    },
    {
      icon: Shield,
      title: "Grounded Career Guidance",
      description:
        "Identifies genuine candidate competency gaps against target roles and delivers focused, practical recommendations without hallucinated requirements.",
    },
  ];

  return (
    <section id="about" className="py-20 bg-[#E7EFF5]/40 border-t border-[#DCE6EE]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Context & Overview */}
          <div className="lg:col-span-5 space-y-5">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F59E73]">
              About the Project
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E3E6B] tracking-tight leading-tight">
              An Academic Capstone Platform at T.I.P. Manila
            </h2>
            
            <div className="space-y-4 text-sm text-[#5F7E97] leading-relaxed">
              <p>
                <strong>AIRIS</strong> stands for <em>AI-Assisted Resume Analysis and Interview Simulation</em>.
                The system was conceptualized and engineered as an academic capstone initiative at the
                <strong> Technological Institute of the Philippines - Manila</strong>, focusing initially on the
                employability preparation needs of graduating students.
              </p>
              <p>
                By combining conversational simulation with automated resume diagnostics, AIRIS provides
                graduating seniors and recent alumni with an accessible, objective tool to identify preparation
                gaps before applying to competitive entry-level positions.
              </p>
              <p className="text-xs bg-white p-3.5 rounded-xl border border-[#DCE6EE]">
                <strong className="text-[#1E3E6B]">Institutional Context:</strong> Initially implemented and evaluated
                within the academic environment of T.I.P. Manila to support student transition from higher education
                to professional employment.
              </p>
            </div>
          </div>

          {/* Right Column: Key Technical Capabilities */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-5 border border-[#DCE6EE] space-y-3 shadow-sm hover:border-[#79D5C8] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#E7EFF5] border border-[#DCE6EE] flex items-center justify-center text-[#1E3E6B]">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-[#1E3E6B] tracking-tight">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-[#5F7E97] leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
