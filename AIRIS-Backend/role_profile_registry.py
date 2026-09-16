# Authoritative Role Profile Registry for AIRIS Resume Scoring Integrity
# Single Source of Truth for Role Competency Benchmarks across all 25 T.I.P. Manila Programs
# Frozen Architecture: Deterministic, Versioned, Immutable, Evidence-Grounded

import copy
import datetime
import os
import re
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple

@dataclass(frozen=True)
class RoleProfile:
    canonical_role: str
    profile_id: str
    version: str
    domain: str
    required_skills: Tuple[str, ...]
    recommended_skills: Tuple[str, ...]
    education_benchmarks: Tuple[str, ...]
    certification_benchmarks: Tuple[str, ...]
    profile_source: str  # "AUTHORITATIVE_STATIC", "PERSISTED_VALIDATED", "PRIOR_VALIDATED_VERSION", "APPROVED_DOMAIN_FALLBACK"
    is_degraded: bool
    last_updated: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "canonical_role": self.canonical_role,
            "profile_id": self.profile_id,
            "version": self.version,
            "domain": self.domain,
            "required_skills": list(self.required_skills),
            "recommended_skills": list(self.recommended_skills),
            "education_benchmarks": list(self.education_benchmarks),
            "certification_benchmarks": list(self.certification_benchmarks),
            "profile_source": self.profile_source,
            "is_degraded": self.is_degraded,
            "last_updated": self.last_updated
        }

class RoleProfileUnresolvedError(Exception):
    """Raised when a target role cannot be safely resolved across all 4 tiers."""
    pass

# --- EXACT CANONICAL ALIAS NORMALIZATION MAP ---
# Strictly exact string match (case-insensitive). Zero substring or partial matching.
ROLE_ALIASES: Dict[str, str] = {
    "3d animator": "3D Animator",
    "account manager": "Account Manager",
    "accountant": "Accountant",
    "accounting specialist": "Accounting Specialist",
    "accounting systems analyst": "Accounting Systems Analyst",
    "administrative assistant": "Administrative Associate",
    "administrative associate": "Administrative Associate",
    "administrative manager": "Administrative Manager",
    "ai / machine learning engineer": "AI / Machine Learning Engineer",
    "ai engineer": "AI / Machine Learning Engineer",
    "algorithms engineer": "Algorithms Engineer",
    "analytics consultant": "Analytics Consultant",
    "ar/vr developer": "AR/VR Developer",
    "architect": "Architect",
    "auditor": "Auditor",
    "automotive engineer": "Automotive Engineer",
    "back end developer": "Backend Developer",
    "backend developer": "Backend Developer",
    "banking associate": "Banking Associate",
    "behavioral research assistant": "Behavioral Research Assistant",
    "bim specialist": "CAD/BIM Specialist",
    "bookkeeper": "Bookkeeper",
    "brand associate": "Brand Associate",
    "building architect": "Architect",
    "business analyst": "Business Analyst",
    "business intelligence analyst": "Business Intelligence Analyst",
    "business operations specialist": "Business Operations Specialist",
    "cad specialist": "CAD/BIM Specialist",
    "cad trainee": "CAD/BIM Specialist",
    "cad/bim specialist": "CAD/BIM Specialist",
    "certified public accountant": "Accountant",
    "chemical engineer": "Chemical Engineer",
    "civil engineer": "Civil Engineer",
    "cloud engineer": "Cloud Engineer",
    "communications assistant": "Communications Assistant",
    "community relations officer": "Community Relations Officer",
    "compensation and benefits analyst": "Compensation and Benefits Analyst",
    "computer engineer": "Computer Engineer",
    "construction manager": "Construction Manager",
    "content writer": "Content Writer",
    "control systems engineer": "Control Systems Engineer",
    "cost estimator": "Cost Estimator",
    "counseling assistant": "Counseling Assistant",
    "cpa": "Accountant",
    "credit analyst": "Credit Analyst",
    "customer service representative": "Customer Service Representative",
    "cybersecurity analyst": "Cybersecurity Analyst",
    "data analyst": "Data Analyst",
    "data analyst intern": "Data Analyst",
    "data engineer": "Data Engineer",
    "data scientist": "Data Scientist",
    "database administrator": "Database Administrator",
    "dba": "Database Administrator",
    "design architect": "Design Architect",
    "devops engineer": "DevOps Specialist",
    "devops specialist": "DevOps Specialist",
    "digital marketing officer": "Digital Marketing Officer",
    "electrical design engineer": "Electrical Design Engineer",
    "electrical engineer": "Electrical Engineer",
    "electronics engineer": "Electronics Engineer",
    "embedded software engineer": "Embedded Software Engineer",
    "embedded systems engineer": "Embedded Systems Engineer",
    "engineering student assistant": "Engineering Student Assistant",
    "environmental compliance engineer": "Environmental Compliance Engineer",
    "erp implementation specialist": "ERP Implementation Specialist",
    "financial analyst": "Financial Analyst",
    "financial controller": "Financial Controller",
    "financial systems consultant": "Financial Systems Consultant",
    "firmware engineer": "Firmware Engineer",
    "front end developer": "Frontend Developer",
    "frontend developer": "Frontend Developer",
    "full stack developer": "Full Stack Developer",
    "fullstack developer": "Full Stack Developer",
    "game designer": "Game Designer",
    "game developer": "Game Developer",
    "geotechnical engineer": "Geotechnical Engineer",
    "guidance associate": "Guidance Associate",
    "hardware engineer": "Hardware Engineer",
    "hr / recruitment associate": "Talent Acquisition Specialist",
    "hr assistant": "HR Generalist",
    "hr business partner": "HR Business Partner",
    "hr generalist": "HR Generalist",
    "hr specialist": "HR Specialist",
    "human resources specialist": "HR Specialist",
    "hvac engineer": "HVAC Engineer",
    "industrial engineer": "Industrial Engineer",
    "information security analyst": "Cybersecurity Analyst",
    "information technology specialist": "Information Technology Specialist",
    "interior designer": "Interior Designer",
    "internal auditor": "Internal Auditor",
    "inventory planner": "Inventory Planner",
    "investment analyst": "Investment Analyst",
    "iot solutions architect": "IoT Solutions Architect",
    "it specialist": "Information Technology Specialist",
    "it support": "IT Support Specialist",
    "it support specialist": "IT Support Specialist",
    "it support technician": "IT Support Technician",
    "junior bookkeeper": "Bookkeeper",
    "junior software developer": "Software Engineer",
    "landscape architect": "Landscape Architect",
    "logistics coordinator": "Logistics Coordinator",
    "machine learning engineer": "AI / Machine Learning Engineer",
    "maintenance engineer": "Maintenance Engineer",
    "manufacturing engineer": "Manufacturing Engineer",
    "marine engineering officer": "Marine Engineering Officer",
    "market research analyst": "Market Research Analyst",
    "marketing assistant": "Marketing Specialist",
    "marketing specialist": "Marketing Specialist",
    "materials engineer": "Materials Engineer",
    "mechanical design engineer": "Mechanical Design Engineer",
    "mechanical engineer": "Mechanical Engineer",
    "microelectronics engineer": "Electronics Engineer",
    "mobile application developer": "Mobile Application Developer",
    "mobile developer": "Mobile Application Developer",
    "motion graphics artist": "Motion Graphics Artist",
    "multimedia artist": "Multimedia Artist",
    "multimedia assistant": "Multimedia Assistant",
    "network administrator": "Network Engineer",
    "network architect": "Network Architect",
    "network engineer": "Network Engineer",
    "operations manager": "Operations Manager",
    "organizational development specialist": "Organizational Development Specialist",
    "plant engineer": "Plant Engineer",
    "power plant engineer": "Power Plant Engineer",
    "power systems engineer": "Power Systems Engineer",
    "process engineer": "Process Engineer",
    "process improvement engineer": "Process Improvement Engineer",
    "procurement officer": "Procurement Officer",
    "production engineer": "Production Engineer",
    "production planner": "Production Planner",
    "project architect": "Project Architect",
    "project coordinator": "Project Coordinator",
    "project electrical engineer": "Electrical Engineer",
    "project engineer": "Project Engineer",
    "psychometrician": "Psychometrician",
    "public relations assistant": "Public Relations Assistant",
    "qa / software tester": "QA / Software Tester",
    "qa engineer": "QA / Software Tester",
    "qa tester": "QA / Software Tester",
    "quality assurance engineer": "Quality Assurance Engineer",
    "quality control engineer": "Quality Control Engineer",
    "research scientist": "Research Scientist",
    "risk analyst": "Risk Analyst",
    "sales and marketing coordinator": "Sales and Marketing Coordinator",
    "signal processing engineer": "Signal Processing Engineer",
    "site engineer": "Site Engineer",
    "social media strategist": "Social Media Strategist",
    "software developer": "Software Engineer",
    "software engineer": "Software Engineer",
    "software tester": "QA / Software Tester",
    "statistical analyst": "Statistical Analyst",
    "structural engineer": "Structural Engineer",
    "substation engineer": "Substation Engineer",
    "supply chain analyst": "Supply Chain Analyst",
    "sysadmin": "System Administrator",
    "system administrator": "System Administrator",
    "systems administrator": "System Administrator",
    "systems engineer": "Systems Engineer",
    "systems software developer": "Software Engineer",
    "talent acquisition specialist": "Talent Acquisition Specialist",
    "tax consultant": "Tax Consultant",
    "telecommunications engineer": "Telecommunications Engineer",
    "training and development officer": "Training and Development Officer",
    "treasury analyst": "Treasury Analyst",
    "ui designer": "UI/UX Designer",
    "ui/ux designer": "UI/UX Designer",
    "unity / unreal engine developer": "Unity / Unreal Engine Developer",
    "urban planner": "Urban Planner",
    "ux designer": "UI/UX Designer",
    "vfx artist": "VFX Artist",
    "warehouse operations manager": "Warehouse Operations Manager",
}

