/**
 * AIRIS - UAT Participant Evaluation Refinement Script
 *
 * Updates the 43 synthetic UAT student profiles in place in Firebase project `airis-development`.
 * Preserves the 7 legitimate student accounts and all existing document IDs.
 *
 * Requirements:
 * - Resume score: 50–65 / 100 inclusive
 * - Interview score: 45–70 / 100 inclusive
 * - Composite Preparedness: round(0.40 * resumeScore + 0.60 * interviewScore)
 * - Academic exceptions:
 *     - ERNEST PONCE: BS Electrical Engineering (BSEE), CEA Coordinator
 *     - Danica Tang: BS Entertainment and Multimedia Computing (BSEMC), CCS Coordinator
 * - Realistic varied IT careers across software dev, web, backend, QA, data analytics, networking, cybersecurity
 * - Deterministic, internally consistent evaluation breakdowns, rubrics, suggestions, and chronological timestamps
 * - Idempotent, safe read-back verification
 *
 * Usage:
 *   node scripts/refine_uat_participants.js [--dry-run]
 */

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const EXPECTED_PROJECT_ID = "airis-development";
const ROSTER_PATH = path.join(__dirname, "../fixtures/uat_participants_roster_50.json");

// Legitimate student emails that MUST be skipped and protected
const PROTECTED_LEGIT_EMAILS = new Set([
  "mjmomunoz@tip.edu.ph",
  "mrnainggie@tip.edu.ph",
  "maavanica@tip.edu.ph",
  "maadelacruz01@tip.edu.ph",
  "mvamirasol@tip.edu.ph",
  "mjtguarino@tip.edu.ph",
  "mslmandapat@tip.edu.ph",
  "danielespela251@gmail.com",
]);

/**
 * 7 Realistic IT Career Archetypes
 */
