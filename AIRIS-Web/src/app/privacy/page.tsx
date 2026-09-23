"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { useAuthStore } from "../../store/authStore";
import { Shield, Eye, Lock, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const { currentAdmin, initialized } = useAuthStore();

  const sections = [
    {
      title: "1. Privacy Notice & Data Collection Scope",
      icon: Eye,
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
      icon: Shield,
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
      icon: Lock,
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
      icon: RefreshCw,
      badge: "Consent Verification",
      summary: "Students explicitly grant consent during initial app onboarding and retain the right to request data erasure.",
      details: [
        "Onboarding Consent: Students confirm explicit consent for document parsing and AI feedback generation upon initial sign-in.",
        "Consent Revocation: A student may request account erasure at any time by contacting campus administration.",
        "Audit Logging: All account state modifications, suspensions, and deletion events are permanently logged in the Security Audit Registry.",
      ],
    },
  ];

  const content = (
    <div className="space-y-6 text-[#1E3E6B]">
      {!currentAdmin && (
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-slate hover:text-brand-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg py-1 px-1 -ml-1 group"
            aria-label="Back to Public Landing Page"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Data Privacy & Governance Controls</h1>
          <p className="text-sm font-semibold text-brand-slate mt-0.5">
            Review institutional data privacy standards, student consent frameworks, and data retention controls.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 shrink-0">
          <CheckCircle2 size={16} className="text-brand-primary" /> Privacy & Governance Controls Configured
        </div>
      </div>

      {/* Policy Sections Grid */}
      <div className="grid grid-cols-1 gap-4">
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          const isExpanded = expandedSection === idx;

          return (
            <div
              key={idx}
              className="figma-card p-5 md:p-6 bg-white space-y-4 border border-gray-200 transition-all"
            >
              {/* Responsive Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 md:h-11 md:w-11 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm md:text-base font-black text-[#1E3E6B] leading-tight">{sec.title}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                        {sec.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-brand-slate leading-relaxed">{sec.summary}</p>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedSection(isExpanded ? null : idx)}
                  className="p-2 text-brand-slate hover:text-brand-primary cursor-pointer transition-colors shrink-0 rounded-xl bg-gray-50 border border-gray-200"
                  aria-label="Toggle section details"
                >
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="pt-4 border-t border-gray-100 space-y-2.5 text-xs font-semibold text-brand-slate">
                  <ul className="space-y-2">
                    {sec.details.map((item, dIdx) => (
                      <li key={dIdx} className="flex items-start gap-2.5 bg-gray-50/80 p-3 rounded-xl border border-gray-200">
                        <CheckCircle2 size={15} className="text-brand-primary shrink-0 mt-0.5" />
                        <span className="leading-relaxed text-xs">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (currentAdmin) {
    return <DashboardLayout>{content}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">{content}</div>
    </div>
  );
}