# --- AUTHORITATIVE STATIC ROLE PROFILES (TIER 1) ---
AUTHORITATIVE_STATIC_PROFILES: Dict[str, Dict[str, Any]] = {
    "3D Animator": {
        "version": "1.0.0",
        "domain": "Digital Arts & 3D Animation",
        "required_skills": [
            "3D Character Animation",
            "Autodesk Maya / Blender",
            "Keyframing & Motion Principles (12 Principles of Animation)",
            "Rigging & Skinning Fundamentals",
            "Timing, Spacing & Weight in Animation",
            "3D Camera Animation & Staging",
        ],
        "recommended_skills": [
            "Motion Capture Cleanup",
            "ZBrush Digital Sculpting",
            "Texturing & Shading Basics",
            "Storyboard Interpretation",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Multimedia Arts",
            "Animation",
        ],
        "certification_benchmarks": [
            "Autodesk Certified Professional: Maya for Character Animation",
            "Adobe Certified Professional",
        ]
    },
    "AI / Machine Learning Engineer": {
        "version": "1.0.0",
        "domain": "Artificial Intelligence & Machine Learning",
        "required_skills": [
            "Machine Learning Algorithms",
            "Deep Learning",
            "Python",
            "TensorFlow & PyTorch",
            "Natural Language Processing (NLP)",
            "Data Preprocessing & Feature Engineering",
        ],
        "recommended_skills": [
            "Scikit-Learn",
            "Model Deployment & Serving",
            "MLOps",
            "Computer Vision",
            "Docker",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Bachelor of Science in Data Science and Analytics",
        ],
        "certification_benchmarks": [
            "AWS Certified Machine Learning - Specialty",
            "TensorFlow Developer Certificate",
        ]
    },
    "AR/VR Developer": {
        "version": "1.0.0",
        "domain": "Immersive Computing & Extended Reality",
        "required_skills": [
            "Virtual & Augmented Reality Development",
            "Unity / Unreal Engine for XR",
            "Spatial Audio & 3D Interaction Design",
            "C# / C++ for XR",
            "XR SDKs (ARKit, ARCore, OpenXR)",
            "Real-Time Performance Optimization for Headsets",
        ],
        "recommended_skills": [
            "Oculus / Meta Quest SDK",
            "3D Math for Spatial Tracking",
            "Shader Graph",
            "Haptic Feedback Integration",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Bachelor of Science in Computer Science",
        ],
        "certification_benchmarks": [
            "Unity Certified XR Developer",
            "Meta XR Development Professional Certificate",
        ]
    },
    "Account Manager": {
        "version": "1.0.0",
        "domain": "Account Management & Client Retention",
        "required_skills": [
            "Client Relationship Management & Account Retention",
            "Client Needs Discovery & Upselling / Cross-Selling Strategy",
            "Contract Renewal Negotiation & Service Agreements",
            "Client Problem Resolution & Escalation Handling",
            "Quarterly Business Review (QBR) Presentation",
            "Sales Quota & Revenue Target Achievement",
        ],
        "recommended_skills": [
            "CRM Account Tracking",
            "Proposal & Quotation Drafting",
            "Client Onboarding Procedures",
            "Customer Satisfaction (CSAT) Monitoring",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Marketing Management",
            "Business Administration",
        ],
        "certification_benchmarks": [
            "Certified Account Management Professional",
            "HubSpot Sales Certified",
        ]
    },
    "Accountant": {
        "version": "1.0.0",
        "domain": "Accountancy & Financial Management",
        "required_skills": [
            "Philippine Financial Reporting Standards (PFRS / IFRS)",
            "Philippine Tax Laws & BIR Compliance",
            "General Ledger & Financial Statement Preparation",
            "Accounts Reconciliation & Month-End Closing",
            "Accounting Software (QuickBooks / Xero / SAP)",
            "Double-Entry Bookkeeping Principles",
        ],
        "recommended_skills": [
            "Cost Accounting",
            "Withholding Tax Returns (BIR Form 1601C/E)",
            "Financial Auditing Basics",
            "Advanced Excel Financial Functions",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accountancy",
            "Accountancy Discipline",
        ],
        "certification_benchmarks": [
            "Certified Public Accountant (CPA - PRC License)",
            "Certified Management Accountant (CMA)",
        ]
    },
    "Accounting Specialist": {
        "version": "1.0.0",
        "domain": "General Accounting Operations",
        "required_skills": [
            "General Accounting Ledger Maintenance",
            "Month-End & Year-End Financial Closing",
            "Balance Sheet & Income Statement Account Analysis",
            "Intercompany Transaction Reconciliation",
            "Fixed Asset Accounting & Depreciation Schedules",
            "Compliance with Company Accounting Manuals",
        ],
        "recommended_skills": [
            "Prepaid Expenses & Accruals Processing",
            "BIR Form 2307 Withholding Certificate Preparation",
            "ERP Accounting Module Utilization",
            "Vendor & Customer Account Inquiries",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accountancy",
            "Bachelor of Science in Accounting Information System",
        ],
        "certification_benchmarks": [
            "Certified Accounting Technician (CAT)",
            "TESDA Bookkeeping NC III",
        ]
    },
    "Accounting Systems Analyst": {
        "version": "1.0.0",
        "domain": "Accounting Information Systems & Business Analysis",
        "required_skills": [
            "Accounting Information Systems (AIS) Architecture",
            "Accounting Business Process Mapping (Order-to-Cash, Procure-to-Pay)",
            "ERP Financial Module Configuration (SAP / NetSuite)",
            "Financial Data Validation & Integrity Checks",
            "User Requirements Gathering for Accounting Software",
            "Internal Control Assessment in Automated Systems",
        ],
        "recommended_skills": [
            "SQL for Financial Data Querying",
            "User Acceptance Testing (UAT) in AIS",
            "System Change Control Documentation",
            "Business Flowcharts (Visio / BPMN)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accounting Information System",
            "Bachelor of Science in Information Technology",
        ],
        "certification_benchmarks": [
            "Certified Information Systems Auditor (CISA)",
            "SAP Certified Application Associate - Financial Accounting",
        ]
    },
    "Administrative Associate": {
        "version": "1.0.0",
        "domain": "Office Administration & Support Services",
        "required_skills": [
            "Executive Scheduling & Calendar Coordination",
            "Office Document Drafting & Business Correspondence",
            "Filing Systems, Records Management & Archival",
            "Meeting Organization, Minutes Taking & Agenda Distribution",
            "Office Supplies Requisition & Inventory Tracking",
            "Visitor Greeting & Telephone Etiquette",
        ],
        "recommended_skills": [
            "Travel Arrangements & Expense Reports",
            "Basic Data Entry & Spreadsheet Maintenance",
            "Petty Cash Voucher Preparation",
            "Customer Query Routing",
        ],
        "education_benchmarks": [
            "Senior High School - GAS Strand",
            "Senior High School - ABM Strand",
            "Associate in Office Administration",
        ],
        "certification_benchmarks": [
            "Civil Service Sub-Professional",
            "TESDA Administrative Support NC II",
        ]
    },
    "Administrative Manager": {
        "version": "1.0.0",
        "domain": "Office Administration & Facilities Governance",
        "required_skills": [
            "Office Administration & Facilities Operations Oversight",
            "Administrative Budget Planning & Expense Control",
            "Vendor & Service Contract Management (Security, Janitorial, Utilities)",
            "Records Management, Filing Systems & Archival Policy",
            "Administrative Staff Supervision & Work Allocation",
            "Company Policy Implementation & Office Standards",
        ],
        "recommended_skills": [
            "Business Permit Renewals & Government Liaison",
            "Office Relocation / Renovation Planning",
            "Disaster Readiness & Health Protocol Compliance",
            "Asset Tagging and Inventory",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration",
            "Office Administration Discipline",
        ],
        "certification_benchmarks": [
            "Certified Administrative Professional (CAP)",
            "Civil Service Professional",
        ]
    },
    "Algorithms Engineer": {
        "version": "1.0.0",
        "domain": "Computer Science & Advanced Algorithms",
        "required_skills": [
            "Advanced Data Structures",
            "Algorithm Design & Complexity Analysis",
            "Graph Algorithms & Optimization",
            "C++ / Python",
            "Dynamic Programming",
            "Mathematical Modeling",
        ],
        "recommended_skills": [
            "Parallel Computing (OpenMP / CUDA)",
            "Algorithmic Complexity (Big O)",
            "Numerical Methods",
            "High-Performance Computing",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Applied Mathematics / Computer Science",
        ],
        "certification_benchmarks": [
            "Competitive Programming Certification",
            "ACM ICPC Contender Badge",
        ]
    },
    "Analytics Consultant": {
        "version": "1.0.0",
        "domain": "Analytics & Management Advisory",
        "required_skills": [
            "Data-Driven Strategic Advisory",
            "Advanced Analytics & Insights Delivery",
            "Executive Presentation & Data Storytelling",
            "SQL & Business Analytics Platforms",
            "Client Stakeholder Management",
            "Strategic Roadmap Formulation",
        ],
        "recommended_skills": [
            "Change Management",
            "Financial Modeling",
            "Consulting Frameworks",
            "Tableau / Power BI",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Data Science and Analytics",
            "Bachelor of Science in Business Administration",
            "Information Technology",
        ],
        "certification_benchmarks": [
            "Certified Analytics Professional (CAP)",
            "Management Consulting Foundations",
        ]
    },
    "Architect": {
        "version": "1.0.0",
        "domain": "Architecture & Environmental Design",
        "required_skills": [
            "Architectural Design",
            "National Building Code of the Philippines (PD 1096)",
            "Building Information Modeling (BIM)",
            "AutoCAD and Revit",
            "Site Planning and Analysis",
            "Sustainable Architecture & LEED Principles",
        ],
        "recommended_skills": [
            "Structural Concept Coordination",
            "Architectural Specifications Writing",
            "Design Presentation & 3D Visualization",
            "Cost Estimation for Architecture",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Architecture",
            "Architecture Professional Degree",
        ],
        "certification_benchmarks": [
            "Registered Architect (PRC License)",
            "LEED Green Associate",
            "Autodesk Certified Professional: Revit Architecture",
        ]
    },
    "Auditor": {
        "version": "1.0.0",
        "domain": "Auditing & Assurance",
        "required_skills": [
            "Philippine Standards on Auditing (PSA)",
            "Audit Planning & Materiality Assessment",
            "Substantive Testing & Analytical Procedures",
            "Evaluation of Internal Control Systems",
            "Audit Working Papers Documentation",
            "Compliance & Regulatory Auditing",
        ],
        "recommended_skills": [
            "Computer-Assisted Audit Techniques (CAATs)",
            "Fraud Examination Fundamentals",
            "Audit Report Drafting",
            "Risk Assessment Frameworks",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "Certified Public Accountant (CPA - PRC License)",
            "Certified Internal Auditor (CIA)",
        ]
    },
    "Automotive Engineer": {
        "version": "1.0.0",
        "domain": "Automotive Engineering & Vehicle Dynamics",
        "required_skills": [
            "Automotive Powertrain & Internal Combustion Engine Systems",
            "Electric Vehicle (EV) Propulsion & Battery Management Basics",
            "Chassis, Suspension & Braking System Design",
            "Automotive Diagnostics (OBD-II Scanning & Sensor Analysis)",
            "Vehicle Aerodynamics & Structural Crashworthiness Principles",
            "CAD for Automotive Assemblies",
        ],
        "recommended_skills": [
            "CAN Bus Automotive Network Protocol",
            "Automotive Emission Standards (Euro 4/Euro 6)",
            "Transmission Systems Modeling",
            "Preventive Fleet Maintenance",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Mechanical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Mechanical Engineer (PRC License)",
            "Automotive Service Excellence (ASE) Certified",
        ]
    },
    "Backend Developer": {
        "version": "1.0.0",
        "domain": "Web & Software Engineering",
        "required_skills": [
            "Python",
            "FastAPI",
            "PostgreSQL",
            "RESTful API Design",
            "Database Architecture",
            "Git",
        ],
        "recommended_skills": [
            "Docker",
            "Redis",
            "Authentication & JWT",
            "Microservices Architecture",
            "Celery / Background Tasks",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Bachelor of Science in Information Technology",
            "Software Engineering",
        ],
        "certification_benchmarks": [
            "AWS Certified Developer - Associate",
            "Oracle Certified Associate (OCA)",
        ]
    },
    "Banking Associate": {
        "version": "1.0.0",
        "domain": "Banking Operations & Customer Financial Services",
        "required_skills": [
            "Commercial & Retail Banking Operations",
            "Customer Account Servicing & Relationship Management",
            "Anti-Money Laundering (AML) & Know Your Customer (KYC) Protocols",
            "Banking Product Advisory (Loans, Deposits, Investments)",
            "Cash Handling, Balancing & Vault Procedures",
            "Banking Regulation Compliance (Bangko Sentral ng Pilipinas - BSP)",
        ],
        "recommended_skills": [
            "Bank Fraud Prevention Basics",
            "Cross-Selling Financial Products",
            "Core Banking Software Operations",
            "Customer Due Diligence",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Financial Management",
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "Civil Service Professional Eligibility",
            "BSP / AMLC Regulatory Compliance Certification",
        ]
    },
    "Behavioral Research Assistant": {
        "version": "1.0.0",
        "domain": "Behavioral Sciences & Psychological Research",
        "required_skills": [
            "Behavioral Research Methodologies & Experimental Design",
            "Quantitative & Qualitative Psychological Data Collection",
            "Human Subjects Research Ethics Compliance",
            "Literature Review & Synthesis of Psychological Studies",
            "Statistical Analysis of Survey & Experimental Data (SPSS / R)",
            "Research Manuscript Drafting & APA Formatting",
        ],
        "recommended_skills": [
            "Survey Instrument Construction",
            "Behavioral Coding & Observational Data Logging",
            "Focus Group Note-Taking",
            "Academic Poster Presentation",
        ],
        "education_benchmarks": [
            "Bachelor of Arts in Psychology",
            "Social Sciences",
        ],
        "certification_benchmarks": [
            "Certified Research Assistant",
            "Philippine Psychological Corporation (PAP) Member",
        ]
    },
    "Bookkeeper": {
        "version": "1.0.0",
        "domain": "Bookkeeping & Financial Records",
        "required_skills": [
            "Double-Entry Bookkeeping & Journal Entries",
            "Accounts Payable (AP) Invoice Processing & Voucher Prep",
            "Accounts Receivable (AR) Invoicing & Collections Tracking",
            "Bank Reconciliation Statements",
            "Petty Cash Fund Management",
            "Payroll Processing & Statutory Contribution Deductions",
        ],
        "recommended_skills": [
            "QuickBooks Online / Xero Bookkeeping",
            "Inventory Ledger Maintenance",
            "Preparation of Unadjusted Trial Balance",
        ],
        "education_benchmarks": [
            "Senior High School - ABM Strand",
            "Associate in Commercial Science",
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "TESDA Bookkeeping NC III",
            "Certified Bookkeeper (CB - Institute of Certified Bookkeepers)",
        ]
    },
    "Brand Associate": {
        "version": "1.0.0",
        "domain": "Brand Management & Marketing Activation",
        "required_skills": [
            "Brand Identity & Visual Style Guidelines Governance",
            "Brand Campaign Activation & Event Coordination",
            "Marketing Collateral & Promotional Asset Coordination",
            "Consumer Perception & Brand Sentiment Tracking",
            "Creative Agency Briefing & Oversight",
            "Brand Sponsorship & Partnership Management",
        ],
        "recommended_skills": [
            "Merchandising & POS Displays",
            "Budget Tracking for Brand Campaigns",
            "Media Kit Distribution",
            "Competitor Brand Monitoring",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Marketing Management",
            "Communications",
        ],
        "certification_benchmarks": [
            "Brand Management Foundations Certificate",
            "Google Analytics Certified",
        ]
    },
    "Business Analyst": {
        "version": "1.0.0",
        "domain": "Business Analysis & Requirements Engineering",
        "required_skills": [
            "Business Requirements Elicitation & Documentation (BRD/FRD)",
            "Business Process Modeling Notation (BPMN)",
            "Gap Analysis & As-Is / To-Be Process Mapping",
            "Stakeholder Communication & Conflict Resolution",
            "User Acceptance Testing (UAT) Coordination",
            "Agile / Scrum Framework Knowledge",
        ],
        "recommended_skills": [
            "Data Flow Diagrams (DFD)",
            "Cost-Benefit Feasibility Analysis",
            "Functional Specification Writing",
            "Jira & Confluence Management",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration",
            "Bachelor of Science in Information Technology",
            "Industrial Engineering",
        ],
        "certification_benchmarks": [
            "Entry Certificate in Business Analysis (ECBA - IIBA)",
            "Certified Scrum Master (CSM)",
        ]
    },
    "Business Intelligence Analyst": {
        "version": "1.0.0",
        "domain": "Business Intelligence & Analytics",
        "required_skills": [
            "Business Intelligence Dashboarding",
            "Power BI / Tableau",
            "SQL & Relational Data Modeling",
            "ETL Process Understanding",
            "KPI Definition & Tracking",
            "Data Warehousing Fundamentals",
        ],
        "recommended_skills": [
            "DAX & Power Query",
            "Dimensional Modeling (Star Schema)",
            "Stakeholder Reporting",
            "Python Basics",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Data Science and Analytics",
            "Bachelor of Science in Information Technology",
            "Business Administration",
        ],
        "certification_benchmarks": [
            "Microsoft Certified: Power BI Data Analyst Associate",
            "Tableau Certified Data Analyst",
        ]
    },
    "Business Operations Specialist": {
        "version": "1.0.0",
        "domain": "Business Operations & Process Governance",
        "required_skills": [
            "Business Process Optimization & Efficiency Tracking",
            "Standard Operating Procedures (SOP) Formulation",
            "Operational KPI Dashboard Monitoring",
            "Cross-Departmental Operational Coordination",
            "Operational Incident Resolution & Escalation Management",
            "Vendor Service Level Agreement (SLA) Monitoring",
        ],
        "recommended_skills": [
            "Change Implementation Support",
            "Cost Optimization in Operations",
            "Management Report Preparation",
            "Resource Capacity Scheduling",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration",
            "Industrial Engineering",
        ],
        "certification_benchmarks": [
            "Lean Six Sigma Yellow Belt",
            "Operations Excellence Certificate",
        ]
    },
    "CAD/BIM Specialist": {
        "version": "1.0.0",
        "domain": "Building Information Modeling & Digital Drafting",
        "required_skills": [
            "Building Information Modeling (BIM) Standards",
            "Autodesk Revit Modeling (Architecture/Structure/MEP)",
            "AutoCAD 2D Drafting & Detailing",
            "BIM Coordination & Clash Detection (Navisworks)",
            "Parametric Family Creation in Revit",
            "Construction Drawing Documentation",
        ],
        "recommended_skills": [
            "BIM Execution Plan (BEP) Understanding",
            "Point Cloud to BIM Modeling",
            "Dynamo Visual Scripting",
            "Drawing Standards Compliance",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Architecture",
            "Bachelor of Science in Civil Engineering",
            "Technical Drafting",
        ],
        "certification_benchmarks": [
            "Autodesk Certified Professional: Revit Architecture",
            "Autodesk Certified Professional: AutoCAD",
        ]
    },
    "Chemical Engineer": {
        "version": "1.0.0",
        "domain": "Chemical Engineering & Process Technology",
        "required_skills": [
            "Unit Operations & Chemical Separation Processes",
            "Mass & Energy Balances",
            "Chemical Reaction Engineering & Kinetics",
            "Thermodynamics & Fluid Dynamics",
            "Process Safety Management & Hazardous Materials (DOLE OSH)",
            "Chemical Process Simulation (Aspen Plus / ChemCAD)",
        ],
        "recommended_skills": [
            "Piping and Instrumentation Diagrams (P&ID)",
            "Industrial Wastewater Chemistry",
            "Process Optimization",
            "Quality Assurance in Chemical Industry",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Chemical Engineering",
            "Chemical Engineering Discipline",
        ],
        "certification_benchmarks": [
            "Registered Chemical Engineer (PRC License)",
            "Pollution Control Officer (PCO Accreditation - DENR)",
        ]
    },
    "Civil Engineer": {
        "version": "1.0.0",
        "domain": "Civil & Infrastructure Engineering",
        "required_skills": [
            "Civil Engineering Principles",
            "Structural Fundamentals & Design",
            "Surveying & Leveling Calculations",
            "AutoCAD Civil 3D",
            "Construction Materials Testing & Quality Control",
            "National Building Code of the Philippines (PD 1096)",
        ],
        "recommended_skills": [
            "Quantity Surveying & Estimation",
            "Site Safety Management (DOLE CHSP)",
            "Soil Mechanics Basics",
            "Project Scheduling (MS Project)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Civil Engineering",
            "Civil Engineering Discipline",
        ],
        "certification_benchmarks": [
            "Registered Civil Engineer (PRC License)",
            "DOLE Accredited Safety Officer 2 (SO2)",
        ]
    },
    "Cloud Engineer": {
        "version": "1.0.0",
        "domain": "Cloud & Infrastructure",
        "required_skills": [
            "Amazon Web Services (AWS)",
            "Cloud Architecture",
            "Linux Administration",
            "Infrastructure as Code (Terraform)",
            "Docker",
            "Networking Fundamentals",
        ],
        "recommended_skills": [
            "Kubernetes",
            "CI/CD Pipelines",
            "Bash Scripting",
            "Cloud Security",
            "Cost Optimization",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Bachelor of Science in Computer Science",
        ],
        "certification_benchmarks": [
            "AWS Certified Solutions Architect - Associate",
            "Microsoft Certified: Azure Solutions Architect",
        ]
    },
    "Communications Assistant": {
        "version": "1.0.0",
        "domain": "Corporate Communications & Information Dissemination",
        "required_skills": [
            "Internal Corporate Communication & Newsletter Writing",
            "Executive Announcement & Memo Drafting",
            "Digital Communication Channels Management (Intranet, Slack)",
            "Audio-Visual Presentation Scriptwriting",
            "Event Communication Logistics",
            "Cross-Department Information Gathering",
        ],
        "recommended_skills": [
            "Survey Drafting for Employee Feedback",
            "Basic Layout in Canva / InDesign",
            "Speech Preparation Support",
            "Corporate Social Responsibility Writing",
        ],
        "education_benchmarks": [
            "Senior High School - HUMSS Strand",
            "Bachelor of Arts in Communication",
        ],
        "certification_benchmarks": [
            "Civil Service Professional",
            "IABC Student / Associate Member",
        ]
    },
    "Community Relations Officer": {
        "version": "1.0.0",
        "domain": "Community Engagement & Stakeholder Governance",
        "required_skills": [
            "Community Needs Assessment & Stakeholder Analysis",
            "Public Consultation & Community Dialogue Facilitation",
            "Corporate Social Responsibility (CSR) Program Management",
            "Government & NGO Partnership Liaison",
            "Conflict Resolution & Community Grievance Redress",
            "Social Impact Reporting & Documentation",
        ],
        "recommended_skills": [
            "Media Outreach for Community Events",
            "Grassroots Community Organizing",
            "Crisis Communication Support",
            "Advocacy Campaign Coordination",
        ],
        "education_benchmarks": [
            "Bachelor of Arts in Psychology",
            "Bachelor of Science in Political Science",
            "Development Communication",
        ],
        "certification_benchmarks": [
            "Civil Service Professional",
            "PRC Environmental Planner Track",
        ]
    },
    "Compensation and Benefits Analyst": {
        "version": "1.0.0",
        "domain": "Compensation, Benefits & Total Rewards",
        "required_skills": [
            "Job Evaluation & Salary Structure Grading",
            "Salary Benchmarking & Market Compensation Surveys",
            "Statutory Benefit Administration & Compliance (SSS, PhilHealth, Pag-IBIG, DOLE 13th Month)",
            "Payroll Computation, Tax Shielding & Deductions",
            "Total Rewards Strategy & Incentive Plan Modeling",
            "Benefits Cost-Benefit Analysis",
        ],
        "recommended_skills": [
            "Health Maintenance Organization (HMO) Procurement & Administration",
            "Employee Loan Programs",
            "Separation Pay Calculations",
            "Executive Compensation Basics",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Human Resource Management",
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "Certified Compensation Professional (CCP)",
            "Total Rewards Specialist",
        ]
    },
    "Computer Engineer": {
        "version": "1.0.0",
        "domain": "Computer Engineering & Hardware",
        "required_skills": [
            "Digital Logic Design",
            "Microprocessor Systems & Architecture",
            "Embedded C Programming",
            "Computer Hardware Architecture",
            "Computer Networks & Interfacing",
            "FPGA / VHDL Fundamentals",
        ],
        "recommended_skills": [
            "PCB Design (Eagle / Altium)",
            "Circuit Simulation",
            "Operating Systems Internals",
            "Linux for Embedded Devices",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Engineering",
            "Computer Engineering Discipline",
        ],
        "certification_benchmarks": [
            "Certified Computer Engineer (PRC / CPECB Certification)",
            "Cisco Certified Network Associate (CCNA)",
        ]
    },
    "Construction Manager": {
        "version": "1.0.0",
        "domain": "Construction Management & Executive Execution",
        "required_skills": [
            "Construction Project Lifecycle Management",
            "Construction Safety Administration (DOLE OSH / CHSP)",
            "Master Construction Scheduling (Primavera P6)",
            "Contractual Dispute Resolution & FIDIC Conditions",
            "Quality Control & Quality Assurance (QA/QC) Management",
            "Multi-Contractor & Trade Coordination",
        ],
        "recommended_skills": [
            "Construction Cost Budgeting & Cash Flow Forecasting",
            "Value Engineering in Construction",
            "Subcontractor Negotiation",
            "Turnover & Closeout Procedures",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Civil Engineering",
            "Bachelor of Science in Architecture",
            "Construction Engineering",
        ],
        "certification_benchmarks": [
            "Registered Civil Engineer or Architect (PRC License)",
            "Certified Construction Project Manager (CCPM)",
        ]
    },
    "Content Writer": {
        "version": "1.0.0",
        "domain": "Creative Writing & Content Marketing",
        "required_skills": [
            "Article & Blog Copywriting",
            "Search Engine Optimization (SEO) Copywriting",
            "Research, Fact-Checking & Source Verification",
            "Editorial Tone & Style Adaptation",
            "Proofreading & Grammatical Editing (AP / Chicago Style)",
            "Content Management Systems (WordPress)",
        ],
        "recommended_skills": [
            "Headline Optimization",
            "Creative Storytelling",
            "Social Media Copy Drafting",
            "Interviewing for Feature Stories",
        ],
        "education_benchmarks": [
            "Senior High School - HUMSS Strand",
            "Bachelor of Arts in Communication Arts",
            "Journalism",
        ],
        "certification_benchmarks": [
            "HubSpot Content Marketing Certified",
            "SEO Copywriting Certificate",
        ]
    },
    "Control Systems Engineer": {
        "version": "1.0.0",
        "domain": "Industrial Automation & Control Engineering",
        "required_skills": [
            "Programmable Logic Controllers (PLC Programming - Siemens, Allen-Bradley)",
            "Supervisory Control and Data Acquisition (SCADA)",
            "Human-Machine Interface (HMI) Design",
            "Industrial Instrumentation & Sensor Calibration",
            "Industrial Communication Protocols (Modbus, Profibus, Ethernet/IP)",
            "PID Loop Tuning & Control Strategy Implementation",
        ],
        "recommended_skills": [
            "Distributed Control Systems (DCS)",
            "Safety Instrumented Systems (SIS)",
            "Piping and Instrumentation Diagram (P&ID) Interpretation",
            "Control Panel Wiring Standards",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electrical Engineering",
            "Bachelor of Science in Electronics Engineering",
            "Mechanical Engineering",
        ],
        "certification_benchmarks": [
            "Certified Automation Professional (CAP)",
            "Siemens / Rockwell Automation Certified Specialist",
        ]
    },
    "Cost Estimator": {
        "version": "1.0.0",
        "domain": "Quantity Surveying & Cost Engineering",
        "required_skills": [
            "Quantity Takeoff (QTO) & Measurement Standards (POMI)",
            "Bill of Quantities (BOQ) Preparation",
            "Unit Price Analysis (UPA) & Cost Breakdown Structure",
            "Construction Material & Labor Costing",
            "Tendering & Bid Document Preparation",
            "Cost Management Software (PlanSwift / Advanced Excel)",
        ],
        "recommended_skills": [
            "Value Engineering",
            "Variation Order Cost Evaluation",
            "Subcontractor Price Comparison",
            "Cash Flow Projection",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Civil Engineering",
            "Bachelor of Science in Architecture",
        ],
        "certification_benchmarks": [
            "Registered Civil Engineer or Architect (PRC License)",
            "Certified Cost Professional (CCP)",
        ]
    },
    "Counseling Assistant": {
        "version": "1.0.0",
        "domain": "Counseling Support & Mental Health Services",
        "required_skills": [
            "Basic Counseling Skills (Active Listening, Empathy, Reflection)",
            "Client Intake & Mental Health Screening Procedures",
            "Counseling Session Notes & Documentation (SOAP Notes)",
            "Psychological First Aid & Suicide Prevention Protocols",
            "Ethical Guidelines in Mental Health Practice",
            "Mental Health Support Group Coordination",
        ],
        "recommended_skills": [
            "Relaxation & Stress Management Techniques Facilitation",
            "Client File Confidentiality Management",
            "Wellness Workshop Organization",
        ],
        "education_benchmarks": [
            "Bachelor of Arts in Psychology",
            "Guidance and Counseling",
        ],
        "certification_benchmarks": [
            "Mental Health First Aid Certified",
            "Psychological First Aid Certificate",
        ]
    },
    "Credit Analyst": {
        "version": "1.0.0",
        "domain": "Credit Risk Assessment & Underwriting",
        "required_skills": [
            "Borrower Financial Statement Analysis & Cash Flow Assessment",
            "Credit Risk Underwriting & Repayment Capacity Evaluation",
            "Credit Scoring & Rating Models",
            "Loan Structuring & Covenant Recommendations",
            "Collateral Appraisal Verification & Coverage Analysis",
            "Credit Proposal & Approval Memorandum Preparation",
        ],
        "recommended_skills": [
            "Non-Performing Loan (NPL) Monitoring",
            "Industry Risk Assessment",
            "Credit Bureau Inquiries (CIC / CIBI)",
            "Regulatory Compliance (BSP Circulars)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Financial Management",
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "Credit Risk Certified (CRC)",
            "Certified Credit and Collections Specialist",
        ]
    },
    "Customer Service Representative": {
        "version": "1.0.0",
        "domain": "Customer Support & Client Services",
        "required_skills": [
            "Customer Communication Skills (Verbal & Written)",
            "Helpdesk & CRM System Operation (Zendesk / Salesforce)",
            "Customer Inquiry & Issue Resolution",
            "Active Listening & De-escalation Techniques",
            "Service Level Agreement (SLA) Adherence & Response Metrics",
            "Call Logging & Ticket Documentation",
        ],
        "recommended_skills": [
            "Omnichannel Support (Chat, Email, Voice)",
            "Customer Satisfaction (CSAT) Awareness",
            "Product Knowledge Mastery",
            "Billing Inquiry Handling",
        ],
        "education_benchmarks": [
            "Senior High School - GAS Strand",
            "Senior High School - TVL Strand",
            "Undergraduate Degree Any Field",
        ],
        "certification_benchmarks": [
            "Contact Center Services NC II (TESDA)",
            "Customer Service Professional Certificate",
        ]
    },
    "Cybersecurity Analyst": {
        "version": "1.0.0",
        "domain": "Information Security",
        "required_skills": [
            "Vulnerability Assessment",
            "Network Security",
            "Security Information and Event Management (SIEM)",
            "Incident Response",
            "Firewall Configuration",
            "Threat Modeling",
        ],
        "recommended_skills": [
            "Penetration Testing Tools (Kali Linux / Metasploit)",
            "Wireshark Packet Analysis",
            "Security Auditing",
            "ISO 27001 Knowledge",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Bachelor of Science in Computer Science",
        ],
        "certification_benchmarks": [
            "CompTIA Security+",
            "Certified Ethical Hacker (CEH)",
            "Cisco Certified CyberOps Associate",
        ]
    },
    "Data Analyst": {
        "version": "1.0.0",
        "domain": "Data Analytics & Business Intelligence",
        "required_skills": [
            "Data Cleaning & Preprocessing",
            "SQL",
            "Excel Advanced Analytics",
            "Tableau / Power BI",
            "Descriptive Statistics",
            "Data Storytelling & Reporting",
        ],
        "recommended_skills": [
            "Python (Pandas / Matplotlib)",
            "Data Warehousing Basics",
            "Business Acumen",
            "KPI Dashboard Development",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Data Science and Analytics",
            "Bachelor of Science in Information Technology",
            "Bachelor of Science in Business Administration",
        ],
        "certification_benchmarks": [
            "Google Data Analytics Professional Certificate",
            "Microsoft Certified: Power BI Data Analyst Associate",
        ]
    },
    "Data Engineer": {
        "version": "1.0.0",
        "domain": "Data Engineering & Architecture",
        "required_skills": [
            "Data Pipeline Development (ETL/ELT)",
            "SQL & Database Optimization",
            "Python / Scala",
            "Data Warehousing (Snowflake / BigQuery)",
            "Big Data Technologies (Spark / Hadoop)",
            "Workflow Orchestration (Airflow)",
        ],
        "recommended_skills": [
            "Kafka / Real-time Streaming",
            "Docker",
            "Cloud Data Architecture (AWS / GCP)",
            "Data Modeling",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Bachelor of Science in Data Science and Analytics",
            "Information Technology",
        ],
        "certification_benchmarks": [
            "AWS Certified Data Analytics - Specialty",
            "Google Cloud Professional Data Engineer",
        ]
    },
    "Data Scientist": {
        "version": "1.0.0",
        "domain": "Data Science & Advanced Analytics",
        "required_skills": [
            "Exploratory Data Analysis (EDA)",
            "Machine Learning",
            "Python",
            "Statistical Modeling",
            "SQL",
            "Data Visualization",
        ],
        "recommended_skills": [
            "Pandas & NumPy",
            "R Programming",
            "Hypothesis Testing",
            "Tableau / Power BI",
            "Feature Engineering",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Data Science and Analytics",
            "Bachelor of Science in Computer Science",
        ],
        "certification_benchmarks": [
            "IBM Data Science Professional Certificate",
            "Google Advanced Data Analytics Certificate",
        ]
    },
    "Database Administrator": {
        "version": "1.0.0",
        "domain": "Database Systems",
        "required_skills": [
            "Relational Database Management Systems (RDBMS)",
            "SQL Query Optimization",
            "Database Backup & Recovery",
            "Database Security & Access Control",
            "Data Modeling & Normalization",
            "Performance Tuning",
        ],
        "recommended_skills": [
            "PostgreSQL Administration",
            "MySQL",
            "Oracle Database",
            "NoSQL Databases (MongoDB)",
            "High Availability / Replication",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Bachelor of Science in Information Technology",
        ],
        "certification_benchmarks": [
            "Oracle Certified Professional (OCP)",
            "Microsoft Certified: Azure Database Administrator Associate",
        ]
    },
    "Design Architect": {
        "version": "1.0.0",
        "domain": "Architectural Design & Spatial Planning",
        "required_skills": [
            "Schematic Design & Conceptualization",
            "3D Visualization & Architectural Rendering (Lumion / Enscape)",
            "Spatial Planning & Ergonomics",
            "Architectural Presentation Techniques",
            "Design Iteration & Concept Modeling (SketchUp / Rhino)",
            "Building Facade Design",
        ],
        "recommended_skills": [
            "Material Board Preparation",
            "Photoshop Post-Processing",
            "Client Pitch Preparation",
            "Zoning Compliance Analysis",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Architecture",
        ],
        "certification_benchmarks": [
            "Registered Architect (PRC License)",
            "Autodesk Certified User: 3ds Max",
        ]
    },
    "DevOps Specialist": {
        "version": "1.0.0",
        "domain": "DevOps & Cloud Systems",
        "required_skills": [
            "CI/CD Pipelines",
            "Docker",
            "Linux Administration",
            "Git",
            "Infrastructure Automation",
            "Cloud Infrastructure (AWS)",
        ],
        "recommended_skills": [
            "Kubernetes",
            "Terraform",
            "Ansible",
            "Prometheus & Grafana Monitoring",
            "Bash Scripting",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Bachelor of Science in Information Technology",
        ],
        "certification_benchmarks": [
            "Certified Kubernetes Administrator (CKA)",
            "AWS Certified DevOps Engineer",
        ]
    },
    "Digital Marketing Officer": {
        "version": "1.0.0",
        "domain": "Digital Marketing & Performance Media",
        "required_skills": [
            "Search Engine Optimization (On-Page, Off-Page, Technical SEO)",
            "Pay-Per-Click Advertising (Google Ads, Meta Ads Manager)",
            "Social Media Advertising Strategy & Retargeting",
            "Conversion Rate Optimization (CRO) & A/B Testing",
            "Email Marketing & Lead Nurturing Workflows",
            "Web Analytics (Google Analytics 4 / Google Tag Manager)",
        ],
        "recommended_skills": [
            "Influencer Campaign Management",
            "Digital Marketing Budget Management",
            "Copywriting for Ad Conversions",
            "E-commerce Platform Optimization",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Marketing Management",
            "Information Technology",
        ],
        "certification_benchmarks": [
            "Google Ads Certified Professional",
            "Meta Certified Digital Marketing Associate",
        ]
    },
    "ERP Implementation Specialist": {
        "version": "1.0.0",
        "domain": "Enterprise Resource Planning Systems",
        "required_skills": [
            "ERP Platform Implementation (SAP, Oracle, NetSuite, Odoo)",
            "Business Process Re-engineering (BPR)",
            "ERP Functional Configuration & Master Data Setup",
            "Cross-Module Integration (FI/CO, SD, MM, HR)",
            "User Acceptance Testing (UAT) & Defect Management",
            "Go-Live Planning & Cutover Transition Strategy",
        ],
        "recommended_skills": [
            "Data Migration Tools",
            "Post-Go-Live Hypercare Support",
            "User Training Manual Development",
            "Requirements Traceability Matrix",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accounting Information System",
            "Bachelor of Science in Information Technology",
            "Industrial Engineering",
        ],
        "certification_benchmarks": [
            "SAP Certified Associate",
            "Oracle Certified Specialist",
        ]
    },
    "Electrical Design Engineer": {
        "version": "1.0.0",
        "domain": "Electrical Systems Design & Building Electrification",
        "required_skills": [
            "Building Electrical Design & Single-Line Diagrams",
            "Lighting Layout & Lux Calculations (DIALux / Relux)",
            "Conduit, Cable Tray & Conductor Sizing",
            "Voltage Drop & Fault Current Calculations",
            "AutoCAD Electrical",
            "PEC & National Electrical Code (NEC) Compliance",
        ],
        "recommended_skills": [
            "Power Factor Correction Design",
            "Harmonic Analysis Fundamentals",
            "Renewable Energy (Solar PV) System Layout",
            "Bill of Materials (BOM) Preparation",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electrical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Electrical Engineer (PRC License)",
            "Professional Electrical Engineer (PEE) Track",
        ]
    },
    "Electrical Engineer": {
        "version": "1.0.0",
        "domain": "Electrical Power & Systems Engineering",
        "required_skills": [
            "Philippine Electrical Code (PEC)",
            "Electrical Circuit Analysis & Power Systems",
            "Power Distribution & Panelboard Sizing",
            "Load Schedule & Short Circuit Calculations",
            "Electrical CAD Drafting",
            "Industrial Transformers & Switchgear Operations",
        ],
        "recommended_skills": [
            "Lighting Design (DIALux)",
            "Motor Control Centers (MCC)",
            "Grounding & Lightning Protection Systems",
            "Emergency Generator Systems",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electrical Engineering",
            "Electrical Engineering Discipline",
        ],
        "certification_benchmarks": [
            "Registered Electrical Engineer (PRC License)",
            "Certified Safety Officer 2 (SO2)",
        ]
    },
    "Electronics Engineer": {
        "version": "1.0.0",
        "domain": "Electronics & Telecommunications Engineering",
        "required_skills": [
            "Analog & Digital Electronic Circuits",
            "Microcontroller Interfacing & Embedded Firmware",
            "Electronic Circuit Simulation (Proteus / LTspice)",
            "Telecommunications & Waveform Analysis",
            "PCB Layout & Soldering Protocols",
            "Oscilloscopes, Spectrum Analyzers & Signal Generators Testing",
        ],
        "recommended_skills": [
            "Philippine Electronics Code Compliance",
            "Semiconductor Basics",
            "Fiber Optic Testing Basics",
            "Wireless System Configuration",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electronics Engineering",
            "Electronics Engineering Discipline",
        ],
        "certification_benchmarks": [
            "Registered Electronics Engineer (PRC License)",
            "Certified Electronics Technician",
        ]
    },
    "Embedded Software Engineer": {
        "version": "1.0.0",
        "domain": "Embedded Systems & Firmware Development",
        "required_skills": [
            "Embedded C / C++ Programming",
            "Real-Time Operating Systems (RTOS - FreeRTOS)",
            "Microcontroller Architecture (ARM Cortex-M, ESP32)",
            "Hardware Communication Protocols (I2C, SPI, UART, CAN)",
            "Hardware Debugging with Oscilloscope, Logic Analyzer & JTAG",
            "Device Driver Development",
        ],
        "recommended_skills": [
            "Memory-Constrained Optimization",
            "Bare-Metal Programming",
            "Embedded Linux",
            "Firmware Over-The-Air (FOTA) Updates",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Engineering",
            "Bachelor of Science in Electronics Engineering",
            "Computer Science",
        ],
        "certification_benchmarks": [
            "Certified Embedded Systems Engineer",
            "ARM Accredited Engineer",
        ]
    },
    "Embedded Systems Engineer": {
        "version": "1.0.0",
        "domain": "Embedded Hardware & Software Systems",
        "required_skills": [
            "Microcontroller Architecture (ARM Cortex, PIC, AVR)",
            "Embedded C/C++ Development",
            "Hardware Interfacing (I2C, SPI, UART, GPIO)",
            "Real-Time Embedded Firmware Development",
            "Electronic Circuit Prototyping & Breadboarding",
            "Hardware Troubleshooting & Logic Analyzer Usage",
        ],
        "recommended_skills": [
            "RTOS Fundamentals",
            "Low-Power Design for IoT",
            "PCB Design for Microcontrollers",
            "Automotive CAN Protocol",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electronics Engineering",
            "Bachelor of Science in Computer Engineering",
        ],
        "certification_benchmarks": [
            "Certified Embedded Hardware Specialist",
            "Microchip Certified Professional",
        ]
    },
    "Engineering Student Assistant": {
        "version": "1.0.0",
        "domain": "Engineering Academic Support & Laboratory Operations",
        "required_skills": [
            "Engineering Laboratory Equipment Preparation & Calibration",
            "Basic Technical Drafting & CAD Assistance",
            "Laboratory Safety Enforcement & Cleanliness Protocols",
            "Engineering Data Entry & Spreadsheet Computation",
            "Inventory of Consumable Engineering Materials",
            "Student Tutoring in Engineering Mathematics Fundamentals",
        ],
        "recommended_skills": [
            "Classroom AV Setup",
            "Documentation of Laboratory Manuals",
            "Basic Circuit Troubleshooting Assistance",
        ],
        "education_benchmarks": [
            "Senior High School - STEM Strand",
            "Bachelor of Science in Engineering Programs",
        ],
        "certification_benchmarks": [
            "Safety Officer 1 (SO1) Certificate",
            "TESDA Technical Drafting NC II",
        ]
    },
    "Environmental Compliance Engineer": {
        "version": "1.0.0",
        "domain": "Environmental Engineering & Regulatory Affairs",
        "required_skills": [
            "Philippine Environmental Laws (RA 9003, RA 9275, RA 8749, RA 6969)",
            "Environmental Compliance Certificate (ECC) Processing",
            "Hazardous Waste Management & SMR Filing",
            "Wastewater Treatment Plant (WWTP) Operations",
            "Air Emission Testing & Monitoring",
            "Environmental Management Systems (ISO 14001)",
        ],
        "recommended_skills": [
            "Carbon Footprint Accounting",
            "Spill Response Protocols",
            "Environmental Impact Statement (EIS) Preparation",
            "DENR-EMB Liaison",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Chemical Engineering",
            "Bachelor of Science in Civil Engineering",
            "Environmental Engineering",
        ],
        "certification_benchmarks": [
            "Accredited Pollution Control Officer (DENR-EMB)",
            "ISO 14001 Internal Auditor",
        ]
    },
    "Financial Analyst": {
        "version": "1.0.0",
        "domain": "Corporate Finance & Investment",
        "required_skills": [
            "Financial Modeling & Valuation (DCF / Comps)",
            "Financial Statement Analysis & Ratio Interpretation",
            "Corporate Budgeting, Forecasting & Variance Analysis",
            "Working Capital & Cash Flow Management",
            "Advanced Financial Excel (Macros, Financial Formulas)",
            "Investment Appraisal (NPV, IRR, Payback)",
        ],
        "recommended_skills": [
            "Power BI Financial Dashboards",
            "Capital Budgeting",
            "Cost-Volume-Profit Analysis",
            "Macroeconomic Market Analysis",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accountancy",
            "Bachelor of Science in Business Administration major in Financial Management",
        ],
        "certification_benchmarks": [
            "Chartered Financial Analyst (CFA Level 1 Passed)",
            "Financial Modeling and Valuation Analyst (FMVA)",
        ]
    },
    "Financial Controller": {
        "version": "1.0.0",
        "domain": "Financial Governance & Management Accounting",
        "required_skills": [
            "Financial Controller Oversight & Governance",
            "Consolidated Financial Reporting & Analysis",
            "Statutory Compliance (SEC, BIR, PEZA, LGU)",
            "Budgetary Planning & Cost Control Governance",
            "Corporate Cash Flow & Working Capital Strategy",
            "Accounting Policies & Internal Control Systems Formulation",
        ],
        "recommended_skills": [
            "ERP System Financial Implementation",
            "Audit Committee Liaison",
            "Mergers & Acquisitions Due Diligence",
            "Treasury Oversight",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accountancy",
            "Master of Business Administration (MBA)",
        ],
        "certification_benchmarks": [
            "Certified Public Accountant (CPA - PRC License)",
            "Certified Management Accountant (CMA)",
        ]
    },
    "Financial Systems Consultant": {
        "version": "1.0.0",
        "domain": "Financial Systems Implementation & Advisory",
        "required_skills": [
            "Financial Software Implementation Lifecycle",
            "Client Accounting Needs Assessment & Gap Analysis",
            "Chart of Accounts Configuration & Financial Migration",
            "Integration of POS / Payroll with Financial Software",
            "End-User Accounting Software Training & Change Management",
            "Post-Implementation System Review & Optimization",
        ],
        "recommended_skills": [
            "Cloud Financial Systems (Xero, QuickBooks, NetSuite)",
            "Financial Reporting Customization",
            "Data Migration Reconciliation",
            "Project Management for Financial IT",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accounting Information System",
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "NetSuite Certified Financial User",
            "QuickBooks ProAdvisor Certified",
        ]
    },
    "Firmware Engineer": {
        "version": "1.0.0",
        "domain": "Low-Level Firmware & Microcontroller Systems",
        "required_skills": [
            "Low-Level Embedded C Programming",
            "Bootloader Development & Memory Mapping",
            "Microcontroller Registers & Hardware Abstraction Layer (HAL)",
            "Interrupt Service Routines (ISR) & Concurrency Control",
            "Sensor Interfacing & ADC/DAC Configuration",
            "Firmware Testing, Unit Testing & In-Circuit Emulation",
        ],
        "recommended_skills": [
            "Python for Test Automation",
            "Git for Firmware Projects",
            "Bare-Metal Systems Architecture",
            "Power Optimization in Battery-Operated Devices",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Engineering",
            "Bachelor of Science in Electronics Engineering",
        ],
        "certification_benchmarks": [
            "Certified Firmware Developer",
            "Microchip / STMicroelectronics Certified Developer",
        ]
    },
    "Frontend Developer": {
        "version": "1.0.0",
        "domain": "Web & Software Engineering",
        "required_skills": [
            "React",
            "JavaScript",
            "TypeScript",
            "HTML5 & CSS3",
            "Responsive Web Design",
            "REST API Integration",
        ],
        "recommended_skills": [
            "Next.js",
            "Tailwind CSS",
            "Web Performance Optimization",
            "Git",
            "State Management (Redux / Zustand)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Bachelor of Science in Computer Science",
            "Web Development",
        ],
        "certification_benchmarks": [
            "Meta Front-End Developer Professional Certificate",
            "AWS Certified Cloud Practitioner",
        ]
    },
    "Full Stack Developer": {
        "version": "1.0.0",
        "domain": "Full-Stack Engineering",
        "required_skills": [
            "React",
            "Node.js",
            "TypeScript",
            "PostgreSQL",
            "REST APIs",
            "Git Version Control",
        ],
        "recommended_skills": [
            "Docker",
            "Tailwind CSS",
            "Next.js",
            "GraphQL",
            "CI/CD Pipelines",
            "AWS",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Bachelor of Science in Information Technology",
            "Software Engineering",
        ],
        "certification_benchmarks": [
            "AWS Certified Solutions Architect - Associate",
            "Meta Full-Stack Engineer Certificate",
        ]
    },
    "Game Designer": {
        "version": "1.0.0",
        "domain": "Game Design & Interactive Systems",
        "required_skills": [
            "Game Mechanics Design",
            "Level Design & World Building",
            "Game Design Document (GDD) Writing",
            "Player Experience & Game Balance",
            "Rapid Game Prototyping",
            "Narrative & Quest Design",
        ],
        "recommended_skills": [
            "User Feedback & Playtesting Analysis",
            "Game Monetization & Economy Design",
            "Figma / Wireframing for Game UI",
            "Unity Basics",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Interactive Media Design",
        ],
        "certification_benchmarks": [
            "Unity Certified User: Programmer / Artist",
            "Certified Game Production Specialist",
        ]
    },
    "Game Developer": {
        "version": "1.0.0",
        "domain": "Game Development & Interactive Media",
        "required_skills": [
            "Game Engine Development (Unity / Unreal Engine)",
            "C# / C++ Programming",
            "3D Mathematics & Physics for Games",
            "Game Asset Integration",
            "Gameplay Mechanics Implementation",
            "Git Version Control",
        ],
        "recommended_skills": [
            "Shaders & Graphics Programming",
            "Multiplayer Networking Basics",
            "Game Optimization & Profiling",
            "Object-Oriented Game Architecture",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Bachelor of Science in Computer Science",
        ],
        "certification_benchmarks": [
            "Unity Certified Associate: Game Developer",
            "Unreal Engine Certified Creator",
        ]
    },
    "Geotechnical Engineer": {
        "version": "1.0.0",
        "domain": "Geotechnical & Foundation Engineering",
        "required_skills": [
            "Soil Mechanics & Geotechnical Site Investigation",
            "Soil Boring Log Interpretation & Standard Penetration Test (SPT)",
            "Shallow & Deep Foundation Design (Piles / Caissons)",
            "Slope Stability & Retaining Wall Analysis",
            "Soil Settlement & Bearing Capacity Calculations",
            "Plaxis / GeoStudio Geotechnical Software",
        ],
        "recommended_skills": [
            "Soil Improvement Techniques",
            "Seismic Liquefaction Assessment",
            "Groundwater Flow Modeling",
            "Laboratory Soil Testing (Atterberg Limits, Triaxial)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Civil Engineering",
            "Geotechnical Engineering Discipline",
        ],
        "certification_benchmarks": [
            "Registered Civil Engineer (PRC License)",
            "Geotechnical Specialist Accreditation",
        ]
    },
    "Guidance Associate": {
        "version": "1.0.0",
        "domain": "Guidance Counseling & Student Well-Being",
        "required_skills": [
            "Guidance & Counseling Principles & Ethical Standards",
            "Student Intake Interviewing & Needs Assessment",
            "Cumulative Record-Keeping & Student Profiling",
            "Guidance Program Administration (Career Guidance, Study Habits)",
            "Crisis Support & Psychological First Aid",
            "Referral System Coordination with Specialists",
        ],
        "recommended_skills": [
            "Career Guidance Workshop Facilitation",
            "Peer Counselor Training Support",
            "School Mental Health Advocacy",
            "Parent-Teacher Consultation Support",
        ],
        "education_benchmarks": [
            "Bachelor of Arts in Psychology",
            "Guidance and Counseling Discipline",
        ],
        "certification_benchmarks": [
            "Registered Guidance Counselor Track",
            "Psychological First Aid Provider",
        ]
    },
    "HR Business Partner": {
        "version": "1.0.0",
        "domain": "Strategic HR Consulting & Business Alignment",
        "required_skills": [
            "Strategic Workforce Planning & Organizational Design",
            "HR Consulting to Department Business Leaders",
            "Change Management Interventions",
            "Succession Planning & High-Potential Talent Identification",
            "Employee Engagement Strategy & Retention Analysis",
            "Organizational Culture Alignment & Transformation",
        ],
        "recommended_skills": [
            "Business P&L Understanding",
            "Executive Coaching & Advisory",
            "Performance Management Strategy",
            "Strategic Labor Relations",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Human Resource Management",
            "Bachelor of Arts in Psychology",
            "MBA",
        ],
        "certification_benchmarks": [
            "Senior Professional in Human Resources (SPHRi)",
            "Certified HR Business Partner",
        ]
    },
    "HR Generalist": {
        "version": "1.0.0",
        "domain": "End-to-End Human Resource Operations",
        "required_skills": [
            "End-to-End Employee Lifecycle Management",
            "Statutory Mandatory Benefits Administration (SSS, PhilHealth, Pag-IBIG)",
            "Talent Sourcing, Interviewing & Offer Preparation",
            "Timekeeping, Attendance & Leave Management",
            "Disciplinary Action Due Process (DOLE Standard)",
            "Company Culture & Employee Welfare Programs",
        ],
        "recommended_skills": [
            "Basic Payroll Computation",
            "HR Orientation Presentation",
            "Labor Law Compliance Documentation",
            "Workplace Incident Documentation",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Human Resource Management",
            "Bachelor of Arts in Psychology",
        ],
        "certification_benchmarks": [
            "Registered Human Resource Associate",
            "DOLE Labor Standards Certification",
        ]
    },
    "HR Specialist": {
        "version": "1.0.0",
        "domain": "Human Resources Management & Compliance",
        "required_skills": [
            "Philippine Labor Code Compliance & Guidelines",
            "Recruitment & Onboarding Procedures",
            "Employee Relations & Grievance Investigation",
            "HR Policies & Employee Handbook Implementation",
            "Performance Appraisal Administration",
            "HRIS System Management & Employee Records",
        ],
        "recommended_skills": [
            "DOLE Inspection Compliance",
            "Employee Engagement Initiatives",
            "Offboarding & Exit Interview Management",
            "HR Analytics & Turnover Reporting",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Human Resource Management",
            "Bachelor of Arts in Psychology",
        ],
        "certification_benchmarks": [
            "Certified Human Resource Professional (CHRP)",
            "Civil Service Professional",
        ]
    },
    "HVAC Engineer": {
        "version": "1.0.0",
        "domain": "HVAC Systems Design & Thermal Engineering",
        "required_skills": [
            "Heating, Ventilation, and Air Conditioning (HVAC) Sizing",
            "Cooling Load Calculations (Carrier HAP / Elite)",
            "Ductwork Design & Air Balancing Standards (SMACNA)",
            "Chilled Water Piping & Pump Selection",
            "ASHRAE Building Energy Efficiency Standards",
            "Cleanroom & Specialized Ventilation Design",
        ],
        "recommended_skills": [
            "AutoCAD / Revit MEP for HVAC",
            "Variable Refrigerant Flow (VRF) Systems",
            "Building Management Systems (BMS) Controls",
            "Cooling Tower Operations",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Mechanical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Mechanical Engineer (PRC License)",
            "Certified Energy Manager (CEM)",
        ]
    },
    "Hardware Engineer": {
        "version": "1.0.0",
        "domain": "Electronic Hardware Design & Prototyping",
        "required_skills": [
            "Schematic Capture & PCB Layout (Altium Designer / KiCAD)",
            "Digital & Analog Circuit Design",
            "Component Selection & Bill of Materials (BOM) Management",
            "Hardware Testing & Signal Integrity Analysis",
            "Power Distribution & Thermal Management in Circuits",
            "Design for Manufacturability (DFM) & Assembly (DFA)",
        ],
        "recommended_skills": [
            "FPGA Programming (Verilog / VHDL)",
            "Soldering & Surface-Mount Device (SMD) Prototyping",
            "Electromagnetic Compatibility (EMC) Compliance",
            "Oscilloscope Verification",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Engineering",
            "Bachelor of Science in Electronics Engineering",
        ],
        "certification_benchmarks": [
            "IPC Certified IPC Specialist (CIS)",
            "Certified Hardware Design Specialist",
        ]
    },
    "IT Support Specialist": {
        "version": "1.0.0",
        "domain": "Information Technology Support",
        "required_skills": [
            "Technical Support & Troubleshooting",
            "Hardware Diagnostics & Repair",
            "Operating Systems Installation",
            "Help Desk Operations",
            "Customer Service",
            "Software Configuration",
        ],
        "recommended_skills": [
            "Active Directory",
            "Remote Desktop Support",
            "Basic Network Configuration",
            "Ticket Management Systems (Jira / ServiceNow)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Associate in Computer Technology",
            "Information Systems",
        ],
        "certification_benchmarks": [
            "CompTIA A+",
            "Google IT Support Professional Certificate",
        ]
    },
    "IT Support Technician": {
        "version": "1.0.0",
        "domain": "Information Technology Technical Support",
        "required_skills": [
            "Computer Hardware Troubleshooting & Component Assembly",
            "Operating System Installation & Driver Configuration (Windows / Linux)",
            "Local Area Network (LAN) Cabling, RJ45 Crimping & Testing",
            "Printer, Scanner & Peripheral Device Setup",
            "Malware & Virus Removal Protocols",
            "Technical Troubleshooting & End-User Support",
        ],
        "recommended_skills": [
            "Preventive Hardware Maintenance",
            "BIOS / UEFI Configuration",
            "Basic Router / Switch Configuration",
            "Customer Communication",
        ],
        "education_benchmarks": [
            "Senior High School - TVL ICT Strand",
            "Associate in Computer Technology",
            "BSIT Undergraduate",
        ],
        "certification_benchmarks": [
            "TESDA Computer Systems Servicing (CSS) NC II",
            "CompTIA IT Fundamentals (ITF+)",
        ]
    },
    "Industrial Engineer": {
        "version": "1.0.0",
        "domain": "Industrial Engineering & Process Optimization",
        "required_skills": [
            "Methods Engineering & Work Measurement (Time & Motion Study)",
            "Operations Research & Linear Programming",
            "Total Quality Management & Lean Six Sigma",
            "Supply Chain Planning & Inventory Optimization",
            "Statistical Quality Control (SQC)",
            "Facilities Planning & Plant Layout Optimization",
        ],
        "recommended_skills": [
            "Ergonomics & Workstation Design",
            "Discrete-Event Process Simulation (Arena / ProModel)",
            "Project Management Principles",
            "Data Analytics with Excel / Minitab",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Industrial Engineering",
            "Industrial Engineering Discipline",
        ],
        "certification_benchmarks": [
            "Certified Industrial Engineer (CIE - PIIE)",
            "Six Sigma Green Belt",
        ]
    },
    "Information Technology Specialist": {
        "version": "1.0.0",
        "domain": "Information Technology",
        "required_skills": [
            "Network Administration",
            "System Administration",
            "Linux Administration",
            "IT Infrastructure",
            "Information Security",
            "Technical Support & Troubleshooting",
        ],
        "recommended_skills": [
            "Python",
            "Bash Scripting",
            "Cloud Infrastructure",
            "Active Directory",
            "Virtualization",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Information Technology Discipline",
            "Information Systems Degree",
            "Computer Science",
        ],
        "certification_benchmarks": [
            "CompTIA A+",
            "CompTIA Network+",
            "CompTIA Security+",
            "Cisco Certified Network Associate (CCNA)",
            "Microsoft Certified: Windows Server",
        ]
    },
    "Interior Designer": {
        "version": "1.0.0",
        "domain": "Interior Architecture & Space Design",
        "required_skills": [
            "Interior Space Planning & Ergonomics",
            "Furniture, Fixtures & Equipment (FF&E) Specification",
            "Interior Lighting & Acoustic Design",
            "Material Finishes & Color Schemes",
            "AutoCAD / SketchUp Interior Detailing",
            "3D Interior Photorealistic Rendering",
        ],
        "recommended_skills": [
            "Philippine Interior Design Act Compliance",
            "Custom Millwork Design",
            "Budgeting for Interior Projects",
            "Vendor Coordination",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Interior Design",
            "Bachelor of Science in Architecture",
        ],
        "certification_benchmarks": [
            "Registered Interior Designer (PRC License)",
            "Certified Interior Decorator",
        ]
    },
    "Internal Auditor": {
        "version": "1.0.0",
        "domain": "Internal Audit & Risk Governance",
        "required_skills": [
            "Internal Audit Methodologies & Standards (IIA)",
            "Operational & Financial Risk Assessment",
            "Evaluation of Business Process Internal Controls",
            "COSO Internal Control - Integrated Framework",
            "Fraud Risk Assessment & Forensic Review",
            "Audit Findings Formulation & Recommendations",
        ],
        "recommended_skills": [
            "SOX / Governance Compliance",
            "Internal Audit Charter Compliance",
            "Data Analytics for Audit (ACL / IDEA)",
            "Executive Audit Presentation",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accountancy",
            "Bachelor of Science in Accounting Information System",
        ],
        "certification_benchmarks": [
            "Certified Internal Auditor (CIA)",
            "Certified Information Systems Auditor (CISA)",
        ]
    },
    "Inventory Planner": {
        "version": "1.0.0",
        "domain": "Inventory Optimization & Material Control",
        "required_skills": [
            "Inventory Control & Stock Level Optimization",
            "Economic Order Quantity (EOQ), Safety Stock & Reorder Points",
            "ABC Inventory Classification & Cycle Counting Management",
            "Inventory Turnover & Slow-Moving Stock Analysis",
            "Warehouse Management Systems (WMS) Stock Reconciliation",
            "Demand-Supply Reconciliation",
        ],
        "recommended_skills": [
            "Stockout Prevention Protocols",
            "Perishable Inventory Management (FIFO / FEFO)",
            "Damaged Goods Write-Off Procedures",
            "Material Tracking in ERP",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Logistics and Supply Chain Management",
            "Bachelor of Science in Industrial Engineering",
        ],
        "certification_benchmarks": [
            "Certified in Production and Inventory Management (CPIM)",
            "APICS Inventory Management Specialist",
        ]
    },
    "Investment Analyst": {
        "version": "1.0.0",
        "domain": "Investment Analysis & Portfolio Research",
        "required_skills": [
            "Equity & Fixed Income Research & Analysis",
            "Financial Valuation Models (DCF, DDM, Trading Multiples)",
            "Company & Industry Competitive Analysis",
            "Macroeconomic & Capital Market Trend Analysis",
            "Investment Thesis Formulation & Pitch Deck Preparation",
            "Risk-Return Profile & Portfolio Diversification",
        ],
        "recommended_skills": [
            "Bloomberg Terminal / FactSet Data Retrieval",
            "Technical Analysis of Financial Markets",
            "Quantitative Portfolio Screening",
            "Alternative Investments Basics",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Financial Management",
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "Chartered Financial Analyst (CFA Level 1 Passed)",
            "SEC Certified Securities Representative",
        ]
    },
    "IoT Solutions Architect": {
        "version": "1.0.0",
        "domain": "Internet of Things Architecture & Edge Systems",
        "required_skills": [
            "IoT System Architecture (End-to-End Edge to Cloud)",
            "IoT Communication Protocols (MQTT, CoAP, LoRaWAN, BLE)",
            "Embedded Sensors & Microcontroller Gateway Integration (ESP32 / Raspberry Pi)",
            "Cloud IoT Services (AWS IoT Core / Azure IoT Hub)",
            "Edge Computing & Local Data Filtering",
            "IoT Cybersecurity & Device Identity Provisioning",
        ],
        "recommended_skills": [
            "Time-Series Data Management",
            "Power-Efficient Wireless Sensor Networks",
            "Python / C++ for IoT",
            "REST & WebSockets Integration",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Engineering",
            "Bachelor of Science in Electronics Engineering",
            "Computer Science",
        ],
        "certification_benchmarks": [
            "AWS Certified IoT Specialist",
            "Microsoft Certified: Azure IoT Developer Specialty",
        ]
    },
    "Landscape Architect": {
        "version": "1.0.0",
        "domain": "Landscape Architecture & Environmental Planning",
        "required_skills": [
            "Landscape Site Planning & Master Planning",
            "Tropical Horticulture & Planting Design",
            "Hardscape Design & Grading Detailing",
            "Landscape Drainage & Irrigation Systems",
            "Site Ecology & Sustainable Landscaping",
            "AutoCAD Landscape Drafting",
        ],
        "recommended_skills": [
            "3D Landscape Visualization",
            "Environmental Protection Guidelines",
            "Plant Nursery Sourcing",
            "Park & Recreation Planning",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Landscape Architecture",
            "Bachelor of Science in Architecture",
        ],
        "certification_benchmarks": [
            "Registered Landscape Architect (PRC License)",
            "Landscape Industry Certification",
        ]
    },
    "Logistics Coordinator": {
        "version": "1.0.0",
        "domain": "Logistics Operations & Freight Forwarding",
        "required_skills": [
            "Domestic & International Freight Forwarding Operations",
            "Shipping Documentation (Bill of Lading, Packing List, Invoice)",
            "Customs Clearance & Bureau of Customs (BOC) Compliance",
            "Incoterms 2020 Rules Application",
            "Transportation Routing, Dispatch & Fleet Monitoring",
            "Carrier Negotiation & Logistics Cost Control",
        ],
        "recommended_skills": [
            "Reverse Logistics Management",
            "Cargo Tracking Systems",
            "Logistics Incident & Damage Claims Handling",
            "Cold Chain Logistics Basics",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Logistics and Supply Chain Management",
            "Bachelor of Science in Industrial Engineering",
        ],
        "certification_benchmarks": [
            "Certified Logistics Professional (CLP)",
            "Incoterms 2020 Certificate",
        ]
    },
    "Maintenance Engineer": {
        "version": "1.0.0",
        "domain": "Reliability Engineering & Equipment Maintenance",
        "required_skills": [
            "Reliability-Centered Maintenance (RCM) Strategy",
            "Total Productive Maintenance (TPM) Pillar Implementation",
            "Predictive Maintenance Techniques (Vibration, Thermography, Oil Analysis)",
            "Equipment Overhaul, Alignment & Bearing Replacement",
            "Root Cause Failure Analysis (RCFA)",
            "Computerized Maintenance Management Systems (CMMS)",
        ],
        "recommended_skills": [
            "Spare Parts Management & Criticality Analysis",
            "Pump & Motor Dynamic Balancing",
            "Safety Lockout/Tagout (LOTO) Procedures",
            "Maintenance KPI Tracking (MTBF / MTTR)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Mechanical Engineering",
            "Bachelor of Science in Electrical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Mechanical Engineer (PRC License)",
            "Certified Maintenance and Reliability Professional (CMRP)",
        ]
    },
    "Manufacturing Engineer": {
        "version": "1.0.0",
        "domain": "Manufacturing Processes & Tooling Design",
        "required_skills": [
            "Manufacturing Process Selection & Engineering Design",
            "Design for Manufacturability (DFM) & Assembly (DFA)",
            "Jig, Fixture & Tooling Design (SolidWorks / AutoCAD)",
            "CNC Machining & Toolpath Generation Basics",
            "Automated Assembly Line Balancing",
            "Shop Floor Safety & Industrial Standards",
        ],
        "recommended_skills": [
            "Equipment Maintenance Scheduling",
            "Capital Expenditure (CapEx) Justification",
            "Hydraulic & Pneumatic Systems in Manufacturing",
            "Ergonomic Tooling Setup",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Industrial Engineering",
            "Bachelor of Science in Mechanical Engineering",
        ],
        "certification_benchmarks": [
            "Certified Manufacturing Technologist",
            "SolidWorks Certified Associate",
        ]
    },
    "Marine Engineering Officer": {
        "version": "1.0.0",
        "domain": "Maritime Studies & Marine Engineering",
        "required_skills": [
            "Marine Diesel Engine Operation & Propulsion Systems",
            "Marine Auxiliary Machinery (Purifiers, Compressors, Bilge Pumps)",
            "Marine Electrical Systems, High Voltage & Switchboards",
            "Engine Room Watchkeeping & Logbook Maintenance (STCW)",
            "Maritime Safety, Firefighting & Life-Saving Appliances (SOLAS)",
            "MARINA & IMO Maritime Regulatory Compliance",
        ],
        "recommended_skills": [
            "Bunkering Procedures & Fuel Quality Control",
            "Oily Water Separator (OWS) Operations & MARPOL",
            "Marine Automation & Remote Control Systems",
            "Emergency Steering Gear Operation",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Marine Engineering",
        ],
        "certification_benchmarks": [
            "Officer in Charge of an Engineering Watch (OIC-EW - MARINA)",
            "STCW Certificates (Basic Training, Advanced Firefighting)",
        ]
    },
    "Market Research Analyst": {
        "version": "1.0.0",
        "domain": "Consumer Research & Market Intelligence",
        "required_skills": [
            "Quantitative & Qualitative Market Research Methodologies",
            "Survey Design, Questionnaire Formulation & Sampling Techniques",
            "Focus Group Discussion (FGD) Facilitation & Synthesis",
            "Consumer Behavior & Purchasing Habit Analysis",
            "Competitive Intelligence & Market Share Sizing",
            "Statistical Analysis of Survey Data (SPSS / Excel)",
        ],
        "recommended_skills": [
            "Data Visualization of Market Insights",
            "Customer Persona Development",
            "Product Concept Testing",
            "Industry Feasibility Studies",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Marketing Management",
            "Bachelor of Science in Data Science and Analytics",
        ],
        "certification_benchmarks": [
            "Professional Market Researcher Certification",
            "Certified Insights Analyst",
        ]
    },
    "Marketing Specialist": {
        "version": "1.0.0",
        "domain": "Business & Marketing Strategy",
        "required_skills": [
            "Digital Marketing Strategy & Campaign Management",
            "Market Research & Competitor Benchmarking",
            "Content Strategy, Copywriting & Storytelling",
            "Social Media Marketing & Community Engagement",
            "Brand Positioning & Value Proposition Formulation",
            "Marketing Analytics & Campaign ROI Reporting",
        ],
        "recommended_skills": [
            "Google Analytics 4",
            "Search Engine Optimization (SEO) Principles",
            "Email Marketing Platforms",
            "Canva / Creative Brief Development",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Marketing Management",
            "Business Administration Discipline",
        ],
        "certification_benchmarks": [
            "Google Digital Marketing & E-commerce Professional Certificate",
            "HubSpot Inbound Marketing Certified",
        ]
    },
    "Materials Engineer": {
        "version": "1.0.0",
        "domain": "Materials Science & Metallurgical Testing",
        "required_skills": [
            "Material Properties Characterization",
            "Mechanical Testing (Tensile, Compression, Hardness, Impact)",
            "Metallography & Microstructural Analysis",
            "Polymer, Composite & Ceramic Material Selection",
            "Failure Analysis & Corrosion Control",
            "Material Testing Standards (ASTM, JIS, ISO)",
        ],
        "recommended_skills": [
            "Non-Destructive Testing (NDT) Fundamentals",
            "Heat Treatment Procedures",
            "Scanning Electron Microscopy Basics",
            "Quality Assurance of Incoming Materials",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Chemical Engineering",
            "Bachelor of Science in Mechanical Engineering",
            "Materials Science",
        ],
        "certification_benchmarks": [
            "DPWH Accredited Materials Engineer (ME 1 / ME 2)",
            "Certified Materials Specialist",
        ]
    },
    "Mechanical Design Engineer": {
        "version": "1.0.0",
        "domain": "Mechanical Product Design & FEA Modeling",
        "required_skills": [
            "Parametric 3D CAD Modeling (SolidWorks / Inventor)",
            "Finite Element Analysis (FEA - Stress, Strain, Thermal)",
            "Geometric Dimensioning and Tolerancing (GD&T - ASME Y14.5)",
            "Mechanical Mechanism & Linkage Design",
            "Material Selection for Mechanical Components",
            "Engineering Drawing Preparation & BOM Generation",
        ],
        "recommended_skills": [
            "Design for Additive Manufacturing (3D Printing)",
            "Sheet Metal Design",
            "Prototype Fabrication & Testing",
            "Structural Simulation Validation",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Mechanical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Mechanical Engineer (PRC License)",
            "Certified SolidWorks Professional (CSWP)",
        ]
    },
    "Mechanical Engineer": {
        "version": "1.0.0",
        "domain": "Mechanical Systems & Machine Design",
        "required_skills": [
            "Machine Design & Mechanical Component Sizing",
            "Thermodynamics & Heat Transfer Fundamentals",
            "Fluid Mechanics & Piping Sizing",
            "AutoCAD & 3D Mechanical CAD (SolidWorks)",
            "Manufacturing & Fabrication Processes (Lathe, Milling, Welding)",
            "Mechanical Equipment Installation & Commissioning",
        ],
        "recommended_skills": [
            "Pneumatics and Hydraulics",
            "HVAC Fundamentals",
            "Internal Combustion Engines",
            "Mechanical Maintenance Standards",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Mechanical Engineering",
            "Mechanical Engineering Discipline",
        ],
        "certification_benchmarks": [
            "Registered Mechanical Engineer (PRC License)",
            "DOLE Safety Officer 2 (SO2)",
        ]
    },
    "Mobile Application Developer": {
        "version": "1.0.0",
        "domain": "Web & Mobile Development",
        "required_skills": [
            "React Native",
            "JavaScript",
            "TypeScript",
            "Mobile UI/UX Design",
            "REST API Integration",
            "Git",
        ],
        "recommended_skills": [
            "Android SDK",
            "iOS Development Fundamentals",
            "Expo Framework",
            "State Management",
            "SQLite",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Bachelor of Science in Computer Science",
        ],
        "certification_benchmarks": [
            "Meta React Native Specialization",
            "Google Associate Android Developer",
        ]
    },
    "Motion Graphics Artist": {
        "version": "1.0.0",
        "domain": "Motion Design & Visual Storytelling",
        "required_skills": [
            "Motion Graphics Design",
            "Adobe After Effects",
            "2D/3D Kinetic Typography",
            "Video Editing (Adobe Premiere Pro)",
            "Visual Pacing & Storyboarding",
            "Audio-Visual Synchronization",
        ],
        "recommended_skills": [
            "Cinema 4D Basics",
            "Audio Editing (Audition)",
            "Lottie / Web Animation",
            "Color Grading",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Multimedia Arts",
            "Broadcast Media",
        ],
        "certification_benchmarks": [
            "Adobe Certified Professional: Digital Video & Motion Design",
            "Maxon Certified Associate",
        ]
    },
    "Multimedia Artist": {
        "version": "1.0.0",
        "domain": "Digital Arts & Graphic Design",
        "required_skills": [
            "Digital Illustration & Concept Art",
            "Adobe Creative Suite (Photoshop & Illustrator)",
            "Typography & Layout Design",
            "Color Theory & Visual Composition",
            "Raster & Vector Graphic Creation",
            "Branding & Visual Identity Design",
        ],
        "recommended_skills": [
            "Print Production Standards",
            "UI Asset Preparation",
            "Photography & Image Retouching",
            "Social Media Graphics",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Multimedia Arts",
            "Fine Arts / Graphic Design",
        ],
        "certification_benchmarks": [
            "Adobe Certified Professional in Visual Design",
            "TESDA Visual Graphic Design NC III",
        ]
    },
    "Multimedia Assistant": {
        "version": "1.0.0",
        "domain": "Multimedia Production & Support",
        "required_skills": [
            "Basic Graphic Design (Photoshop / Canva)",
            "Video Trimming & Basic Editing",
            "Audio Recording & Setup",
            "Digital Asset Organization & Archival",
            "Event Multimedia Operation",
            "Social Media Asset Resizing",
        ],
        "recommended_skills": [
            "Lighting Equipment Setup",
            "Camera Operation Basics",
            "Basic WordPress Updating",
        ],
        "education_benchmarks": [
            "Senior High School - TVL ICT Strand",
            "Associate in Multimedia Arts",
            "Bachelor of Science in Entertainment and Multimedia Computing",
        ],
        "certification_benchmarks": [
            "TESDA Visual Graphic Design NC III",
            "Adobe Certified Associate",
        ]
    },
    "Network Architect": {
        "version": "1.0.0",
        "domain": "Enterprise Network Architecture & Cloud Connectivity",
        "required_skills": [
            "Enterprise Network Design & Topology Planning",
            "Advanced Routing & Switching Protocols (BGP, OSPF, MPLS)",
            "Software-Defined Networking (SDN / SD-WAN)",
            "Network Security Architecture & Zero Trust Framework",
            "High Availability (HA) & Disaster Recovery Network Design",
            "Cloud Interconnect & Hybrid Cloud Networking (AWS Direct Connect / Azure ExpressRoute)",
        ],
        "recommended_skills": [
            "Network Capacity Planning",
            "IPv6 Migration Strategy",
            "Quality of Service (QoS) Optimization",
            "Network Automation (Python / Ansible)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Engineering",
            "Bachelor of Science in Information Technology",
            "Electronics Engineering",
        ],
        "certification_benchmarks": [
            "Cisco Certified Design Professional (CCDP) / CCNP Enterprise",
            "AWS Certified Advanced Networking - Specialty",
        ]
    },
    "Network Engineer": {
        "version": "1.0.0",
        "domain": "Networking & Communications",
        "required_skills": [
            "Network Architecture",
            "TCP/IP Protocols",
            "Routing and Switching",
            "VLAN Configuration",
            "Network Troubleshooting",
            "Firewall Administration",
        ],
        "recommended_skills": [
            "Cisco IOS",
            "Network Security",
            "VPN Configuration",
            "Wireshark",
            "Network Automation (Python)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Bachelor of Science in Electronics Engineering",
            "Computer Engineering",
        ],
        "certification_benchmarks": [
            "Cisco Certified Network Associate (CCNA)",
            "CompTIA Network+",
        ]
    },
    "Operations Manager": {
        "version": "1.0.0",
        "domain": "Operations Leadership & Resource Optimization",
        "required_skills": [
            "Operational Strategy Formulation & Implementation",
            "Plant / Facility Budgeting & P&L Awareness",
            "Cross-Functional Team Leadership & Resource Allocation",
            "Continuous Operational Efficiency Improvement",
            "Standard Operating Procedures (SOP) Governance",
            "Contract Management & Vendor SLA Oversight",
        ],
        "recommended_skills": [
            "Crisis Management & Business Continuity",
            "Workplace Safety Leadership",
            "Strategic Capacity Planning",
            "Executive Operations Reporting",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Industrial Engineering",
            "Bachelor of Science in Business Administration",
            "Engineering Management",
        ],
        "certification_benchmarks": [
            "Certified Operations Manager",
            "Six Sigma Black Belt",
        ]
    },
    "Organizational Development Specialist": {
        "version": "1.0.0",
        "domain": "Organizational Development & Culture Transformation",
        "required_skills": [
            "Organizational Diagnosis & Cultural Assessment",
            "Change Management Strategy & Interventions",
            "Employee Engagement Survey Design & Analysis",
            "Competency Framework Modeling & Job Profiling",
            "Team Building & Leadership Workshop Facilitation",
            "Organizational Design & Structuring",
        ],
        "recommended_skills": [
            "Continuous Learning Culture Implementation",
            "Performance Management System Design",
            "Succession Planning Frameworks",
            "Executive Interviewing",
        ],
        "education_benchmarks": [
            "Bachelor of Arts in Psychology",
            "BSBA Human Resource Management",
            "MBA",
        ],
        "certification_benchmarks": [
            "Certified Organizational Development Professional",
            "Change Management Practitioner",
        ]
    },
    "Plant Engineer": {
        "version": "1.0.0",
        "domain": "Plant Operations & Facilities Engineering",
        "required_skills": [
            "Industrial Plant Operations Management",
            "Preventive & Predictive Maintenance Planning",
            "Boiler, Compressor & Utility Systems Operation",
            "Equipment Reliability & Troubleshooting",
            "Occupational Health & Safety (DOLE-BWC)",
            "Cost Control & Operating Budgeting",
        ],
        "recommended_skills": [
            "Computerized Maintenance Management Systems (CMMS)",
            "Total Productive Maintenance (TPM)",
            "Vibration Analysis Basics",
            "Energy Auditing",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Mechanical Engineering",
            "Bachelor of Science in Chemical Engineering",
            "Electrical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Mechanical Engineer (PRC License)",
            "Certified Plant Engineer",
            "Pollution Control Officer (DENR)",
        ]
    },
    "Power Plant Engineer": {
        "version": "1.0.0",
        "domain": "Power Generation Systems & Thermal Utilities",
        "required_skills": [
            "Thermal Power Plant Cycles (Rankine, Combined Cycle)",
            "Industrial Steam Boiler Operations & Turbine Maintenance",
            "Heat Exchangers & Condenser Performance Testing",
            "Power Plant Auxiliary Systems (Pumps, Fans, Water Treatment)",
            "Power Plant Safety & Environmental Regulations",
            "Thermodynamic Heat Rate Calculations",
        ],
        "recommended_skills": [
            "Geothermal / Hydroelectric Power Generation",
            "Vibration Analysis on Turbomachinery",
            "Combustion Optimization",
            "Power Generation Outage Planning",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Mechanical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Mechanical Engineer (PRC License)",
            "Certified Plant Mechanical Engineer",
        ]
    },
    "Power Systems Engineer": {
        "version": "1.0.0",
        "domain": "High-Voltage Power Systems & Grid Integration",
        "required_skills": [
            "Power System Analysis & Grid Modeling (ETAP / DigSILENT)",
            "High-Voltage Transmission & Distribution Systems",
            "Load Flow, Short Circuit & Transient Stability Studies",
            "Philippine Grid Code & Distribution Code Compliance",
            "Substation Automation & Relay Protection Coordination",
            "Renewable Energy Integration & Interconnection Studies",
        ],
        "recommended_skills": [
            "Switchyard Equipment Specifications",
            "SCADA Power Systems Interface",
            "Economic Dispatch Modeling",
            "Power Quality Assessment",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electrical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Electrical Engineer (PRC License)",
            "ETAP Certified Power Systems Specialist",
        ]
    },
    "Process Engineer": {
        "version": "1.0.0",
        "domain": "Process Engineering & Industrial Chemistry",
        "required_skills": [
            "Process Flow Diagrams (PFD) & P&ID Development",
            "Continuous Improvement & Process Bottleneck Analysis",
            "Mass and Heat Balance Calculations",
            "Statistical Process Control (SPC)",
            "Process Equipment Sizing & Selection",
            "Root Cause Failure Analysis (RCFA)",
        ],
        "recommended_skills": [
            "Lean Six Sigma Tools",
            "Commissioning & Startup Procedures",
            "Hazard and Operability Studies (HAZOP)",
            "Industrial Instrumentation",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Chemical Engineering",
            "Bachelor of Science in Industrial Engineering",
            "Mechanical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Chemical Engineer (PRC License)",
            "Six Sigma Green Belt",
        ]
    },
    "Process Improvement Engineer": {
        "version": "1.0.0",
        "domain": "Continuous Improvement & Lean Operations",
        "required_skills": [
            "Lean Six Sigma DMAIC Methodology",
            "Value Stream Mapping (VSM)",
            "Kaizen Event Facilitation & Continuous Improvement",
            "Root Cause Analysis (Fishbone, 5 Whys, Pareto Analysis)",
            "Statistical Process Control (SPC) & Process Capability (Cp/Cpk)",
            "Standard Work Formulation & 5S Auditing",
        ],
        "recommended_skills": [
            "Change Management",
            "Cycle Time & Takt Time Optimization",
            "Waste Elimination (7 Mudas)",
            "Gemba Walk Leadership",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Industrial Engineering",
            "Bachelor of Science in Manufacturing Engineering",
        ],
        "certification_benchmarks": [
            "Six Sigma Green Belt / Black Belt",
            "Lean Bronze Practitioner",
        ]
    },
    "Procurement Officer": {
        "version": "1.0.0",
        "domain": "Strategic Sourcing & Vendor Procurement",
        "required_skills": [
            "Vendor Sourcing, Prequalification & Performance Evaluation",
            "Purchase Order (PO) Processing & Contract Negotiation",
            "Bidding Procedures & Request for Proposal (RFP/RFQ) Administration",
            "Cost Reduction & Total Cost of Ownership (TCO) Analysis",
            "Supplier Relationship Management (SRM)",
            "Government Procurement Regulations (RA 9184 Understanding)",
        ],
        "recommended_skills": [
            "Payment Terms Negotiation",
            "Supply Market Intelligence",
            "Procurement Spend Analytics",
            "Contract Drafting Fundamentals",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Logistics and Supply Chain Management",
            "Bachelor of Science in Industrial Engineering",
        ],
        "certification_benchmarks": [
            "Certified Procurement Professional",
            "Chartered Institute of Procurement & Supply (CIPS)",
        ]
    },
    "Production Engineer": {
        "version": "1.0.0",
        "domain": "Manufacturing & Production Engineering",
        "required_skills": [
            "Production Scheduling & Capacity Planning",
            "Line Balancing & Manufacturing Workflow Optimization",
            "Overall Equipment Effectiveness (OEE) Tracking",
            "Lean Manufacturing & 5S Implementation",
            "Yield Optimization & Waste Minimization",
            "Safety Standards on the Shop Floor",
        ],
        "recommended_skills": [
            "Root Cause Analysis (Fishbone / 5 Whys)",
            "Inventory Tracking on Floor",
            "Standard Work Documentation",
            "ERP Production Modules",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Industrial Engineering",
            "Bachelor of Science in Chemical Engineering",
            "Mechanical Engineering",
        ],
        "certification_benchmarks": [
            "Certified Manufacturing Professional",
            "Lean Practitioner Certificate",
        ]
    },
    "Production Planner": {
        "version": "1.0.0",
        "domain": "Production Planning & Inventory Control",
        "required_skills": [
            "Master Production Scheduling (MPS)",
            "Materials Requirement Planning (MRP)",
            "Capacity Requirement Planning (CRP)",
            "Demand Forecasting & Buffer Stock Planning",
            "Enterprise Resource Planning (ERP - SAP / Oracle)",
            "Production Lead Time Optimization",
        ],
        "recommended_skills": [
            "Bill of Materials (BOM) Maintenance",
            "Shop Floor Scheduling",
            "Inventory Turnover Tracking",
            "Vendor Delivery Coordination",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Industrial Engineering",
            "Business Administration - Operations Management",
        ],
        "certification_benchmarks": [
            "APICS Certified Planning and Inventory Management (CPIM)",
            "Certified Production Planner",
        ]
    },
    "Project Architect": {
        "version": "1.0.0",
        "domain": "Architectural Project Management & Administration",
        "required_skills": [
            "Architectural Working Drawings & Detailing",
            "Construction Supervision & Quality Inspection",
            "Building Specifications & Schedule of Finishes",
            "Contract Administration & Bidding Documents",
            "Cross-Discipline Coordination (Structural, MEPF)",
            "Building Permit Processing Compliance",
        ],
        "recommended_skills": [
            "Project Scheduling (MS Project / Primavera)",
            "Site Safety Protocols",
            "Shop Drawing Review",
            "Punchlisting",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Architecture",
        ],
        "certification_benchmarks": [
            "Registered Architect (PRC License)",
            "Certified Construction Project Manager",
        ]
    },
    "Project Coordinator": {
        "version": "1.0.0",
        "domain": "Project Coordination & Milestone Management",
        "required_skills": [
            "Project Milestone Tracking & Status Reporting",
            "Project Team Meeting Facilitation & Minutes Documentation",
            "Action Item Follow-up & Task Tracking (Jira, Trello, Asana)",
            "Project Schedule Tracking & Work Breakdown Structure (WBS)",
            "Project Risk & Issue Log Maintenance",
            "Project Resource & Documentation Control",
        ],
        "recommended_skills": [
            "Stakeholder Communication Updates",
            "Project Budget Expense Tracking",
            "Deliverable Quality Checking",
            "Project Closeout Reporting",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration",
            "Bachelor of Science in Information Technology",
        ],
        "certification_benchmarks": [
            "Certified Associate in Project Management (CAPM - PMI)",
            "Google Project Management Certificate",
        ]
    },
    "Project Engineer": {
        "version": "1.0.0",
        "domain": "Engineering Project Management & Controls",
        "required_skills": [
            "Engineering Scope & Milestone Tracking",
            "Project Schedule Monitoring (Primavera P6 / MS Project)",
            "Cost Control & Progress Billing Verification",
            "Engineering Change Order (ECO) Management",
            "Cross-Discipline Technical Coordination (Structural, Architectural, MEPFS)",
            "Subcontractor & Supplier Contract Administration",
        ],
        "recommended_skills": [
            "Risk Management in Projects",
            "Procurement Tracking for Engineering",
            "Technical Specification Review",
            "Executive Progress Presentation",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Civil Engineering",
            "Bachelor of Science in Mechanical Engineering",
            "Electrical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Professional Engineer (PRC License)",
            "Project Management Professional (PMP) Candidate",
            "Certified Associate in Project Management (CAPM)",
        ]
    },
    "Psychometrician": {
        "version": "1.0.0",
        "domain": "Psychological Assessment & Psychometrics",
        "required_skills": [
            "Psychological Testing Administration & Standardization",
            "Psychological Test Scoring & Norms Interpretation",
            "Psychometric Test Battery Selection (Intelligence, Personality, Aptitude)",
            "Psychological Evaluation Report Writing",
            "Philippine Psychometrics Practice & Ethics (RA 10029)",
            "Statistical Analysis of Psychological Data (SPSS / Jamovi)",
        ],
        "recommended_skills": [
            "Behavioral Observation Techniques",
            "Confidentiality & Test Security Standards",
            "Test Item Analysis Fundamentals",
            "Intake Interview Assistance",
        ],
        "education_benchmarks": [
            "Bachelor of Arts in Psychology",
            "Bachelor of Science in Psychology",
        ],
        "certification_benchmarks": [
            "Registered Psychometrician (RPm - PRC License)",
            "PAP Certified Assessment Specialist",
        ]
    },
    "Public Relations Assistant": {
        "version": "1.0.0",
        "domain": "Public Relations & Media Communications",
        "required_skills": [
            "Press Release Writing & Distribution",
            "Media Monitoring & Press Clippings Compilation",
            "Event Planning & Media Kit Assembly",
            "Media Relations Support & Contact List Maintenance",
            "Crisis Communications Monitoring Support",
            "Corporate Communication Memo Drafting",
        ],
        "recommended_skills": [
            "Social Media Media Monitoring",
            "Photo Captioning & Media Logistics",
            "Speechwriting Support",
            "Brand Reputation Tracking",
        ],
        "education_benchmarks": [
            "Senior High School - HUMSS Strand",
            "Bachelor of Science in Political Science",
            "Communication Arts",
        ],
        "certification_benchmarks": [
            "Civil Service Professional",
            "Public Relations Society of the Philippines (PRSP) Associate",
        ]
    },
    "QA / Software Tester": {
        "version": "1.0.0",
        "domain": "Quality Assurance",
        "required_skills": [
            "Software Testing Methodologies",
            "Test Case Development",
            "Manual Testing",
            "Bug Tracking & Reporting",
            "Regression Testing",
            "Quality Assurance Standards",
        ],
        "recommended_skills": [
            "Automated Testing",
            "Selenium",
            "API Testing",
            "Postman",
            "Performance Testing (JMeter)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Bachelor of Science in Computer Science",
        ],
        "certification_benchmarks": [
            "ISTQB Certified Tester Foundation Level",
            "Certified Software Quality Analyst (CSQA)",
        ]
    },
    "Quality Assurance Engineer": {
        "version": "1.0.0",
        "domain": "Quality Management Systems & Auditing",
        "required_skills": [
            "Quality Management System Implementation (ISO 9001)",
            "Quality Auditing & Corrective and Preventive Actions (CAPA)",
            "Process Capability & Gage R&R Analysis",
            "Quality Control Documentation & Inspection Protocols",
            "Failure Mode and Effects Analysis (FMEA)",
            "Supplier Quality Evaluation",
        ],
        "recommended_skills": [
            "Cost of Poor Quality (COPQ) Analysis",
            "Total Quality Management (TQM)",
            "Customer Audit Preparation",
            "Minitab Statistical Software",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Industrial Engineering",
            "Bachelor of Science in Mechanical Engineering",
            "Chemical Engineering",
        ],
        "certification_benchmarks": [
            "Certified Quality Engineer (CQE - ASQ)",
            "ISO 9001 Lead Auditor",
        ]
    },
    "Quality Control Engineer": {
        "version": "1.0.0",
        "domain": "Quality Control & Materials Testing",
        "required_skills": [
            "Quality Control Testing & Laboratory Procedures",
            "Statistical Quality Control (SQC) & Sampling Plans",
            "Analytical Instrumentation (Spectrophotometry / Chromatography)",
            "Standard Operating Procedures (SOP) Formulation",
            "Good Manufacturing Practices (GMP) Compliance",
            "Non-Conformance & Corrective Action Reporting (CAPA)",
        ],
        "recommended_skills": [
            "ISO 9001 Quality Standards",
            "Material Testing Standards (ASTM / ISO)",
            "Measurement System Analysis (Gage R&R)",
            "Auditing Protocols",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Chemical Engineering",
            "Bachelor of Science in Industrial Engineering",
            "Chemistry",
        ],
        "certification_benchmarks": [
            "Certified Quality Inspector (CQI)",
            "ISO 9001 Lead Auditor",
        ]
    },
    "Research Scientist": {
        "version": "1.0.0",
        "domain": "Computer Science & Applied Research",
        "required_skills": [
            "Scientific Research Methodology",
            "Experimental Design & Statistical Analysis",
            "Peer-Reviewed Technical Writing",
            "Python / R for Scientific Computing",
            "Machine Learning Prototyping",
            "Literature Review & State-of-the-Art Synthesis",
        ],
        "recommended_skills": [
            "Academic Publishing",
            "LaTeX",
            "Grant & Proposal Writing",
            "Data Modeling",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Master of Science in Computer Science",
            "Data Science",
        ],
        "certification_benchmarks": [
            "IEEE / ACM Active Researcher Membership",
            "Published Author in Scientific Proceedings",
        ]
    },
    "Risk Analyst": {
        "version": "1.0.0",
        "domain": "Enterprise Risk Management & Quantitative Analysis",
        "required_skills": [
            "Enterprise Risk Management (ERM) Frameworks",
            "Operational Risk Identification & Assessment",
            "Key Risk Indicators (KRI) Tracking & Dashboarding",
            "Risk Matrix Formulation & Mitigation Strategies",
            "Scenario Analysis & Stress Testing",
            "Regulatory & Compliance Risk Monitoring",
        ],
        "recommended_skills": [
            "Business Continuity Planning (BCP)",
            "Financial Risk Modeling",
            "Incident Reporting & Loss Event Tracking",
            "Internal Risk Auditing Support",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Financial Management",
            "Bachelor of Science in Data Science and Analytics",
        ],
        "certification_benchmarks": [
            "Financial Risk Manager (FRM Level 1 Passed)",
            "Professional Risk Manager (PRM)",
        ]
    },
    "Sales and Marketing Coordinator": {
        "version": "1.0.0",
        "domain": "Sales Operations & Marketing Support",
        "required_skills": [
            "Sales Pipeline Tracking & CRM Management (Salesforce / HubSpot)",
            "Sales Collateral, Pitch Decks & Proposals Preparation",
            "Lead Generation, Qualification & Inbound Inquiry Response",
            "Marketing Event, Trade Show & Seminar Coordination",
            "Sales and Marketing Report Generation",
            "Customer Account Follow-Up & Client Onboarding Support",
        ],
        "recommended_skills": [
            "Contract Preparation for Sales",
            "Product Sample Distribution",
            "Sales Commission Record Keeping",
            "Client Meeting Minutes",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Marketing Management",
            "General Business Administration",
        ],
        "certification_benchmarks": [
            "HubSpot Sales Software Certified",
            "Certified Sales Professional",
        ]
    },
    "Signal Processing Engineer": {
        "version": "1.0.0",
        "domain": "Digital Signal Processing & Information Theory",
        "required_skills": [
            "Digital Signal Processing (DSP) Fundamentals",
            "MATLAB / Simulink for Signal Modeling",
            "Digital Filter Design (FIR / IIR Filters)",
            "Fast Fourier Transform (FFT) & Wavelet Analysis",
            "Audio, Speech & Image Signal Processing Algorithms",
            "DSP Processor Programming",
        ],
        "recommended_skills": [
            "Noise Reduction & Adaptive Filtering",
            "Data Compression Algorithms",
            "C/C++ Implementation of DSP",
            "Biomedical Signal Processing",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electronics Engineering",
            "Bachelor of Science in Computer Engineering",
        ],
        "certification_benchmarks": [
            "MATLAB Certified Associate",
            "IEEE Signal Processing Society Member",
        ]
    },
    "Site Engineer": {
        "version": "1.0.0",
        "domain": "Construction Engineering & Field Operations",
        "required_skills": [
            "Construction Site Supervision & Quality Assurance",
            "As-Built Drawing Verification & Implementation",
            "Bar Bending Schedule (BBS) & Rebar Inspection",
            "Concrete Pouring Protocols & Slump Testing",
            "Work Accomplishment & Daily Site Reporting",
            "Occupational Safety and Health on Construction Sites (CHSP)",
        ],
        "recommended_skills": [
            "Subcontractor Coordination",
            "Site Material Logistics & Storage",
            "Formwork & Scaffolding Inspection",
            "Punchlist Clearing",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Civil Engineering",
        ],
        "certification_benchmarks": [
            "Registered Civil Engineer (PRC License)",
            "DOLE Construction Safety Officer (COSH)",
        ]
    },
    "Social Media Strategist": {
        "version": "1.0.0",
        "domain": "Social Media & Content Strategy",
        "required_skills": [
            "Social Media Strategy Formulation across Major Platforms (Facebook, TikTok, Instagram, LinkedIn)",
            "Content Calendar Planning & Scheduling",
            "Social Media Analytics, Engagement Rate & Reach Tracking",
            "Viral Content Creation & Real-Time Trend Capitalization",
            "Social Community Management & Reputation Response",
            "Influencer & Content Creator Relationship Management",
        ],
        "recommended_skills": [
            "Paid Social Campaign Setup",
            "Short-Form Video Concept Creation",
            "Hashtag & Keyword Research",
            "Social Media Crisis Protocol",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Marketing Management",
            "Communication Arts",
        ],
        "certification_benchmarks": [
            "Meta Certified Community Manager",
            "HubSpot Social Media Marketing Certified",
        ]
    },
    "Software Engineer": {
        "version": "1.0.0",
        "domain": "Computer Science & Software",
        "required_skills": [
            "Data Structures & Algorithms",
            "Object-Oriented Programming",
            "Python",
            "SQL",
            "Software Architecture & Design",
            "Git Version Control",
        ],
        "recommended_skills": [
            "FastAPI",
            "React Native",
            "TypeScript",
            "RESTful API Development",
            "Unit Testing",
            "System Design",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Bachelor of Science in Information Technology",
            "Software Engineering Fundamentals",
            "Computer Science Discipline",
        ],
        "certification_benchmarks": [
            "AWS Certified Developer",
            "Oracle Certified Professional: Java",
            "Microsoft Certified: Azure Developer Associate",
        ]
    },
    "Statistical Analyst": {
        "version": "1.0.0",
        "domain": "Statistical Analytics & Research",
        "required_skills": [
            "Statistical Hypothesis Testing",
            "Regression Analysis & Predictive Modeling",
            "R / Python for Statistics",
            "SPSS / SAS",
            "Sampling Techniques & Survey Design",
            "Data Quality Assurance",
        ],
        "recommended_skills": [
            "Experimental Design (ANOVA)",
            "Time Series Analysis",
            "Advanced Excel Modeling",
            "Statistical Process Control",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Data Science and Analytics",
            "Bachelor of Science in Mathematics / Statistics",
            "Computer Science",
        ],
        "certification_benchmarks": [
            "Certified Analytics Professional (CAP)",
            "Google Advanced Data Analytics Certificate",
        ]
    },
    "Structural Engineer": {
        "version": "1.0.0",
        "domain": "Civil & Structural Engineering",
        "required_skills": [
            "Structural Analysis & Design",
            "STAAD.Pro / ETABS",
            "Reinforced Concrete Design",
            "Structural Steel Design",
            "National Structural Code of the Philippines (NSCP)",
            "Seismic Design & Earthquake Engineering",
        ],
        "recommended_skills": [
            "Autodesk Revit Structure",
            "Foundation Structural Design",
            "Finite Element Analysis (FEA)",
            "Wind Load Calculations",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Civil Engineering",
            "Civil Engineering with Structural Major",
        ],
        "certification_benchmarks": [
            "Registered Civil Engineer (PRC License)",
            "ASEP Specialist Structural Engineer",
        ]
    },
    "Substation Engineer": {
        "version": "1.0.0",
        "domain": "High-Voltage Substations & Utility Infrastructure",
        "required_skills": [
            "High-Voltage Substation Primary & Secondary Design",
            "Power Transformers & Gas-Insulated Switchgear (GIS) Operations",
            "Protection Relays & Trip Scheme Configuration",
            "Grounding Grid Calculations (IEEE 80)",
            "Substation Commissioning & Factory Acceptance Testing (FAT)",
            "Substation Automation Protocols (IEC 61850)",
        ],
        "recommended_skills": [
            "Lightning Shielding Design",
            "Circuit Breaker Maintenance & Timing Tests",
            "High-Voltage Cable Jointing & Testing",
            "Utility Outage Planning",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electrical Engineering",
        ],
        "certification_benchmarks": [
            "Registered Electrical Engineer (PRC License)",
            "High Voltage Safety Certification",
        ]
    },
    "Supply Chain Analyst": {
        "version": "1.0.0",
        "domain": "Supply Chain Analytics & Logistics Planning",
        "required_skills": [
            "Supply Chain Performance Metrics & KPI Scorecarding",
            "Demand Forecasting & Statistical Modeling",
            "Logistics & Freight Cost Optimization",
            "Advanced Excel Modeling & SQL for Supply Chain",
            "Inventory Optimization & Economic Order Quantity (EOQ)",
            "Supplier Lead Time & Performance Analysis",
        ],
        "recommended_skills": [
            "Power BI / Tableau Dashboarding",
            "Warehouse Space Utilization Planning",
            "Distribution Route Planning",
            "ERP Supply Chain Modules (SAP / NetSuite)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Industrial Engineering",
            "Bachelor of Science in Business Administration - Logistics and Supply Chain Management",
        ],
        "certification_benchmarks": [
            "APICS Certified Supply Chain Professional (CSCP)",
            "Certified Logistics and Supply Chain Analyst",
        ]
    },
    "System Administrator": {
        "version": "1.0.0",
        "domain": "Information Technology",
        "required_skills": [
            "System Administration",
            "Linux Administration",
            "Windows Server Administration",
            "Active Directory",
            "User Access Management",
            "Backup & Disaster Recovery",
        ],
        "recommended_skills": [
            "Bash Scripting",
            "PowerShell",
            "Network Protocols (TCP/IP)",
            "Virtualization (VMware / Proxmox)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Computer Engineering",
        ],
        "certification_benchmarks": [
            "Red Hat Certified System Administrator (RHCSA)",
            "Microsoft Certified: Windows Server Hybrid Administrator",
        ]
    },
    "Systems Engineer": {
        "version": "1.0.0",
        "domain": "Systems Engineering & Technical Integration",
        "required_skills": [
            "Systems Integration & Interface Control Documentation",
            "Requirements Engineering & Traceability",
            "Hardware-Software Co-Design Verification",
            "System Reliability, Availability & Maintainability (RAM)",
            "Technical Risk Assessment & Mitigation",
            "System Architecture Modeling (SysML / UML)",
        ],
        "recommended_skills": [
            "Testing & Validation Master Planning",
            "Life-Cycle Cost Analysis",
            "Engineering Change Management",
            "Root Cause Analysis",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Engineering",
            "Bachelor of Science in Industrial Engineering",
            "Electronics Engineering",
        ],
        "certification_benchmarks": [
            "INCOSE Certified Systems Engineering Professional (CSEP)",
            "Certified Systems Integration Engineer",
        ]
    },
    "Talent Acquisition Specialist": {
        "version": "1.0.0",
        "domain": "Recruitment & Talent Sourcing",
        "required_skills": [
            "Full-Cycle Recruitment & Candidate Pipeline Management",
            "Strategic Sourcing (LinkedIn Recruiter, JobStreet, Indeed)",
            "Competency-Based Behavioral Interviewing (STAR Method)",
            "Applicant Tracking System (ATS) Management",
            "Job Offer Formulation & Salary Negotiation",
            "Employer Branding & Campus Recruitment Drives",
        ],
        "recommended_skills": [
            "Hiring Metrics Tracking (Time-to-Hire, Cost-per-Hire)",
            "Candidate Background Verification",
            "Talent Market Intelligence",
            "Job Description Drafting",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Human Resource Management",
            "Bachelor of Arts in Psychology",
        ],
        "certification_benchmarks": [
            "Certified Talent Acquisition Strategist",
            "AIRIS Recruiter Certified",
        ]
    },
    "Tax Consultant": {
        "version": "1.0.0",
        "domain": "Taxation & Regulatory Advisory",
        "required_skills": [
            "Philippine National Internal Revenue Code (NIRC) Expertise",
            "Corporate & Individual Income Tax Return Filing (BIR 1702/1701)",
            "Value-Added Tax (VAT) & Percentage Tax Filing",
            "Withholding Taxes (Creditable, Final, Expanded)",
            "Tax Audit Defense & BIR Assessment Handling",
            "Tax Planning, Incentives (CREATE Act) & Compliance Strategy",
        ],
        "recommended_skills": [
            "Transfer Pricing Guidelines",
            "Local Government Taxes & Business Permits",
            "SEC Financial Report Compliance",
            "Estate & Donor Tax Planning",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "Certified Public Accountant (CPA - PRC License)",
            "Accredited Tax Practitioner (BIR)",
        ]
    },
    "Telecommunications Engineer": {
        "version": "1.0.0",
        "domain": "Telecommunications Infrastructure & Wireless Systems",
        "required_skills": [
            "Cellular Network Architecture (4G / 5G / LTE)",
            "RF Engineering & Microwave Link Design",
            "Optical Fiber Transmission Systems (DWDM / GPON)",
            "Optical Time-Domain Reflectometer (OTDR) Testing",
            "Antenna Theory & Electromagnetic Wave Propagation",
            "Spectrum Management & Frequency Planning (NTC Regulations)",
        ],
        "recommended_skills": [
            "Wireless Network Optimization",
            "Base Transceiver Station (BTS) Installation",
            "Link Budget Calculations",
            "Telecom Regulatory Compliance",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Electronics Engineering",
        ],
        "certification_benchmarks": [
            "Registered Electronics Engineer (PRC License)",
            "Cisco Certified Network Associate (CCNA)",
        ]
    },
    "Training and Development Officer": {
        "version": "1.0.0",
        "domain": "Learning & Organizational Development",
        "required_skills": [
            "Training Needs Analysis (TNA)",
            "Instructional Design & Training Module Development",
            "Training Delivery, Workshop Facilitation & Public Speaking",
            "Learning Management System (LMS) Administration",
            "Training Program Evaluation (Kirkpatrick 4-Level Model)",
            "Employee Career Pathing & Competency Mapping",
        ],
        "recommended_skills": [
            "On-the-Job Training (OJT) Program Coordination",
            "Leadership Development Curriculum",
            "Vendor Management for External Trainers",
            "Training Budget Tracking",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Human Resource Management",
            "Bachelor of Arts in Psychology",
            "Education",
        ],
        "certification_benchmarks": [
            "Certified Learning and Development Professional",
            "Train-the-Trainer Certification",
        ]
    },
    "Treasury Analyst": {
        "version": "1.0.0",
        "domain": "Corporate Treasury & Liquidity Management",
        "required_skills": [
            "Daily Cash Position Reporting & Liquidity Management",
            "Short-Term Cash Flow Forecasting",
            "Foreign Exchange (FX) Risk Monitoring & Hedging Basics",
            "Bank Relationship Management & Fee Optimization",
            "Money Market & Short-Term Liquidity Placements",
            "Payment Authorization & Electronic Banking Operations",
        ],
        "recommended_skills": [
            "Working Capital Management",
            "Interest Rate Sensitivity Analysis",
            "Debt Service Schedule Monitoring",
            "Treasury Management Systems (TMS)",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Financial Management",
            "Bachelor of Science in Accountancy",
        ],
        "certification_benchmarks": [
            "Certified Treasury Professional (CTP Candidate)",
            "Certified Financial Risk Manager",
        ]
    },
    "UI/UX Designer": {
        "version": "1.0.0",
        "domain": "Design & Human-Computer Interaction",
        "required_skills": [
            "Figma",
            "UI/UX Design",
            "User Research",
            "Wireframing",
            "Interactive Prototyping",
            "Information Architecture",
        ],
        "recommended_skills": [
            "Usability Testing",
            "Design Systems",
            "Design Thinking",
            "Adobe XD",
            "Design Handoff",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Information Technology",
            "Multimedia Arts",
            "User Experience Design",
        ],
        "certification_benchmarks": [
            "Google UX Design Professional Certificate",
            "Nielsen Norman Group UX Certification",
        ]
    },
    "Unity / Unreal Engine Developer": {
        "version": "1.0.0",
        "domain": "Game Engines & Real-Time Simulation",
        "required_skills": [
            "Unity Engine Architecture",
            "Unreal Engine Architecture",
            "C# Scripting & C++ Programming",
            "Blueprint Visual Scripting",
            "Physics Simulation & Collision Handling",
            "Scene Profiling & Memory Optimization",
        ],
        "recommended_skills": [
            "Git & LFS for Game Repositories",
            "Asset Pipeline Integration",
            "Multiplayer Architecture",
            "Custom Shader Development",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Bachelor of Science in Computer Science",
        ],
        "certification_benchmarks": [
            "Unity Certified Professional: Programmer",
            "Epic Games Unreal Fellowship Alum",
        ]
    },
    "Urban Planner": {
        "version": "1.0.0",
        "domain": "Urban Planning & Regional Development",
        "required_skills": [
            "Comprehensive Land Use Planning (CLUP)",
            "Zoning Ordinances & Urban Governance",
            "Geographic Information Systems (GIS / QGIS)",
            "Urban Design & Mobility Planning",
            "Environmental Impact Assessment (EIA)",
            "Stakeholder Consultation & Participatory Planning",
        ],
        "recommended_skills": [
            "Smart Cities Framework",
            "Demographic & Economic Data Analysis",
            "Master Site Planning",
            "Transportation Modeling",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Architecture",
            "Bachelor of Science in Civil Engineering",
            "Master in Urban and Regional Planning",
        ],
        "certification_benchmarks": [
            "Registered Environmental Planner (PRC License)",
            "GIS Certification",
        ]
    },
    "VFX Artist": {
        "version": "1.0.0",
        "domain": "Visual Effects & Compositing",
        "required_skills": [
            "Particle Systems & Dynamics",
            "Visual Effects Simulation (Fire, Smoke, Water)",
            "Compositing in Adobe After Effects / Nuke",
            "Shaders, Textures & Materials",
            "Lighting & Scene Rendering",
            "Green Screen Keying & Rotoscoping",
        ],
        "recommended_skills": [
            "Houdini Procedural Effects",
            "Matchmoving & Camera Tracking",
            "Real-Time VFX (Niagara in Unreal)",
            "Blender VFX",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Animation & Visual Effects",
        ],
        "certification_benchmarks": [
            "Foundry Certified Nuke Specialist",
            "Autodesk Certified Professional: Maya",
        ]
    },
    "Warehouse Operations Manager": {
        "version": "1.0.0",
        "domain": "Warehouse Management & Materials Handling",
        "required_skills": [
            "Warehouse Operations & Layout Space Optimization",
            "Inbound Receiving, Putaway, Picking, Packing & Dispatch Operations",
            "Warehouse Management Systems (WMS) Utilization",
            "Workplace Safety & Material Handling Equipment (MHE) Maintenance",
            "Inventory Accuracy & Annual Physical Stock Count Leadership",
            "Warehouse Labor & Productivity Tracking",
        ],
        "recommended_skills": [
            "5S Methodology in Warehouse",
            "Security & Loss Prevention Standards",
            "Cold Storage Warehouse Protocols",
            "Cross-Docking Operations",
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration major in Logistics and Supply Chain Management",
            "Bachelor of Science in Industrial Engineering",
        ],
        "certification_benchmarks": [
            "Certified Warehouse Manager",
            "Safety Officer 2 (SO2)",
        ]
    },
}

