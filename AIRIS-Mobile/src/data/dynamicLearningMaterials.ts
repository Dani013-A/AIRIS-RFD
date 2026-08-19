export interface LearningMaterial {
  id?: string;
  title: string;
  description: string;
  type: "video" | "pdf" | "module";
  url: string;
  category:
    | "Interview Preparation"
    | "Resume Writing"
    | "Professional Communication"
    | "Curated Learning Materials";
  thumbnailUrl?: string;
  department: "CCS" | "ENG" | "ARCH" | "CBA" | "EDU" | "ARTS" | "GEN";
}

/**
 * Resolves the department code based on the student's degree program string.
 * Covers every college/program currently listed on tip.edu.ph for both
 * T.I.P. Manila and T.I.P. Quezon City (verified July 2026).
 */
export function getDepartmentFromProgram(
  degreeProgram: string,
): "CCS" | "ENG" | "ARCH" | "CBA" | "EDU" | "ARTS" | "GEN" {
  const normProg = (degreeProgram || "").toLowerCase();

  // Quezon City campus: Elementary, Secondary, and Special Education programs.
  if (
    normProg.includes("education") ||
    normProg.includes("elementary") ||
    normProg.includes("secondary education") ||
    normProg.includes("special needs") ||
    normProg.includes("sped")
  ) {
    return "EDU";
  }

  // Both Quezon City and Manila campuses: English and Political Science programs.
  if (
    normProg.includes("political science") ||
    normProg.includes("english language") ||
    normProg.includes("bachelor of arts") ||
    normProg.includes("ab english") ||
    normProg.includes("ab political")
  ) {
    return "ARTS";
  }

  // Both Quezon City and Manila campuses: Computer Science, IT, Information Systems, Data Science, and EMC.
  if (
    normProg.includes("computer") ||
    normProg.includes("information technology") ||
    normProg.includes("information system") ||
    normProg.includes("data science") ||
    normProg.includes("multimedia") ||
    normProg.includes("emc")
  ) {
    return "CCS";
  }

  if (normProg.includes("architecture")) {
    return "ARCH";
  }

  // Both Quezon City and Manila campuses: Engineering and Architecture (Sanitary Engineering is Quezon City only).
  if (
    normProg.includes("civil") ||
    normProg.includes("mechanical") ||
    normProg.includes("electrical") ||
    normProg.includes("electronics") ||
    normProg.includes("chemical") ||
    normProg.includes("industrial") ||
    normProg.includes("environmental") ||
    normProg.includes("sanitary") ||
    normProg.includes("engineering")
  ) {
    return "ENG";
  }

  // Both Quezon City and Manila campuses: Accountancy, Accounting Information Systems, and Business Administration.
  if (
    normProg.includes("accountancy") ||
    normProg.includes("accounting") ||
    normProg.includes("business") ||
    normProg.includes("marketing") ||
    normProg.includes("human resource") ||
    normProg.includes("logistics") ||
    normProg.includes("supply chain") ||
    normProg.includes("finance")
  ) {
    return "CBA";
  }

  return "GEN";
}

