"use client";

import React, { useState } from "react";
import { ArrowDownToLine, Smartphone, Info, Mail, AlertCircle, X } from "lucide-react";

export function DownloadSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const downloadUrl =
    process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL ||
    "https://admin.18-143-33-249.sslip.io/download/AIRIS.apk";
  const isDownloadConfigured = true;

  const handleDownloadClick = (e: React.MouseEvent) => {
    if (!isDownloadConfigured) {
      e.preventDefault();
      setModalOpen(true);
    }
  };

  return (
    <section id="download" className="py-20 bg-[#E7EFF5]/40 border-t border-[#DCE6EE]/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Card */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#DCE6EE] shadow-sm text-center space-y-8">
          
          {/* Header */}
          <div className="space-y-3 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-[#E7EFF5] border border-[#DCE6EE] text-[#1E3E6B]">
              <Smartphone size={15} />
              <span>Mobile Application</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#1E3E6B] tracking-tight">
              Access the AIRIS Mobile App
            </h2>

            <p className="text-sm text-[#5F7E97] leading-relaxed">
              Designed for Android mobile devices. Practice 3D virtual job interviews and analyze your resume
              directly on your smartphone.
            </p>
          </div>

          {/* Status Box */}
          <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#E7EFF5]/50 border border-[#DCE6EE] text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1E3E6B]">Distribution Status</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Standalone Release APK
              </span>
            </div>

            <p className="text-xs text-[#5F7E97] leading-relaxed">
              The production standalone Android APK is available for direct installation. Scan the QR code below with your mobile device or download directly.
            </p>
          </div>

          {/* QR Code & Direct Download Action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 max-w-xl mx-auto p-6 rounded-3xl bg-[#F8FAFC] border border-[#DCE6EE]">
            {/* QR Card */}
            <div className="flex flex-col items-center space-y-2 shrink-0">
              <div className="p-3 bg-white rounded-2xl border border-[#DCE6EE] shadow-sm">
                <img
                  src="/airis-apk-qr.svg"
                  alt="Scan QR code to download AIRIS Android APK"
                  width={160}
                  height={160}
                  className="w-40 h-40 object-contain"
                />
              </div>
              <span className="text-[11px] font-semibold text-[#5F7E97]">
                Scan to Download APK
              </span>
            </div>

            {/* Direct Download Details */}
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E3E6B]">
                  Direct APK Installation
                </span>
                <p className="text-xs text-[#5F7E97] leading-relaxed">
                  Fast direct download for student devices and faculty evaluators.
                </p>
              </div>

              <a
                href={downloadUrl}
                download="AIRIS.apk"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-[#F59E73] hover:bg-[#e58d63] shadow-md shadow-[#F59E73]/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F59E73]"
              >
                <ArrowDownToLine size={18} />
                <span>Download Android APK</span>
              </a>

              <span className="text-[11px] text-[#5F7E97]">
                Standalone Release APK • Android 10+
              </span>
            </div>
          </div>

          {/* Institutional Note */}
          <p className="text-xs text-[#5F7E97]">
            Institutional evaluators and students requesting manual staging builds may contact{" "}
            <a
              href="mailto:mdaespela@tip.edu.ph"
              className="font-semibold text-[#1E3E6B] underline hover:text-[#F59E73]"
            >
              mdaespela@tip.edu.ph
            </a>
            .
          </p>

        </div>

      </div>

      {/* Informative Status Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="download-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-[#DCE6EE] shadow-2xl space-y-6 relative">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-[#5F7E97] hover:text-[#1E3E6B] hover:bg-[#E7EFF5] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3E6B]"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div className="space-y-1">
                <h3 id="download-modal-title" className="text-lg font-bold text-[#1E3E6B]">
                  Application Deployment Status
                </h3>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                  Android App: Coming Soon
                </span>
              </div>
            </div>

            {/* Structured Explanation */}
            <div className="space-y-3.5 text-xs text-[#5F7E97] leading-relaxed border-t border-b border-[#E7EFF5] py-4">
              <div>
                <strong className="text-[#1E3E6B] block mb-0.5">What is the current status?</strong>
                The public direct download is currently paused while the release package completes
                capstone evaluation and institutional testing at Technological Institute of the Philippines - Manila.
              </div>

              <div>
                <strong className="text-[#1E3E6B] block mb-0.5">Why is it not immediately downloadable?</strong>
                AIRIS requires institutional student credentials (@tip.edu.ph) and backend SBERT service
                synchronization during evaluation periods to ensure data isolation.
              </div>

              <div>
                <strong className="text-[#1E3E6B] block mb-0.5">How can evaluators obtain access?</strong>
                Faculty evaluators or authorized student testers requiring an APK staging package may
                request distribution directly via email.
              </div>
            </div>

            {/* Contact Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <a
                href="mailto:danielespela251@gmail.com?subject=AIRIS%20Mobile%20APK%20Inquiry"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#1E3E6B] hover:bg-[#152c4d] transition-all"
              >
                <Mail size={14} />
                <span>Email the AIRIS team</span>
              </a>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#F4A47A] hover:bg-[#E89268] transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