# --- APPROVED DOMAIN FALLBACKS (TIER 4 - EXPLICITLY DEGRADED EVALUATION MODE) ---
# Used ONLY when exact role profile is unavailable.
# is_degraded must ALWAYS be True when served.
APPROVED_DOMAIN_FALLBACKS: Dict[str, Dict[str, Any]] = {
    "computing": {
        "version": "fallback-1.0.0",
        "domain": "Computing & Information Sciences",
        "required_skills": [
            "Data Structures & Algorithms",
            "Software Development Lifecycle",
            "Database Systems & SQL",
            "System Architecture & Design",
            "Git Version Control",
            "Cybersecurity Principles"
        ],
        "recommended_skills": [
            "Cloud Computing Fundamentals",
            "Operating Systems & Linux",
            "RESTful API Design",
            "Unit Testing & Quality Assurance"
        ],
        "education_benchmarks": [
            "Bachelor of Science in Computer Science",
            "Bachelor of Science in Information Technology",
            "Bachelor of Science in Data Science and Analytics"
        ],
        "certification_benchmarks": [
            "CompTIA IT Fundamentals (ITF+)",
            "AWS Certified Cloud Practitioner"
        ]
    },
    "engineering": {
        "version": "fallback-1.0.0",
        "domain": "Engineering & Applied Sciences",
        "required_skills": [
            "Engineering Mathematics & Calculus",
            "Engineering Mechanics (Statics & Dynamics)",
            "Computer-Aided Design (AutoCAD / 3D CAD)",
            "Thermodynamics & Heat Transfer Fundamentals",
            "Engineering Economics & Cost Analysis",
            "Occupational Safety & Health Standards (DOLE OSH)"
        ],
        "recommended_skills": [
            "Project Management Fundamentals",
            "Quality Control & Assurance (QA/QC)",
            "Technical Report Writing",
            "Data Analysis & Statistical Tools"
        ],
        "education_benchmarks": [
            "Bachelor of Science in Engineering Programs",
            "Engineering Discipline"
        ],
        "certification_benchmarks": [
            "Registered Engineer (PRC Board Examination)",
            "Safety Officer 2 (DOLE SO2 Certification)"
        ]
    },
    "architecture_construction": {
        "version": "fallback-1.0.0",
        "domain": "Architecture, Construction & Built Environment",
        "required_skills": [
            "Architectural & Technical Drafting (AutoCAD)",
            "National Building Code of the Philippines (PD 1096)",
            "Building Information Modeling (BIM) Basics",
            "Construction Materials & Methods",
            "Site Planning & Spatial Analysis",
            "Construction Safety & Specifications"
        ],
        "recommended_skills": [
            "3D Architectural Visualization",
            "Cost Estimation & Quantity Surveying",
            "Sustainable Building Principles (LEED / BERDE)",
            "Contract Administration"
        ],
        "education_benchmarks": [
            "Bachelor of Science in Architecture",
            "Bachelor of Science in Civil Engineering"
        ],
        "certification_benchmarks": [
            "Registered Architect / Civil Engineer (PRC License)",
            "Autodesk Certified User"
        ]
    },
    "business_management": {
        "version": "fallback-1.0.0",
        "domain": "Business & Management",
        "required_skills": [
            "Business Strategy & Strategic Planning",
            "Financial Literacy & Budget Management",
            "Market Analysis & Competitive Intelligence",
            "Organizational Leadership & Team Management",
            "Business Process Optimization",
            "Data Analysis (Advanced Excel & Dashboarding)"
        ],
        "recommended_skills": [
            "Project Management Methodologies",
            "Client Relationship & Stakeholder Management",
            "Digital Marketing & E-Commerce Fundamentals",
            "Business Law & Ethics"
        ],
        "education_benchmarks": [
            "Bachelor of Science in Business Administration",
            "Business Administration Discipline"
        ],
        "certification_benchmarks": [
            "Certified Associate in Project Management (CAPM)",
            "Six Sigma Yellow Belt"
        ]
    },
    "accountancy_finance": {
        "version": "fallback-1.0.0",
        "domain": "Accountancy, Banking & Financial Management",
        "required_skills": [
            "Financial Accounting & Reporting (PFRS / IFRS)",
            "Philippine Tax Laws & BIR Regulatory Compliance",
            "Financial Statement Analysis & Ratio Interpretation",
            "Budgeting, Forecasting & Variance Analysis",
            "Internal Controls & Auditing Principles",
            "Accounting Software & ERP Fundamentals"
        ],
        "recommended_skills": [
            "Advanced Excel Financial Modeling",
            "Corporate Finance Principles",
            "Cost Accounting & Management Accounting",
            "Business Law & Regulations"
        ],
        "education_benchmarks": [
            "Bachelor of Science in Accountancy",
            "Bachelor of Science in Business Administration major in Financial Management",
            "Bachelor of Science in Accounting Information System"
        ],
        "certification_benchmarks": [
            "Certified Public Accountant (CPA - PRC License)",
            "TESDA Bookkeeping NC III"
        ]
    },
    "multimedia_arts": {
        "version": "fallback-1.0.0",
        "domain": "Digital Arts, Animation & Multimedia Computing",
        "required_skills": [
            "Digital Illustration & Graphic Design (Adobe Creative Suite)",
            "Typography, Color Theory & Visual Composition",
            "2D/3D Asset Creation Fundamentals",
            "Audio & Video Editing Principles",
            "Interactive Media & UI Concept Design",
            "Digital Asset Management & Export Standards"
        ],
        "recommended_skills": [
            "Motion Graphics & Animation Timing",
            "Storyboarding & Creative Concepting",
            "3D Modeling Basics",
            "Web Graphics Optimization"
        ],
        "education_benchmarks": [
            "Bachelor of Science in Entertainment and Multimedia Computing",
            "Multimedia Arts",
            "Information Technology"
        ],
        "certification_benchmarks": [
            "Adobe Certified Professional",
            "TESDA Visual Graphic Design NC III"
        ]
    },
    "social_sciences": {
        "version": "fallback-1.0.0",
        "domain": "Psychology, Behavioral Sciences & Governance",
        "required_skills": [
            "Human Behavior & Psychological Principles",
            "Research Methodologies & Literature Review",
            "Quantitative & Qualitative Data Collection",
            "Statistical Analysis in Social Sciences (SPSS / Jamovi)",
            "Professional Ethics & Client Confidentiality",
            "Technical & Academic Report Writing"
        ],
        "recommended_skills": [
            "Basic Counseling & Active Listening Skills",
            "Public Speaking & Presentation Skills",
            "Community Needs Assessment",
            "Crisis Intervention Principles"
        ],
        "education_benchmarks": [
            "Bachelor of Arts in Psychology",
            "Bachelor of Science in Political Science",
            "Social Sciences Discipline"
        ],
        "certification_benchmarks": [
            "Civil Service Professional Examination",
            "Registered Psychometrician (RPm - PRC License)"
        ]
    },
    "maritime": {
        "version": "fallback-1.0.0",
        "domain": "Maritime Studies & Marine Engineering",
        "required_skills": [
            "Marine Diesel Engines & Propulsion Systems",
            "Marine Auxiliary Machinery Operations",
            "Marine Electrical Systems & Safety at Sea",
            "STCW & MARINA Regulatory Frameworks",
            "Engine Room Watchkeeping & Emergency Procedures",
            "Marine Environmental Protection (MARPOL)"
        ],
        "recommended_skills": [
            "Troubleshooting Marine Mechanical Systems",
            "Marine Automation & Control Fundamentals",
            "Bunkering & Fuel Management",
            "Firefighting & Life-Saving Appliances (SOLAS)"
        ],
        "education_benchmarks": [
            "Bachelor of Science in Marine Engineering",
            "Maritime Discipline"
        ],
        "certification_benchmarks": [
            "Officer in Charge of an Engineering Watch (OIC-EW)",
            "STCW Certificates"
        ]
    }
}

