import React from "react";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { HeroSection } from "../components/landing/HeroSection";
import { PurposeSection } from "../components/landing/PurposeSection";
import { ObjectivesSection } from "../components/landing/ObjectivesSection";
import { AboutSection } from "../components/landing/AboutSection";
import { TeamSection } from "../components/landing/TeamSection";
import { DownloadSection } from "../components/landing/DownloadSection";
import { LandingFooter } from "../components/landing/LandingFooter";

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1E3E6B] font-sans selection:bg-[#F59E73]/20 selection:text-[#1E3E6B]">
      <LandingNavbar />
      <main id="main-content" className="flex-1">
        <HeroSection />
        <PurposeSection />
        <ObjectivesSection />
        <AboutSection />
        <TeamSection />
        <DownloadSection />
      </main>
      <LandingFooter />
    </div>
  );
}