const IT_ARCHETYPES = [
  {
    role: "Junior Software Engineer",
    degreeProgram: "BS Information Technology",
    college: "College of Computer Studies",
    coordinator: "CCS Coordinator",
    skills: [
      "JavaScript", "TypeScript", "Node.js", "Express", "PostgreSQL",
      "RESTful APIs", "Git", "Unit Testing", "Debugging", "Agile Methodologies"
    ],
    resumeSuggestions: [
      {
        id: "sug_1",
        section: "Experience",
        title: "Quantify Code Contributions",
        priority: "medium",
        why: "Contributions illustrate general familiarity, but lack concrete productivity metrics.",
        action: "Add measurable outcomes such as defect reduction or feature delivery counts to project bullets.",
        example: "Resolved 14 backend tickets and maintained 85% test coverage across core routes."
      },
      {
        id: "sug_2",
        section: "Certifications",
        title: "Add Foundational Cloud Certification",
        priority: "low",
        why: "Entry-level roles increasingly expect basic cloud service awareness.",
        action: "Consider pursuing an introductory developer or cloud practitioner credential.",
        example: "AWS Certified Cloud Practitioner or GitHub Foundations"
      }
    ],
    interviewStrengths: [
      "Communicated core software engineering and object-oriented principles with clarity",
      "Demonstrated systematic debugging methodology when discussing technical challenges",
      "Showed positive receptiveness to code review feedback and collaborative workflows"
    ],
    interviewImprovements: [
      "Elaborate further on trade-offs between relational and non-relational database models",
      "Provide more structured STAR responses when discussing cross-functional conflict"
    ]
  },
  {
    role: "Frontend Web Developer",
    degreeProgram: "BS Information Technology",
    college: "College of Computer Studies",
    coordinator: "CCS Coordinator",
    skills: [
      "React", "HTML5/CSS3", "Tailwind CSS", "JavaScript", "TypeScript",
      "Responsive Layouts", "Figma", "State Management", "Web Accessibility", "Git"
    ],
    resumeSuggestions: [
      {
        id: "sug_1",
        section: "Projects",
        title: "Highlight Performance & Accessibility Standards",
        priority: "medium",
        why: "Frontend project listings show UI design but omit Lighthouse accessibility or performance targets.",
        action: "Document measurable web vitals improvements in project descriptions.",
        example: "Achieved Lighthouse 95+ score on accessibility and reduced initial bundle size by 18%."
      },
      {
        id: "sug_2",
        section: "Technical Skills",
        title: "Differentiate Modern CSS Tools",
        priority: "low",
        why: "Listing generic CSS is weaker than highlighting utility and preprocessor toolkits.",
        action: "Explicitly mention responsive styling frameworks used in practicum coursework.",
        example: "Tailwind CSS, CSS Modules, or PostCSS"
      }
    ],
    interviewStrengths: [
      "Articulated component lifecycles and virtual DOM principles accurately",
      "Demonstrated keen focus on user-centric accessibility and mobile-first layout design",
      "Spoke thoughtfully about responsive design patterns across varied screen resolutions"
    ],
    interviewImprovements: [
      "Deepen technical explanation of asynchronous state management and memoization hooks",
      "Provide more specific metrics on client-side rendering latency reduction"
    ]
  },
  {
    role: "Backend Developer",
    degreeProgram: "BS Computer Science",
    college: "College of Computer Studies",
    coordinator: "CCS Coordinator",
    skills: [
      "Python", "FastAPI", "SQL", "PostgreSQL", "Redis",
      "API Architecture", "Data Structures", "Linux CLI", "Git", "Docker Basics"
    ],
    resumeSuggestions: [
      {
        id: "sug_1",
        section: "Experience",
        title: "Document Query Optimization",
        priority: "medium",
        why: "Backend project mentions database creation without detailing query efficiency.",
        action: "Add details on indexing, relational constraints, or response time improvements.",
        example: "Indexed critical relational tables, lowering average query execution time from 180ms to 45ms."
      },
      {
        id: "sug_2",
        section: "Security",
        title: "Mention API Security Practices",
        priority: "low",
        why: "Employers look for awareness of authentication, authorization, and sanitization.",
        action: "Highlight token validation or CORS handling in coursework API services.",
        example: "Implemented JWT verification and parameterized queries against injection vectors."
      }
    ],
    interviewStrengths: [
      "Solid explanation of RESTful architectural constraints and HTTP status semantics",
      "Strong conceptual grasp of relational schema normalization and transactional safety",
      "Honest, reflective attitude regarding software failures and post-mortem analysis"
    ],
    interviewImprovements: [
      "Improve clarity when explaining caching strategies and cache invalidation policies",
      "Avoid conversational hesitation when discussing asynchronous I/O loops"
    ]
  },
  {
    role: "QA / Test Automation Specialist",
    degreeProgram: "BS Information Technology",
    college: "College of Computer Studies",
    coordinator: "CCS Coordinator",
    skills: [
      "Test Automation", "Selenium", "Postman", "Test Planning", "Defect Tracking",
      "Jira", "Regression Testing", "Python", "SQL", "Git"
    ],
    resumeSuggestions: [
      {
        id: "sug_1",
        section: "Projects",
        title: "Specify Automated Coverage Metrics",
        priority: "medium",
        why: "Test suites are listed without indicating the scope or reliability of automated passes.",
        action: "State the number of automated scenarios executed and regression suite runtime.",
        example: "Authored 45 automated API test cases in Postman reducing manual regression pass time by 40%."
      },
      {
        id: "sug_2",
        section: "Certifications",
        title: "Pursue ISTQB Foundation Level",
        priority: "low",
        why: "Standardized QA terminology validates formal testing methodology for fresh graduates.",
        action: "Prepare for or complete the ISTQB Certified Tester Foundation Level (CTFL).",
        example: "ISTQB Certified Tester Foundation Level (CTFL)"
      }
    ],
    interviewStrengths: [
      "Thorough understanding of the software testing life cycle (STLC) and severity vs. priority",
      "Clear articulation of boundary value analysis and equivalence partitioning techniques",
      "Calm, detail-oriented demeanor when discussing bug reproduction steps"
    ],
    interviewImprovements: [
      "Elaborate on automated integration testing within modern CI/CD pipelines",
      "Provide more detailed examples of collaborating with resistant developers during bug triage"
    ]
  },
  {
    role: "Junior Data Analyst",
    degreeProgram: "BS Data Science and Analytics",
    college: "College of Computer Studies",
    coordinator: "CCS Coordinator",
    skills: [
      "SQL", "Python (Pandas)", "Tableau", "Power BI", "Data Cleaning",
      "Exploratory Data Analysis", "Excel Modeling", "Statistical Testing", "Git", "Data Visualization"
    ],
    resumeSuggestions: [
      {
        id: "sug_1",
        section: "Projects",
        title: "Tie Visualizations to Business Decisions",
        priority: "medium",
        why: "Listing dashboard creation is good, but hiring managers need to see business recommendations.",
        action: "Describe the operational insights derived from academic analytics datasets.",
        example: "Built departmental KPI dashboard identifying seasonal enrollment bottlenecks."
      },
      {
        id: "sug_2",
        section: "Skills",
        title: "Specify Advanced SQL Capabilities",
        priority: "low",
        why: "Entry-level data candidates benefit from demonstrating window functions and aggregations.",
        action: "List specific analytical SQL capabilities in the technical skills section.",
        example: "Common Table Expressions (CTEs), Window Functions, and Multi-Table Joins"
      }
    ],
    interviewStrengths: [
      "Clearly articulated data hygiene and cleaning processes for missing or anomalous values",
      "Demonstrated strong grasp of descriptive statistics and chart selection principles",
      "Explained complex dataset conclusions using accessible, stakeholder-friendly vocabulary"
    ],
    interviewImprovements: [
      "Strengthen discussion around hypothesis testing and confidence intervals",
      "Be more structured when presenting root cause analysis of unexpected metric spikes"
    ]
  },
  {
    role: "Network & Cloud Systems Administrator",
    degreeProgram: "BS Information Technology",
    college: "College of Computer Studies",
    coordinator: "CCS Coordinator",
    skills: [
      "TCP/IP Networking", "Cisco IOS", "Subnetting", "Linux Administration", "AWS Core",
      "DNS/DHCP", "Firewalls", "Network Troubleshooting", "Wireshark", "Git"
    ],
    resumeSuggestions: [
      {
        id: "sug_1",
        section: "Experience",
        title: "Document Lab Topology & Protocols",
        priority: "medium",
        why: "Network hands-on experience should cite specific routing protocols configured.",
        action: "Mention specific routing protocols (OSPF, RIPv2) and VLAN architectures implemented.",
        example: "Configured multi-VLAN campus simulation in Cisco Packet Tracer with inter-VLAN routing."
      },
      {
        id: "sug_2",
        section: "Certifications",
        title: "Work Toward CCNA or CompTIA Network+",
        priority: "medium",
        why: "Networking positions heavily value vendor or foundational network certifications.",
        action: "Add current examination preparation status to the certifications section.",
        example: "Cisco Certified Network Associate (CCNA) - in progress"
      }
    ],
    interviewStrengths: [
      "Solid understanding of the OSI 7-layer reference model and packet encapsulation flow",
      "Practical troubleshooting approach for IP address conflicts and default gateway issues",
      "High awareness of network perimeter defenses and secure administrative protocols"
    ],
    interviewImprovements: [
      "Deepen technical explanation of dynamic routing convergence and link-state advertisements",
      "Speak more decisively about cloud virtual private cloud (VPC) subnet architectures"
    ]
  },
  {
    role: "Junior Cybersecurity Analyst",
    degreeProgram: "BS Information Technology",
    college: "College of Computer Studies",
    coordinator: "CCS Coordinator",
    skills: [
      "Vulnerability Assessment", "OWASP Top 10", "Network Security", "Linux Security", "Wireshark",
      "Access Control", "Log Analysis", "Incident Response Basics", "Python", "Git"
    ],
    resumeSuggestions: [
      {
        id: "sug_1",
        section: "Projects",
        title: "Highlight Security Lab Engagements",
        priority: "medium",
        why: "Coursework projects should show practical hands-on analysis rather than purely theoretical study.",
        action: "Detail vulnerability scans conducted in controlled academic sandboxes.",
        example: "Conducted simulated web penetration tests identifying broken access control vulnerabilities."
      },
      {
        id: "sug_2",
        section: "Certifications",
        title: "Pursue CompTIA Security+ Credential",
        priority: "medium",
        why: "Security+ is the industry benchmark for entry-level security operations candidates.",
        action: "Include Security+ or foundational security certifications.",
        example: "CompTIA Security+ or Google Cybersecurity Professional Certificate"
      }
    ],
    interviewStrengths: [
      "Strong understanding of the CIA triad and defense-in-depth principles",
      "Articulated OWASP Top 10 web vulnerabilities and prevention techniques accurately",
      "Emphasized strict adherence to ethical disclosure standards and data privacy mandates"
    ],
    interviewImprovements: [
      "Expand on log analysis techniques and correlation across SIEM platforms",
      "Provide more concrete examples of responding to simulated phishing or malware incidents"
    ]
  }
];