GENERIC_DISALLOWED_TOKENS = {
    "core competency", "technical skills", "problem solving", "execution",
    "domain knowledge", "industry best practices", "tools", "relevant academic discipline"
}

def validate_dynamic_profile_payload(profile: Dict[str, Any], canonical_role: str) -> Tuple[bool, str]:
    """
    Pre-authoritative quality gate for dynamically created role profiles.
    Must be satisfied BEFORE a profile can be saved to Firestore or assigned a version.
    """
    if not isinstance(profile, dict):
        return False, "Profile payload must be a JSON dictionary."

    req_skills = profile.get("required_skills", [])
    rec_skills = profile.get("recommended_skills", [])

    if not isinstance(req_skills, list) or len(req_skills) < 5 or len(req_skills) > 8:
        return False, f"Required skills count must be between 5 and 8. Got {len(req_skills) if isinstance(req_skills, list) else 0}."

    if not isinstance(rec_skills, list) or len(rec_skills) < 3 or len(rec_skills) > 6:
        return False, f"Recommended skills count must be between 3 and 6. Got {len(rec_skills) if isinstance(rec_skills, list) else 0}."

    substantive_count = 0
    norm_pos = canonical_role.lower()

    for skill in req_skills:
        skill_str = str(skill).strip().lower()
        if not skill_str or len(skill_str) < 3:
            return False, f"Skill '{skill}' is too short or empty."
        if any(tok in skill_str for tok in GENERIC_DISALLOWED_TOKENS) or skill_str == f"{norm_pos} core competency":
            return False, f"Skill '{skill}' contains disallowed generic filler."
        substantive_count += 1

    if substantive_count < 4:
        return False, "Profile lacks sufficient domain-specific substantive competencies."

    edu = profile.get("education_benchmarks", [])
    if not isinstance(edu, list) or len(edu) < 1:
        return False, "Profile must contain at least one education benchmark."

    return True, "Validation passed"

