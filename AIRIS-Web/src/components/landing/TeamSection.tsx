"use client";

import React from "react";
import { UserCheck } from "lucide-react";

export function TeamSection() {
  const developers = [
    {
      id: "dev_1",
      name: "Justine V. De Leon",
      role: "Project Manager",
      affiliation: "T.I.P. Manila",
      image: "/justine.jpg"
    },
    {
      id: "dev_2",
      name: "Alexa Nicole N. Dela Cruz",
      role: "UI/UX Designer & Unity Developer",
      affiliation: "T.I.P. Manila",
      image: "/delacruz.jpg"
    },
    {
      id: "dev_3",
      name: "Daniel Aaron T. Espela",
      role: "Lead Mobile Developer",
      affiliation: "T.I.P. Manila",
      image: "/espela.png"
    },
    {
      id: "dev_4",
      name: "Josh Michael Fangonilo",
      role: "UI/UX Designer & Integration Specialist",
      affiliation: "T.I.P. Manila",
      image: "/josh.png"
    },
  ];

  return (
    <section id="team" className="py-20 bg-white border-t border-[#DCE6EE]/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F59E73]">
            Capstone Team
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E3E6B] tracking-tight">
            Project Developers
          </h2>
          <p className="text-sm text-[#5F7E97] leading-relaxed">
            AIRIS was engineered by a team of four undergraduate developers at the
            Technological Institute of the Philippines - Manila.
          </p>
        </div>

        {/* 4 Compact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {developers.map((dev) => (
            <div
              key={dev.id}
              className="bg-[#E7EFF5]/30 rounded-2xl p-5 border border-[#DCE6EE] text-center space-y-3 hover:border-[#1E3E6B]/30 transition-all"
            >
              {/* Neutral Academic Avatar */}
              <div className="w-16 h-16 rounded-full bg-white border border-[#DCE6EE] mx-auto overflow-hidden shadow-sm">
                <img
                  src={dev.image}
                  alt={dev.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Identity & Scope */}
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1E3E6B]">
                  {dev.name}
                </h3>
                <p className="text-xs font-medium text-[#5F7E97]">
                  {dev.role}
                </p>
              </div>

              {/* Affiliation Tag */}
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-[#DCE6EE] text-[#1E3E6B]">
                {dev.affiliation}
              </span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