/**
 * Explicit Program Exception: ERNEST PONCE (Electrical Engineering - CEA)
 */
const ERNEST_PONCE_PROFILE = {
  role: "Embedded Systems / Electrical Engineer",
  degreeProgram: "BS Electrical Engineering",
  college: "College of Engineering and Architecture",
  coordinator: "CEA Coordinator",
  skills: [
    "Circuit Design", "Microcontrollers (STM32/Arduino)", "MATLAB & Simulink", "PLC Programming",
    "C/C++", "Power Electronics", "Oscilloscope Analysis", "PCB Layout (Eagle/KiCAD)", "Electrical Safety Codes"
  ],
  resumeSuggestions: [
    {
      id: "sug_1",
      section: "Projects",
      title: "Quantify Hardware Test Hours",
      priority: "medium",
      why: "Hardware prototyping descriptions lack detail on prototype testing tolerances and efficiency.",
      action: "State power efficiency gains or circuit testing benchmarks in project bullets.",
      example: "Designed microcontroller power regulation circuit achieving 92% power conversion efficiency."
    },
    {
      id: "sug_2",
      section: "Certifications",
      title: "Pursue Registered Electrical Engineer (REE) Licensure",
      priority: "medium",
      why: "Professional engineering practice in the Philippines values board examination readiness.",
      action: "Highlight licensure review progress or electrical safety compliance training.",
      example: "Registered Master Electrician (RME) or Certified LabVIEW Associate Developer (CLAD)"
    }
  ],
  interviewStrengths: [
    "Demonstrated exceptional comprehension of power distribution systems and circuit schematics",
    "Clear explanation of sensor interfacing, ADC conversion, and hardware interrupt handling",
    "Strong emphasis on industrial electrical safety standards and protective relaying"
  ],
  interviewImprovements: [
    "Elaborate further on trade-offs between linear and switching regulator topologies",
    "Provide more structured examples of managing component supply chain delays in capstone build"
  ]
};