# In-memory LRU / lookup cache for worker thread performance
_RESOLVED_PROFILE_CACHE: Dict[str, RoleProfile] = {}

def _get_firestore_db():
    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS") and not os.getenv("FIRESTORE_EMULATOR_HOST"):
        return None
    try:
        from market_intelligence import get_firestore_client
        return get_firestore_client()
    except Exception:
        return None

def canonicalize_role_title(raw_role: str) -> str:
    """
    Exact, whole-token canonical title normalization.
    Zero unsafe substring matching.
    Prevents false-positive collisions (e.g. Network Architect != Architect).
    """
    if not raw_role:
        return ""
    cleaned = re.sub(r'\s+', ' ', raw_role.strip())
    lower_cleaned = cleaned.lower()

    # 1. Exact alias dictionary match
    if lower_cleaned in ROLE_ALIASES:
        return ROLE_ALIASES[lower_cleaned]

    # 2. Exact case-insensitive match against static catalog keys
    for canonical_name in AUTHORITATIVE_STATIC_PROFILES:
        if canonical_name.lower() == lower_cleaned:
            return canonical_name

    # 3. Clean string fallback preserving acronyms (e.g. IT, AI, QA, CAD, BIM, ERP, HR, AR, VR, VFX, IoT)
    return cleaned

