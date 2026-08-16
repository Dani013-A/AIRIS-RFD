"use client";

import React from "react";
import { DashboardLayout } from "../../components/layouts/DashboardLayout";
import { Shield, Eye, Lock, RefreshCw } from "lucide-react";

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Privacy Notice & Data Collection",
      icon: Eye,
      content:
        "AIRIS collects student profile data (full name, TIP email address, degree program track, target career choices) and uploaded resume documents. This data is exclusively processed to calculate ATS formatting compatibility, resume keyword matching scores, and generate learning recommendation links. No private student data is sold or shared with external third-party aggregators.",
    },
    {
      title: "2. Terms of Service & Acceptable Use",
      icon: Shield,
      content:
        "Students access the platform via their TIP institutional email credentials. Acceptable usage requires that all uploaded documents represent standard professional resumes. Access can be suspended or disabled by campus administrators if malicious file formats or fraudulent resume listings are uploaded.",
    },
    {
      title: "3. Data Retention & Erasure Policies",
      icon: Lock,
      content:
        "Student resume records, parsed document segments, and AI evaluation feedback are stored securely in Firestore. If a student account is deleted by an administrator, all associated resume subcollections, file cache records, and evaluations are permanently scrubbed from our database instances.",
    },
    {
      title: "4. Student Consent & Revocation",
      icon: RefreshCw,
      content:
        "By completing the onboarding phase inside the AIRIS Mobile app, students provide explicit consent for processing their resume text. A student can request account erasure at any time, which requires admin confirmation to remove their profile metadata.",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 text-[#1E3E6B]">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Data Privacy & Compliance</h1>
          <p className="text-xs font-bold text-brand-slate mt-0.5">Review student consent clauses, privacy policies, and system terms of service.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((sec, idx) => {
            const Icon = sec.icon;
            return (
              <div
                key={idx}
                className="figma-card bg-white p-6 space-y-4"
              >
                <div className="flex items-center gap-3 text-brand-primary">
                  <div className="p-2.5 bg-brand-primary/5 rounded-xl text-[#F59E73]">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-xs font-extrabold">{sec.title}</h3>
                </div>
                <p className="text-xs font-semibold text-justify text-brand-slate leading-relaxed">
                  {sec.content}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