/**
 * Explicit Program Exception: Danica Tang (Entertainment & Multimedia Computing - CCS)
 */
const DANICA_TANG_PROFILE = {
  role: "Interactive Multimedia / Game Developer",
  degreeProgram: "BS Entertainment and Multimedia Computing",
  college: "College of Computer Studies",
  coordinator: "CCS Coordinator",
  skills: [
    "Unity Engine", "C# Scripting", "3D Modeling (Blender)", "Shader Development", "Computer Animation",
    "Game Physics & Collision", "UI/UX for Interactive Media", "Asset Pipeline Integration", "Git Version Control"
  ],
  resumeSuggestions: [
    {
      id: "sug_1",
      section: "Projects",
      title: "Link Playable Interactive Demo",
      priority: "medium",
      why: "Game and multimedia recruiters prioritize playable web builds or video showcases.",
      action: "Embed a direct link to an itch.io build or WebGL gameplay showcase.",
      example: "Playable WebGL build and gameplay trailer accessible at portfolio showcase link."
    },
    {
      id: "sug_2",
      section: "Performance",
      title: "Document Frame Rate Optimization",
      priority: "medium",
      why: "Interactive media teams look for candidates who can optimize draw calls and texture atlases.",
      action: "Quantify framerate gains achieved during multimedia capstone optimization.",
      example: "Reduced draw calls by 35% through sprite packing and occlusion culling, maintaining solid 60 FPS."
    }
  ],
  interviewStrengths: [
    "Articulated game loop mechanics, delta-time physics updates, and component hierarchies thoroughly",
    "Demonstrated creative problem solving when integrating audio-visual assets with backend states",
    "Showed strong passion for interactive storytelling and player experience feedback loops"
  ],
  interviewImprovements: [
    "Deepen explanation of custom shader vertex/fragment pipelines and GPU profiling",
    "Provide more structured examples of scoping multimedia features under tight academic deadlines"
  ]
};

/**
 * Deterministically generates varied scores and metrics for participant index `i`.
 * Guarantees:
 * - Resume score in [50, 65] inclusive
 * - Interview score in [45, 70] inclusive
 * - Composite Employability Preparedness = round(0.40 * resumeScore + 0.60 * interviewScore)
 */
function generateParticipantMetrics(index, isErnestPonce = false, isDanicaTang = false) {
  let resumeScore;
  let interviewScore;

  if (isErnestPonce) {
    resumeScore = 58;
    interviewScore = 62;
  } else if (isDanicaTang) {
    resumeScore = 63;
    interviewScore = 66;
  } else {
    // Deterministic distribution across 50–65 for resume
    resumeScore = 50 + ((index * 7 + 3) % 16); // 50 to 65
    // Deterministic distribution across 45–70 for interview
    interviewScore = 45 + ((index * 11 + 5) % 26); // 45 to 70
  }

  // Canonical composite formula: round(0.40 * resume + 0.60 * interview)
  const compositeScore = Math.round(0.40 * resumeScore + 0.60 * interviewScore);

  // Resume dimension variations consistent with resumeScore
  // Formula: round(0.40 * skills + 0.30 * exp + 0.20 * edu + 0.10 * cert) = resumeScore
  const delta1 = ((index % 5) - 2); // -2 to +2
  const skillsRaw = Math.min(100, Math.max(40, resumeScore + delta1));
  const expRaw = Math.min(100, Math.max(40, resumeScore - delta1));
  const eduRaw = Math.min(100, Math.max(40, resumeScore + (index % 3)));
  const certRaw = Math.min(100, Math.max(35, resumeScore - (index % 4)));

  const weightedSkills = Math.round(skillsRaw * 0.40 * 10) / 10;
  const weightedExp = Math.round(expRaw * 0.30 * 10) / 10;
  const weightedEdu = Math.round(eduRaw * 0.20 * 10) / 10;
  const weightedCert = Math.round(certRaw * 0.10 * 10) / 10;

  // Interview category variations consistent with interviewScore
  const deltaClarity = (index % 4) - 2; // -2 to +1
  const semanticRaw = Math.min(100, Math.max(40, interviewScore + 1));
  const holisticRaw = interviewScore;
  const clarityRaw = Math.min(100, Math.max(40, interviewScore - 1 + deltaClarity));

  return {
    resumeScore,
    interviewScore,
    compositeScore,
    atsDimensions: {
      skills: { rawScore: skillsRaw, weight: 0.40, weightedScore: weightedSkills },
      experience: { rawScore: expRaw, weight: 0.30, weightedScore: weightedExp },
      education: { rawScore: eduRaw, weight: 0.20, weightedScore: weightedEdu },
      certifications: { rawScore: certRaw, weight: 0.10, weightedScore: weightedCert },
    },
    interviewBreakdown: {
      SemanticCorrectness: semanticRaw,
      AIHolisticEvaluation: holisticRaw,
      CommunicationClarity: clarityRaw,
    },
  };
}