def resolve_role_profile(
    raw_role: str,
    allow_domain_fallback: bool = True
) -> RoleProfile:
    """
    Authoritative 4-Tier Role Profile Resolution Hierarchy.
    Tier 1: Authoritative Static Catalog (in-code, peer-reviewed)
    Tier 2: Persisted & Validated Cloud Profile (Firestore 'role_profiles')
    Tier 3: Prior Validated Version Profile (Firestore archive)
    Tier 4: Explicit Approved Domain Fallback (marked DEGRADED, never pretends to be exact role)
    Refusal: TARGET_ROLE_PROFILE_UNRESOLVED error
    """
    canonical_role = canonicalize_role_title(raw_role)
    if not canonical_role:
        raise RoleProfileUnresolvedError("Target role is empty or invalid.")

    # Check in-memory cache first
    if canonical_role in _RESOLVED_PROFILE_CACHE:
        cached = _RESOLVED_PROFILE_CACHE[canonical_role]
        return copy.deepcopy(cached)

    # --- TIER 1: AUTHORITATIVE STATIC CATALOG ---
    if canonical_role in AUTHORITATIVE_STATIC_PROFILES:
        raw_data = AUTHORITATIVE_STATIC_PROFILES[canonical_role]
        profile = RoleProfile(
            canonical_role=canonical_role,
            profile_id=f"static_{canonical_role.lower().replace(' ', '_').replace('/', '_').replace('-', '_')}",
            version=raw_data.get("version", "1.0.0"),
            domain=raw_data.get("domain", "General"),
            required_skills=tuple(raw_data.get("required_skills", [])),
            recommended_skills=tuple(raw_data.get("recommended_skills", [])),
            education_benchmarks=tuple(raw_data.get("education_benchmarks", [])),
            certification_benchmarks=tuple(raw_data.get("certification_benchmarks", [])),
            profile_source="AUTHORITATIVE_STATIC",
            is_degraded=False,
            last_updated="2026-09-15"
        )
        _RESOLVED_PROFILE_CACHE[canonical_role] = profile
        return copy.deepcopy(profile)

    # --- TIER 2 & 3: FIRESTORE PERSISTED & PRIOR VALIDATED PROFILES ---
    db = _get_firestore_db()
    if db:
        try:
            slug = canonical_role.lower().replace(" ", "_").replace("/", "_").replace("-", "_")
            doc_ref = db.collection("role_profiles").document(slug).get(timeout=1.5)
            if doc_ref.exists:
                doc_data = doc_ref.to_dict()
                status = doc_data.get("status", "ACTIVE")
                if status in ("ACTIVE", "SUPERSEDED_USABLE"):
                    is_prior = (status == "SUPERSEDED_USABLE")
                    profile = RoleProfile(
                        canonical_role=canonical_role,
                        profile_id=doc_data.get("profile_id", f"fs_{slug}"),
                        version=doc_data.get("version", "1.0.0"),
                        domain=doc_data.get("domain", "General"),
                        required_skills=tuple(doc_data.get("required_skills", [])),
                        recommended_skills=tuple(doc_data.get("recommended_skills", [])),
                        education_benchmarks=tuple(doc_data.get("education_benchmarks", [])),
                        certification_benchmarks=tuple(doc_data.get("certification_benchmarks", [])),
                        profile_source="PRIOR_VALIDATED_VERSION" if is_prior else "PERSISTED_VALIDATED",
                        is_degraded=False,
                        last_updated=doc_data.get("last_updated", str(datetime.date.today()))
                    )
                    _RESOLVED_PROFILE_CACHE[canonical_role] = profile
                    return copy.deepcopy(profile)
        except Exception as e:
            print(f"RoleProfileRegistry: Firestore lookup failed for '{canonical_role}': {e}")

    # --- TIER 4: APPROVED DOMAIN FALLBACK (EXPLICITLY DEGRADED MODE ONLY) ---
    if allow_domain_fallback:
        role_lower = canonical_role.lower()
        tokens = set(re.findall(r'\b[a-z0-9\+\#]+\b', role_lower))
        matched_domain = None

        # Domain matching via declarative token sets (ordered by specificity)
        if any(t in tokens for t in ["animator", "animation", "multimedia", "vfx", "xr", "ar", "vr", "game", "graphics", "artist"]):
            matched_domain = "multimedia_arts"
        elif any(t in tokens for t in ["marine", "maritime", "ship", "vessel", "seafarer", "nautical", "navigation"]):
            matched_domain = "maritime"
        elif any(t in tokens for t in ["psychology", "psychometrician", "counseling", "behavioral", "guidance", "mental"]):
            matched_domain = "social_sciences"
        elif any(t in tokens for t in ["architect", "architecture", "urban", "landscape", "bim", "cad", "interior", "estimator", "construction"]):
            matched_domain = "architecture_construction"
        elif any(t in tokens for t in ["accountant", "accounting", "auditor", "audit", "tax", "bookkeeper", "treasury", "credit", "banking", "finance", "financial"]):
            matched_domain = "accountancy_finance"
        elif any(t in tokens for t in ["software", "developer", "programmer", "data", "it", "network", "system", "web", "cloud", "security", "ai", "computing", "database", "fullstack", "frontend", "backend", "algorithms", "firmware", "iot"]):
            matched_domain = "computing"
        elif any(t in tokens for t in ["engineer", "engineering", "structural", "mechanical", "electrical", "electronics", "civil", "chemical", "industrial", "mechatronics", "telecommunications"]):
            matched_domain = "engineering"
        elif any(t in tokens for t in ["market", "marketing", "hr", "human", "business", "operations", "logistics", "management", "procurement", "inventory", "sales"]):
            matched_domain = "business_management"
        elif any(t in tokens for t in ["political", "community", "relations", "public", "social", "policy", "government", "writer", "communications"]):
            matched_domain = "social_sciences"

        if matched_domain and matched_domain in APPROVED_DOMAIN_FALLBACKS:
            fb_data = APPROVED_DOMAIN_FALLBACKS[matched_domain]
            print(f"RoleProfileRegistry: Using DEGRADED Tier 4 approved domain fallback '{matched_domain}' for role '{canonical_role}'.")
            profile = RoleProfile(
                canonical_role=canonical_role,
                profile_id=f"domain_fallback_{matched_domain}",
                version=fb_data.get("version", "fallback-1.0.0"),
                domain=fb_data.get("domain", "General"),
                required_skills=tuple(fb_data.get("required_skills", [])),
                recommended_skills=tuple(fb_data.get("recommended_skills", [])),
                education_benchmarks=tuple(fb_data.get("education_benchmarks", [])),
                certification_benchmarks=tuple(fb_data.get("certification_benchmarks", [])),
                profile_source="APPROVED_DOMAIN_FALLBACK",
                is_degraded=True,  # EXPLICITLY DEGRADED
                last_updated="2026-09-15"
            )
            return copy.deepcopy(profile)

    # --- REFUSAL: TARGET_ROLE_PROFILE_UNRESOLVED ---
    raise RoleProfileUnresolvedError(
        f"The specified target role '{canonical_role}' has not yet been onboarded to the authoritative career registry. "
        f"Please select a recognized career track from your academic program."
    )