export const DYNAMIC_LEARNING_LIBRARY: LearningMaterial[] = [

  {
    title: "How to Ace a Job Interview: Top Tips from Career Experts",
    description:
      "Covers body language, common interview questions, follow-up etiquette, and how to leave a lasting impression on hiring managers.",
    type: "video",
    url: "https://www.youtube.com/watch?v=Zf5fTfH5T-8",
    category: "Interview Preparation",
    thumbnailUrl: "https://img.youtube.com/vi/Zf5fTfH5T-8/maxresdefault.jpg",
    department: "GEN",
  },
  {
    title: "Tell Me About Yourself – A Good Answer to This Interview Question",
    description:
      "Linda Raynier's step-by-step formula for crafting a confident, structured answer to the most common interview opener.",
    type: "video",
    url: "https://www.youtube.com/watch?v=kayOhGRcNt4",
    category: "Interview Preparation",
    thumbnailUrl: "https://img.youtube.com/vi/kayOhGRcNt4/maxresdefault.jpg",
    department: "GEN",
  },
  {
    title: "Software Engineering Job Interview – Full Mock Interview",
    description:
      "Full mock coding interview covering algorithm design, complexity analysis, data structures, and communication skills for tech roles.",
    type: "video",
    url: "https://www.youtube.com/watch?v=aClxtDcdpsQ",
    category: "Interview Preparation",
    thumbnailUrl: "https://img.youtube.com/vi/aClxtDcdpsQ/maxresdefault.jpg",
    department: "CCS",
  },
  {
    title: "Engineering Interview Questions & Answers – How to Pass",
    description:
      "Structured walkthrough of common engineering interview scenarios covering problem-solving, teamwork, and technical competencies.",
    type: "video",
    url: "https://www.youtube.com/watch?v=KCm6JVtoRdo",
    category: "Interview Preparation",
    thumbnailUrl: "https://img.youtube.com/vi/KCm6JVtoRdo/maxresdefault.jpg",
    department: "ENG",
  },
  {
    title: "How to Build a Winning Architecture Portfolio",
    description:
      "ArchiHacks guide on selecting projects, structuring layout grids, presenting drawings, and crafting a narrative that impresses recruiters.",
    type: "video",
    url: "https://www.youtube.com/watch?v=4wBy58qk7Bg",
    category: "Interview Preparation",
    thumbnailUrl: "https://img.youtube.com/vi/4wBy58qk7Bg/maxresdefault.jpg",
    department: "ARCH",
  },
  {
    title: "Accounting & Finance Job Interview Questions and Answers",
    description:
      "Covers journal entries, financial statements, audit procedures, and behavioral questions for accounting and finance role interviews.",
    type: "video",
    url: "https://www.youtube.com/watch?v=1m7P7wWn5X0",
    category: "Interview Preparation",
    thumbnailUrl: "https://img.youtube.com/vi/1m7P7wWn5X0/maxresdefault.jpg",
    department: "CBA",
  },
  {
    title: "Teacher Interview Questions and Answers (Pass Teaching Interview)",
    description:
      "Common LET-graduate interview questions covering classroom management, lesson demonstration, and philosophy of teaching.",
    type: "video",
    url: "https://www.youtube.com/watch?v=J6MYpvOaNmE",
    category: "Interview Preparation",
    thumbnailUrl: "https://img.youtube.com/vi/J6MYpvOaNmE/maxresdefault.jpg",
    department: "EDU",
  },
  {
    title: "Liberal Arts & Humanities Career Interview Tips",
    description:
      "How to articulate research, writing, critical thinking, and communication skills in interviews for non-technical professional roles.",
    type: "video",
    url: "https://www.youtube.com/watch?v=y_m0nK2f4oQ",
    category: "Interview Preparation",
    thumbnailUrl: "https://img.youtube.com/vi/y_m0nK2f4oQ/maxresdefault.jpg",
    department: "ARTS",
  },

  {
    title: "Harvard Office of Career Services Resume & Cover Letter Guide",
    description:
      "Detailed booklet outlining resume structure, formatting rules, action verbs, and ATS optimization from Harvard OCS.",
    type: "pdf",
    url: "https://careerservices.fas.harvard.edu/resources/resume-and-cover-letter-guide/",
    category: "Resume Writing",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Harvard_University_logo.svg/512px-Harvard_University_logo.svg.png",
    department: "GEN",
  },
  {
    title: "Write an Incredible Resume: 5 Golden Rules",
    description:
      "Google Career Tips expert Jeff Su shares the 5 golden rules to make your resume stand out to FAANG recruiters.",
    type: "video",
    url: "https://www.youtube.com/watch?v=Tt08KmFfIYQ",
    category: "Resume Writing",
    thumbnailUrl: "https://img.youtube.com/vi/Tt08KmFfIYQ/maxresdefault.jpg",
    department: "GEN",
  },
  {
    title: "How to Write a CV with No Work Experience",
    description:
      "Step-by-step guide on writing a resume or CV with no work experience, highlighting academic projects, extracurriculars, and transferable skills.",
    type: "video",
    url: "https://www.youtube.com/watch?v=yTBdOxKTbMc",
    category: "Resume Writing",
    thumbnailUrl: "https://img.youtube.com/vi/yTBdOxKTbMc/maxresdefault.jpg",
    department: "GEN",
  },
  {
    title: "Full-Stack Web Developer Career Pathway Guide",
    description:
      "Comprehensive roadmap mapping frontend architectures, REST API designs, databases, and deployment.",
    type: "module",
    url: "https://roadmap.sh/full-stack",
    category: "Resume Writing",
    thumbnailUrl: "https://avatars.githubusercontent.com/u/44533235?s=200&v=4",
    department: "CCS",
  },
  {
    title: "Autodesk AutoCAD Official Documentation & Guides",
    description:
      "Official technical guidelines for 2D drafting, 3D modeling, rendering, and structural layouts.",
    type: "module",
    url: "https://help.autodesk.com/view/ACD/2024/ENU/",
    category: "Resume Writing",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Autodesk_Logo.svg/512px-Autodesk_Logo.svg.png",
    department: "ENG",
  },
  {
    title: "Autodesk 3ds Max Official Documentation & Rendering Workflows",
    description:
      "Official Autodesk guides explaining structural lighting, materials texturing, and realistic exterior scene production.",
    type: "module",
    url: "https://help.autodesk.com/view/3DSMAX/2024/ENU/",
    category: "Resume Writing",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Autodesk_Logo.svg/512px-Autodesk_Logo.svg.png",
    department: "ARCH",
  },
  {
    title: "IFRS Foundation: Accounting Standards",
    description:
      "Professional accounting guidelines detailing global regulatory compliances, balance statements, and financial reporting standards.",
    type: "module",
    url: "https://www.ifrs.org/issued-standards/list-of-standards/",
    category: "Resume Writing",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/en/thumb/0/05/IFRS_Foundation_logo.svg/512px-IFRS_Foundation_logo.svg.png",
    department: "CBA",
  },
  {
    title: "PRC Official Online Portal & Licensure Guidelines",
    description:
      "Official PRC licensure requirements, application process, and examination coverage for professional domains.",
    type: "pdf",
    url: "https://www.prc.gov.ph/",
    category: "Resume Writing",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Professional_Regulation_Commission_%28PRC%29.svg/512px-Professional_Regulation_Commission_%28PRC%29.svg.png",
    department: "EDU",
  },
  {
    title: "Writing in the Sciences",
    description:
      "Stanford University course on clear technical writing, editorial structure, and professional drafting standards.",
    type: "module",
    url: "https://www.coursera.org/learn/sciwrite",
    category: "Resume Writing",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Coursera-Logo_600x600.svg/512px-Coursera-Logo_600x600.svg.png",
    department: "ARTS",
  },

  {
    title: "Speak Like a Manager: Verbs 2 – Professional Vocabulary",
    description:
      "Learn professional active verbs, corporate phrasing, and vocabulary guidelines by Learn English with Rebecca (engVid).",
    type: "video",
    url: "https://www.youtube.com/watch?v=lkHLxB7pB9w",
    category: "Professional Communication",
    thumbnailUrl: "https://img.youtube.com/vi/lkHLxB7pB9w/maxresdefault.jpg",
    department: "GEN",
  },
  {
    title: "English for Career Development Certification Course",
    description:
      "Master workplace vocabulary, professional language structures, and conversational fluency for global job applications (UPenn via Coursera).",
    type: "module",
    url: "https://www.coursera.org/learn/careerdevelopment",
    category: "Professional Communication",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Coursera-Logo_600x600.svg/512px-Coursera-Logo_600x600.svg.png",
    department: "GEN",
  },
  {
    title: "Business English Communication Skills Specialization",
    description:
      "Improve your business communication skills in English for meetings, presentations, negotiations, and emails (UWashington via Coursera).",
    type: "module",
    url: "https://www.coursera.org/specializations/business-english",
    category: "Professional Communication",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Coursera-Logo_600x600.svg/512px-Coursera-Logo_600x600.svg.png",
    department: "GEN",
  },
  {
    title: "Email Etiquette in the Workplace | Indeed Career Tips",
    description:
      "Learn best practices for writing clear business correspondence, professional emails, response times, and workplace communication.",
    type: "video",
    url: "https://www.youtube.com/watch?v=3eLzpJcst5Y",
    category: "Professional Communication",
    thumbnailUrl: "https://img.youtube.com/vi/3eLzpJcst5Y/maxresdefault.jpg",
    department: "GEN",
  },
  {
    title: "Git and GitHub for Beginners – Crash Course",
    description:
      "Learn Git branching, merging, pull requests, resolving conflicts, and collaboration pipelines for developer teams (freeCodeCamp).",
    type: "video",
    url: "https://www.youtube.com/watch?v=RGOj5yH7evk",
    category: "Professional Communication",
    thumbnailUrl: "https://img.youtube.com/vi/RGOj5yH7evk/maxresdefault.jpg",
    department: "CCS",
  },
  {
    title: "Classroom Management Strategies – Research-Backed Approaches",
    description:
      "Evidence-based strategies for classroom management, positive reinforcement, and student engagement from Edutopia.",
    type: "video",
    url: "https://www.youtube.com/watch?v=oEq1GLSQ0p4",
    category: "Professional Communication",
    thumbnailUrl: "https://img.youtube.com/vi/oEq1GLSQ0p4/maxresdefault.jpg",
    department: "EDU",
  },

  {
    title: "AWS Certified Cloud Practitioner Full Course (CLF-C02)",
    description:
      "Master EC2, S3, RDS, CloudWatch, and IAM roles to achieve cloud readiness. Full certification prep by freeCodeCamp.",
    type: "video",
    url: "https://www.youtube.com/watch?v=SOTamWNgDKc",
    category: "Curated Learning Materials",
    thumbnailUrl: "https://img.youtube.com/vi/SOTamWNgDKc/maxresdefault.jpg",
    department: "CCS",
  },
  {
    title: "ETABS Structural Analysis & Design – Full Beginner Tutorial",
    description:
      "Step-by-step structural modeling, load definitions, seismic analysis, and concrete frame design for multi-story buildings.",
    type: "video",
    url: "https://www.youtube.com/watch?v=fsCe8Sj78J0",
    category: "Curated Learning Materials",
    thumbnailUrl: "https://img.youtube.com/vi/fsCe8Sj78J0/maxresdefault.jpg",
    department: "ENG",
  },
  {
    title: "Revit – Complete Tutorial for Beginners (60 Minutes)",
    description:
      "Learn Revit Architecture from scratch covering layouts, walls, doors, floors, and drawing sheets (CAD in black).",
    type: "video",
    url: "https://www.youtube.com/watch?v=Nd6U2KgHI6k",
    category: "Curated Learning Materials",
    thumbnailUrl: "https://img.youtube.com/vi/Nd6U2KgHI6k/maxresdefault.jpg",
    department: "ARCH",
  },
  {
    title: "Agile Management | Google Project Management Certificate",
    description:
      "Learn Agile values, Scrum framework, sprint planning, and when to adopt an Agile mindset. Official Google Career Certificates content.",
    type: "video",
    url: "https://www.youtube.com/watch?v=km7n3DI5IWk",
    category: "Curated Learning Materials",
    thumbnailUrl: "https://img.youtube.com/vi/km7n3DI5IWk/maxresdefault.jpg",
    department: "CBA",
  },
  {
    title: "Foundations of Teaching for Learning Specialization",
    description:
      "Commonwealth Education Trust course on lesson planning, classroom management, and learner assessment.",
    type: "module",
    url: "https://www.coursera.org/specializations/foundations-of-teaching-for-learning",
    category: "Curated Learning Materials",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Coursera-Logo_600x600.svg/512px-Coursera-Logo_600x600.svg.png",
    department: "EDU",
  },
  {
    title: "Teach English Now! TESOL Specialization",
    description:
      "Arizona State University course on English language teaching methodology and practicum planning.",
    type: "module",
    url: "https://www.coursera.org/specializations/teach-english-now",
    category: "Curated Learning Materials",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Coursera-Logo_600x600.svg/512px-Coursera-Logo_600x600.svg.png",
    department: "EDU",
  },
  {
    title: "Global Diplomacy – Diplomacy in the Modern World",
    description:
      "SOAS University of London course covering modern global governance, diplomacy, and comparative political systems.",
    type: "module",
    url: "https://www.coursera.org/learn/global-diplomacy",
    category: "Curated Learning Materials",
    thumbnailUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Coursera-Logo_600x600.svg/512px-Coursera-Logo_600x600.svg.png",
    department: "ARTS",
  },
];