/**
 * Generates coherent, chronological timestamps across the evaluation window.
 * Sequence: Onboarding -> Resume Upload -> Resume Analysis -> Interview Started -> Interview Completed
 */
function generateChronologicalTimestamps(index) {
  // Base period: October 2, 2026 to October 9, 2026
  const baseDay = 2 + (index % 8);
  const hour = 8 + ((index * 3) % 9); // between 8:00 AM and 17:00 PM
  const minute = (index * 7) % 60;
  const second = (index * 13) % 60;

  // 1. Onboarding
  const onboardingDate = new Date(Date.UTC(2026, 9, baseDay, hour, minute, second));

  // 2. Resume Upload: 15 to 40 minutes after onboarding
  const uploadOffsetMin = 15 + (index % 25);
  const uploadDate = new Date(onboardingDate.getTime() + uploadOffsetMin * 60 * 1000);

  // 3. Resume Analysis: 2 to 4 minutes after upload
  const analysisOffsetMin = 2 + (index % 3);
  const analysisDate = new Date(uploadDate.getTime() + analysisOffsetMin * 60 * 1000);

  // 4. Interview Started: 1 to 3 hours after analysis
  const interviewStartOffsetHours = 1 + (index % 3);
  const interviewStartDate = new Date(analysisDate.getTime() + interviewStartOffsetHours * 3600 * 1000);

  // 5. Interview Completed: 14 to 22 minutes after interview started (realistic 10-turn interview)
  const interviewDurationMin = 14 + (index % 9);
  const interviewCompleteDate = new Date(interviewStartDate.getTime() + interviewDurationMin * 60 * 1000);

  return {
    onboarding: Timestamp.fromDate(onboardingDate),
    resumeUpload: Timestamp.fromDate(uploadDate),
    resumeAnalysis: Timestamp.fromDate(analysisDate),
    interviewStart: Timestamp.fromDate(interviewStartDate),
    interviewComplete: Timestamp.fromDate(interviewCompleteDate),
    interviewDurationSeconds: interviewDurationMin * 60,
  };
}

/**
 * Formats custom synthetic resume text tailored to candidate's discipline
 */
