"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Shield, GraduationCap, X, CheckCircle2 } from "lucide-react";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  const institutionalSections = [
    {
      title: "1. Privacy Notice & Data Collection Scope",
      badge: "Institutional Data Isolation",
      summary: "AIRIS collects student profile metadata, degree program tracks, and uploaded resume text solely to evaluate employability readiness.",
      details: [
        "Data Collection: Student name, institutional @tip.edu.ph email, degree program, target career position, and resume text.",
        "Processing Scope: Resume ATS parsing, competency gap detection, mock interview audio transcript evaluation, and personalized course recommendations.",
        "Third-Party Sharing: No student data, email addresses, or resume contents are sold, commercialized, or shared with external data brokers.",
        "Access Controls: Data is stored securely in Firebase Cloud Firestore and is accessible only to authorized student account owners and campus administrators.",
      ],
    },
    {
      title: "2. Terms of Service & Acceptable Use",
      badge: "Campus Governance",
      summary: "Access is granted exclusively to Technological Institute of the Philippines students and authorized staff.",
      details: [
        "Authentication Rule: Access requires a verified @tip.edu.ph email account via Firebase Authentication.",
        "Acceptable Use: Uploaded documents must represent standard academic or professional resumes. Uploading malicious file formats or fraudulent documents is strictly prohibited.",
        "Account Enforcement: Campus administrators reserve the right to temporarily disable or permanently remove non-compliant accounts.",
        "AI Output Disclaimer: Evaluation scores and learning recommendations serve as guidance tools for career preparation and do not guarantee immediate job placement.",
      ],
    },
    {
      title: "3. Data Retention & Erasure Policies",
      badge: "Account Erasure Protocol",
      summary: "Student evaluation data is retained securely during enrollment and permanently scrubbed upon account deletion.",
      details: [
        "Retention Period: Profile data and evaluation history are retained for the duration of the student's active enrollment.",
        "Account Deletion Behavior: When an administrator permanently deletes a student account, all associated user documents, resume version records, analysis evaluations, and mock interview transcripts are purged from Firestore.",
        "Storage Cleanup: Uploaded resume documents and cached audio files are scrubbed from Firebase Storage upon deletion.",
      ],
    },
    {
      title: "4. Student Consent & Revocation Controls",
      badge: "Consent Verification",
      summary: "Students explicitly grant consent during initial app onboarding and retain the right to request data erasure.",
      details: [
        "Onboarding Consent: Students confirm explicit consent for document parsing and AI feedback generation upon initial sign-in.",
        "Consent Revocation: A student may request account erasure at any time by contacting campus administration.",
        "Audit Logging: All account state modifications, suspensions, and deletion events are permanently logged in the Security Audit Registry.",
      ],
    },
  ];

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
                  src="/airis-logo-final.png"
                  alt="AIRIS Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-black tracking-tight text-[#1E3E6B]">
                AIRIS
              </span>
            </div>

            <p className="text-sm font-semibold text-[#1E3E6B]">
              AI-Assisted Resume Analysis and Interview Simulation Platform for Graduating Students
            </p>

            <p className="text-xs text-[#5F7E97] leading-relaxed max-w-md">
              Developed as an undergraduate academic capstone research project at the
              Technological Institute of the Philippines - Manila to support graduating seniors
              and graduating students in career preparation.
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
                href="mailto:danielespela251@gmail.com"
                className="inline-flex items-center gap-2 text-xs text-[#1E3E6B] font-semibold hover:text-[#F59E73] transition-colors"
              >
                <Mail size={14} className="text-[#5F7E97]" />
                <span>Email the AIRIS team</span>
              </a>
              <a href="https://www.facebook.com/daniiiii007/" target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-[#1E3E6B] hover:text-[#F59E73]">AIRIS project Facebook</a>
              <a href="https://www.facebook.com/TIPCareerCenter" target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-[#1E3E6B] hover:text-[#F59E73]">T.I.P. Career Center Facebook</a>
              <p className="text-[11px] text-[#5F7E97] leading-relaxed">
                Project and career-center contact for questions about AIRIS.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-[#5F7E97] hover:text-[#1E3E6B] transition-colors cursor-pointer"
              >
                <Shield size={13} />
                <span>Institutional Privacy Notice</span>
              </button>
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

      {/* Institutional Privacy Notice Modal */}
      {isPrivacyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="institutional-privacy-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-[#DCE6EE] shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[#5F7E97] hover:text-[#1E3E6B] hover:bg-[#E7EFF5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3E6B]"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4 pr-10 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-[#E7EFF5] border border-[#DCE6EE] flex items-center justify-center text-[#1E3E6B] shrink-0">
                <Shield size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F7E97]">
                    Technological Institute of the Philippines - Manila
                  </span>
                </div>
                <h3 id="institutional-privacy-title" className="text-xl font-bold text-[#1E3E6B]">
                  Institutional Privacy Notice & Governance Controls
                </h3>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto space-y-4 pr-1 text-left flex-1 border-t border-b border-[#E7EFF5] py-4">
              <p className="text-xs text-[#5F7E97] leading-relaxed">
                This notice outlines the institutional data governance, privacy standards, and student data protection policies governing the AIRIS platform for academic research and career readiness evaluation.
              </p>

              <div className="space-y-4">
                {institutionalSections.map((sec, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#1E3E6B]">{sec.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7EFF5] text-[#1E3E6B] border border-[#DCE6EE]">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#5F7E97] font-medium leading-relaxed">
                      {sec.summary}
                    </p>
                    <ul className="space-y-1.5 pt-1">
                      {sec.details.map((detail, dIdx) => (
                        <li key={dIdx} className="text-[11px] text-[#475569] leading-relaxed flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-[#1E3E6B] shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 shrink-0">
              <span className="text-[11px] text-[#5F7E97]">
                Institutional Inquiries:{" "}
                <a href="mailto:mdaespela@tip.edu.ph" className="font-semibold text-[#1E3E6B] underline">
                  mdaespela@tip.edu.ph
                </a>
              </span>

              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#1E3E6B] hover:bg-[#152c4d] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3E6B]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