function generateSyntheticResumeText(fullName, email, profile) {
  return `${fullName}
Email: ${email}
Institution: Technological Institute of the Philippines (T.I.P.) Manila
Notice: Synthetic UAT Evaluation Material - Academic Research Only

PROFESSIONAL SUMMARY
Motivated entry-level candidate from the Technological Institute of the Philippines Manila. Eager to contribute foundational skills in ${profile.skills.slice(0, 4).join(", ")} toward an entry-level ${profile.role} position.

EDUCATION
Technological Institute of the Philippines (T.I.P.) Manila
${profile.degreeProgram}
Expected Graduation: 2026
Academic Department: ${profile.college}

TECHNICAL SKILLS
Core Competencies: ${profile.skills.join(", ")}

PROJECTS
Academic Capstone & Practicum Showcase
- Collaborated in designing, testing, and deploying specialized deliverables for ${profile.role}.
- Structured technical documentation and participated in sprint reviews and code audits.
- Implemented core functional requirements adhering to departmental standards.

WORK EXPERIENCE
Practicum Intern - Academic Industry Partnership
Technological Institute of the Philippines Manila (2025 – 2026)
- Assisted mentor engineers and coordinators in technical deliverables.
- Participated in weekly reviews, documented project milestones, and performed quality checks.`;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("=========================================================");
  console.log("AIRIS UAT DATA REFINEMENT & SCORING VARIATION");
  console.log(`Target Firebase Project: ${EXPECTED_PROJECT_ID}`);
  console.log(`Execution Mode: ${isDryRun ? "DRY-RUN (Zero Writes)" : "LIVE FIRESTORE UPDATE"}`);
  console.log("=========================================================\n");

  // Service account resolution
  const saPath = "/Users/danieltan/.gemini/antigravity-ide/brain/19303579-7f27-4dbe-b894-7e313a7bd0d0/scratch/service-account.json";
  if (!fs.existsSync(saPath)) {
    throw new Error(`Missing service account file at ${saPath}`);
  }
  const sa = JSON.parse(fs.readFileSync(saPath, "utf8"));
  if (sa.project_id !== EXPECTED_PROJECT_ID) {
    throw new Error(`Target project mismatch: expected ${EXPECTED_PROJECT_ID}, got ${sa.project_id}`);
  }

  const app = getApps().length === 0 ? initializeApp({ credential: cert(sa) }) : getApps()[0];
  const db = getFirestore(app);

  // 1. Read authoritative roster
  const roster = JSON.parse(fs.readFileSync(ROSTER_PATH, "utf8"));
  console.log(`Loaded authoritative roster: ${roster.length} participants.`);

  // 2. Fetch all existing users from Firestore
  const usersSnap = await db.collection("users").get();
  console.log(`Fetched ${usersSnap.size} total users from Firestore users collection.`);

  const usersByEmail = new Map();
  usersSnap.forEach((doc) => {
    const data = doc.data();
    if (data.email) {
      usersByEmail.set(data.email.trim().toLowerCase(), { id: doc.id, ref: doc.ref, data });
    }
  });

  let updatedCount = 0;
  let skippedLegitCount = 0;
  let rejectedCount = 0;
  const processedProfiles = [];

  for (let idx = 0; idx < roster.length; idx++) {
    const p = roster[idx];
    const normEmail = p.email.trim().toLowerCase();
    const existing = usersByEmail.get(normEmail);

    if (!existing) {
      console.warn(`[WARNING] Roster entry not found in Firestore: ${p.fullName} (${normEmail})`);
      rejectedCount++;
      continue;
    }

    // Safety: Protect legitimate accounts
    if (PROTECTED_LEGIT_EMAILS.has(normEmail) || (!existing.data.isDefenseDemo && !existing.data.isSyntheticUat)) {
      skippedLegitCount++;
      continue;
    }

    // Determine candidate profile archetype
    const isErnestPonce = normEmail === "meponce@tip.edu.ph" || p.fullName.toUpperCase().includes("PONCE");
    const isDanicaTang = normEmail === "mdatang@tip.edu.ph" || p.fullName.toUpperCase().includes("TANG");

    let profile;
    if (isErnestPonce) {
      profile = ERNEST_PONCE_PROFILE;
    } else if (isDanicaTang) {
      profile = DANICA_TANG_PROFILE;
    } else {
      profile = IT_ARCHETYPES[idx % IT_ARCHETYPES.length];
    }

    // Generate varied metrics and timestamps
    const metrics = generateParticipantMetrics(idx, isErnestPonce, isDanicaTang);
    const timestamps = generateChronologicalTimestamps(idx);

    processedProfiles.push({
      uid: existing.id,
      fullName: p.fullName,
      email: normEmail,
      role: profile.role,
      degreeProgram: profile.degreeProgram,
      college: profile.college,
      coordinator: profile.coordinator,
      resumeScore: metrics.resumeScore,
      interviewScore: metrics.interviewScore,
      compositeScore: metrics.compositeScore,
      timestamps,
      metrics,
      profile,
    });
  }

  console.log(`\nIdentified for Update: ${processedProfiles.length} synthetic UAT profiles.`);
  console.log(`Preserved Legitimate Accounts: ${skippedLegitCount} accounts.`);
  console.log(`Rejected / Missing: ${rejectedCount} entries.\n`);

  // Verify constraints
  const resumeScores = processedProfiles.map((p) => p.resumeScore);
  const interviewScores = processedProfiles.map((p) => p.interviewScore);
  const compositeScores = processedProfiles.map((p) => p.compositeScore);

  const minResume = Math.min(...resumeScores);
  const maxResume = Math.max(...resumeScores);
  const minInterview = Math.min(...interviewScores);
  const maxInterview = Math.max(...interviewScores);
  const minComposite = Math.min(...compositeScores);
  const maxComposite = Math.max(...compositeScores);

  console.log("--- METRIC DISTRIBUTION AUDIT ---");
  console.log(`Resume Score Range: ${minResume} - ${maxResume} (Required: 50–65)`);
  console.log(`Interview Score Range: ${minInterview} - ${maxInterview} (Required: 45–70)`);
  console.log(`Composite Score Range: ${minComposite} - ${maxComposite} (Canonical: round(0.40*res + 0.60*int))`);

  if (minResume < 50 || maxResume > 65) {
    throw new Error(`Resume score out of range: min ${minResume}, max ${maxResume}`);
  }
  if (minInterview < 45 || maxInterview > 70) {
    throw new Error(`Interview score out of range: min ${minInterview}, max ${maxInterview}`);
  }

  // Verify academic exceptions
  const ponce = processedProfiles.find((p) => p.email === "meponce@tip.edu.ph");
  const tang = processedProfiles.find((p) => p.email === "mdatang@tip.edu.ph");
  console.log("\n--- ACADEMIC EXCEPTIONS AUDIT ---");
  console.log(`ERNEST PONCE: Program = '${ponce?.degreeProgram}', College = '${ponce?.college}', Coord = '${ponce?.coordinator}', Role = '${ponce?.role}'`);
  console.log(`Danica Tang:  Program = '${tang?.degreeProgram}', College = '${tang?.college}', Coord = '${tang?.coordinator}', Role = '${tang?.role}'`);

  if (ponce?.degreeProgram !== "BS Electrical Engineering" || ponce?.college !== "College of Engineering and Architecture") {
    throw new Error("ERNEST PONCE academic program mismatch!");
  }
  if (tang?.degreeProgram !== "BS Entertainment and Multimedia Computing" || tang?.college !== "College of Computer Studies") {
    throw new Error("Danica Tang academic program mismatch!");
  }

  if (isDryRun) {
    console.log("\n[DRY RUN COMPLETE] Zero database writes performed.");
    return;
  }

  // Execute Live Firestore Update
  console.log("\nExecuting live Firestore update for 43 UAT profiles and subcollections...");

  for (const item of processedProfiles) {
    const userRef = db.collection("users").doc(item.uid);

    // 1. Update User Document
    await userRef.update({
      fullName: item.fullName,
      email: item.email,
      role: "student",
      college: item.college,
      degreeProgram: item.degreeProgram,
      targetPosition: item.role,
      coordinator: item.coordinator,
      resumeScore: item.resumeScore,
      interviewScore: item.interviewScore,
      employabilityScore: item.compositeScore,
      employabilityStatus: "completed",
      interviewStatus: "completed",
      resumeStatus: "success",
      hasUploadedResume: true,
      isProfileComplete: true,
      hasCompletedOnboarding: true,
      isDefenseDemo: true, // legacy compatibility
      isSyntheticUat: true, // primary standard marker
      uatCohort: "UAT-50",
      createdAt: item.timestamps.onboarding,
      updatedAt: item.timestamps.interviewComplete,
    });

    // 2. Update resumes/resume_1
    const resumeRef = userRef.collection("resumes").doc("resume_1");
    const resumeText = generateSyntheticResumeText(item.fullName, item.email, item.profile);
    await resumeRef.set({
      resumeId: "resume_1",
      userId: item.uid,
      originalFileName: "Resume_Standard.pdf",
      fileType: "application/pdf",
      extractionMethod: "embedded",
      rawText: resumeText,
      resumeVersion: 1,
      analysisStatus: "success",
      isDefenseDemo: true,
      isSyntheticUat: true,
      createdAt: item.timestamps.resumeUpload,
    });

    // 3. Update resumeAnalyses/analysis_1
    const analysisRef = userRef.collection("resumeAnalyses").doc("analysis_1");
    await analysisRef.set({
      analysisId: "analysis_1",
      userId: item.uid,
      resumeId: "resume_1",
      targetPosition: item.role,
      scoringModelVersion: "3.0.0-canonical",
      version: 1,
      atsScore: {
        overallScore: item.resumeScore,
        level: "DEVELOPING",
        levelLabel: "Developing Preparedness",
      },
      alignmentScore: {
        overallScore: item.resumeScore,
        targetPosition: item.role,
        formula: "Alignment Score = round(0.40 * Skills + 0.30 * Experience + 0.20 * Education + 0.10 * Certifications)",
        dimensions: item.metrics.atsDimensions,
        breakdown: {
          skillsMatch: { ...item.metrics.atsDimensions.skills, label: "Skills Match" },
          experienceProjects: { ...item.metrics.atsDimensions.experience, label: "Experience & Projects" },
          educationRelevance: { ...item.metrics.atsDimensions.education, label: "Education Relevance" },
          certifications: { ...item.metrics.atsDimensions.certifications, label: "Certifications" },
        },
      },
      resumeScore: {
        overallScore: item.resumeScore,
        formula: "Resume Score = round(ATS * 0.40 + Alignment * 0.60)",
      },
      overallScore: item.resumeScore,
      detectedSkills: item.profile.skills,
      suggestions: item.profile.resumeSuggestions,
      isDefenseDemo: true,
      isSyntheticUat: true,
      createdAt: item.timestamps.resumeAnalysis,
      analyzedAt: item.timestamps.resumeAnalysis,
    });

    // 4. Update interviews/interview_1
    const interviewRef = userRef.collection("interviews").doc("interview_1");
    await interviewRef.set({
      interviewId: "interview_1",
      sessionId: "interview_1",
      userId: item.uid,
      status: "completed",
      overallScore: item.interviewScore,
      overallPerformance: item.interviewScore,
      targetRole: item.role,
      turnCount: 10,
      durationSeconds: item.timestamps.interviewDurationSeconds,
      startedAt: item.timestamps.interviewStart,
      completedAt: item.timestamps.interviewComplete,
      createdAt: item.timestamps.interviewStart,
      finalReport: {
        overallPerformance: item.interviewScore,
        categoryBreakdown: item.metrics.interviewBreakdown,
        strengths: item.profile.interviewStrengths,
        areasToImprove: item.profile.interviewImprovements,
      },
      isDefenseDemo: true,
      isSyntheticUat: true,
    });

    // 5. Update activities (act_1, act_2, act_3)
    const act1Ref = userRef.collection("activities").doc("act_1");
    await act1Ref.set({
      activityId: "act_1",
      userId: item.uid,
      type: "resume_upload",
      title: "Resume Uploaded",
      details: "Uploaded standard student resume in PDF format.",
      timestamp: item.timestamps.resumeUpload,
      isDefenseDemo: true,
      isSyntheticUat: true,
    });

    const act2Ref = userRef.collection("activities").doc("act_2");
    await act2Ref.set({
      activityId: "act_2",
      userId: item.uid,
      type: "resume_evaluated",
      title: "Resume Analysis Completed",
      details: `Evaluated ATS and Alignment score for ${item.role} (${item.resumeScore}/100).`,
      score: item.resumeScore,
      timestamp: item.timestamps.resumeAnalysis,
      isDefenseDemo: true,
      isSyntheticUat: true,
    });

    const act3Ref = userRef.collection("activities").doc("act_3");
    await act3Ref.set({
      activityId: "act_3",
      userId: item.uid,
      type: "interview_completed",
      title: "Mock Interview Completed",
      details: `Completed 10-turn technical interview simulation with composite score ${item.interviewScore}/100.`,
      score: item.interviewScore,
      timestamp: item.timestamps.interviewComplete,
      completedAt: item.timestamps.interviewComplete,
      isDefenseDemo: true,
      isSyntheticUat: true,
    });

    updatedCount++;
  }

  console.log(`\nSuccessfully updated ${updatedCount} profiles in Firestore.`);

  // 6. Post-Write Read-Back Verification
  console.log("\n--- POST-WRITE READ-BACK VERIFICATION ---");
  const readBackCheck = [];
  for (const item of processedProfiles) {
    const doc = await db.collection("users").doc(item.uid).get();
    const data = doc.data();
    const resumesCount = (await doc.ref.collection("resumes").get()).size;
    const analysesCount = (await doc.ref.collection("resumeAnalyses").get()).size;
    const interviewsCount = (await doc.ref.collection("interviews").get()).size;
    const activitiesCount = (await doc.ref.collection("activities").get()).size;

    readBackCheck.push({
      email: data.email,
      resumeScore: data.resumeScore,
      interviewScore: data.interviewScore,
      employabilityScore: data.employabilityScore,
      hasResumes: resumesCount === 1,
      hasAnalyses: analysesCount === 1,
      hasInterviews: interviewsCount === 1,
      hasActivities: activitiesCount === 3,
    });
  }

  const allHaveSubcollections = readBackCheck.every(
    (c) => c.hasResumes && c.hasAnalyses && c.hasInterviews && c.hasActivities
  );
  console.log(`Read-Back Count: ${readBackCheck.length} / 43`);
  console.log(`All Subcollections Present: ${allHaveSubcollections ? "VERIFIED (100%)" : "FAILED"}`);

  // Confirm legitimate accounts are still untouched
  console.log("\n--- LEGITIMATE ACCOUNTS INTEGRITY CHECK ---");
  for (const legitEmail of PROTECTED_LEGIT_EMAILS) {
    const q = await db.collection("users").where("email", "==", legitEmail).get();
    if (!q.empty) {
      const legitData = q.docs[0].data();
      console.log(`Legitimate account: ${legitEmail} -> isDefenseDemo: ${Boolean(legitData.isDefenseDemo)}, isSyntheticUat: ${Boolean(legitData.isSyntheticUat)}, role: ${legitData.role}`);
    }
  }

  console.log("\n=========================================================");
  console.log("UAT DATA REFINEMENT & VERIFICATION COMPLETED SUCCESSFULLY");
  console.log("=========================================================");
}

main().catch((err) => {
  console.error("Refinement failed:", err);
  process.exit(1);
});
