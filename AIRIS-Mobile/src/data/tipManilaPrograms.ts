export interface DegreeProgram {
  name: string;
  suggestedPositions: string[];
}

export interface College {
  name: string;
  programs: DegreeProgram[];
}

export const tipManilaPrograms: College[] = [
  {
    name: "College of Computer Studies",
    programs: [
      {
        name: "BS Information Technology",
        suggestedPositions: [
          "Frontend Developer",
          "Backend Developer",
          "Full Stack Developer",
          "Mobile Developer",
          "UI Designer",
          "QA Engineer",
          "System Analyst",
          "Cloud Engineer",
          "DevOps Engineer",
          "Network Administrator",
        ],
      },
      {
        name: "BS Computer Science",
        suggestedPositions: [
          "Software Engineer",
          "AI Engineer",
          "Data Scientist",
          "Machine Learning Engineer",
          "Database Administrator",
          "Systems Programmer",
          "Cybersecurity Analyst",
          "Research Scientist",
        ],
      },
      {
        name: "BS Information Systems",
        suggestedPositions: [
          "System Analyst",
          "Business Intelligence Analyst",
          "ERP Implementation Specialist",
          "Database Administrator",
          "IT Project Coordinator",
          "Systems Integration Analyst",
        ],
      },
      {
        name: "BS Data Science and Analytics",
        suggestedPositions: [
          "Data Analyst",
          "Data Scientist",
          "Business Intelligence Analyst",
          "Machine Learning Engineer",
          "Data Engineer",
          "Statistical Analyst",
          "Analytics Consultant",
        ],
      },
      {
        name: "BS Entertainment and Multimedia Computing",
        suggestedPositions: [
          "Game Developer",
          "3D Animator",
          "Multimedia Artist",
          "Game Designer",
          "VFX Artist",
          "AR/VR Developer",
          "Motion Graphics Artist",
          "Unity Developer",
          "Unreal Engine Developer",
          "Character Animator",
          "Level Designer",
          "Technical Artist",
        ],
      },
    ],
  },
  {
    name: "College of Engineering and Architecture",
    programs: [
      {
        name: "BS Architecture",
        suggestedPositions: [
          "Design Architect",
          "Project Architect",
          "CAD/BIM Specialist",
          "Interior Designer",
          "Urban Planner",
          "Landscape Architect",
        ],
      },
      {
        name: "BS Chemical Engineering",
        suggestedPositions: [
          "Process Engineer",
          "Plant Engineer",
          "Quality Control Engineer",
          "Production Engineer",
          "Environmental Engineer",
          "Materials Engineer",
        ],
      },
      {
        name: "BS Civil Engineering",
        suggestedPositions: [
          "Structural Engineer",
          "Site Engineer",
          "Project Engineer",
          "Geotechnical Engineer",
          "Construction Manager",
          "Estimator",
        ],
      },
      {
        name: "BS Computer Engineering",
        suggestedPositions: [
          "Embedded Software Engineer",
          "Hardware Engineer",
          "Firmware Engineer",
          "Network Architect",
          "IoT Solutions Architect",
          "Systems Engineer",
        ],
      },
      {
        name: "BS Electrical Engineering",
        suggestedPositions: [
          "Electrical Design Engineer",
          "Power Systems Engineer",
          "Control Systems Engineer",
          "Project Electrical Engineer",
          "Substation Engineer",
        ],
      },
      {
        name: "BS Electronics Engineering",
        suggestedPositions: [
          "Electronics Engineer",
          "Telecommunications Engineer",
          "Network Engineer",
          "Embedded Systems Engineer",
          "Microelectronics Engineer",
          "Signal Processing Engineer",
        ],
      },
      {
        name: "BS Environmental and Sanitary Engineering",
        suggestedPositions: [
          "Sanitary Engineer",
          "Wastewater Treatment Engineer",
          "Environmental Compliance Officer",
          "Solid Waste Management Engineer",
          "Environmental Engineer",
        ],
      },
      {
        name: "BS Industrial Engineering",
        suggestedPositions: [
          "Process Improvement Engineer",
          "Production Planner",
          "Quality Engineer",
          "Supply Chain Analyst",
          "Operations Manager",
          "Manufacturing Engineer",
        ],
      },
      {
        name: "BS Mechanical Engineering",
        suggestedPositions: [
          "Mechanical Design Engineer",
          "HVAC Engineer",
          "Automotive Engineer",
          "Manufacturing Engineer",
          "Power Plant Engineer",
          "Maintenance Engineer",
        ],
      },
    ],
  },
  {
    name: "College of Business Education",
    programs: [
      {
        name: "BS Accountancy",
        suggestedPositions: [
          "Certified Public Accountant",
          "Auditor",
          "Financial Analyst",
          "Tax Consultant",
          "Bookkeeper",
          "Controller",
        ],
      },
      {
        name: "BS Accounting Information System",
        suggestedPositions: [
          "Accounting Systems Analyst",
          "Financial Systems Consultant",
          "Internal Auditor",
          "ERP Implementation Specialist",
          "Bookkeeper",
        ],
      },
      {
        name: "BS Business Administration major in Financial Management",
        suggestedPositions: [
          "Financial Analyst",
          "Investment Analyst",
          "Credit Analyst",
          "Banking Associate",
          "Treasury Analyst",
        ],
      },
      {
        name: "BS Business Administration major in Human Resource Management",
        suggestedPositions: [
          "HR Generalist",
          "Talent Acquisition Specialist",
          "Compensation and Benefits Analyst",
          "Training and Development Officer",
          "HR Business Partner",
        ],
      },
      {
        name: "BS Business Administration major in Logistics and Supply Chain Management",
        suggestedPositions: [
          "Supply Chain Analyst",
          "Logistics Coordinator",
          "Procurement Officer",
          "Inventory Planner",
          "Warehouse Operations Manager",
        ],
      },
      {
        name: "BS Business Administration major in Marketing Management",
        suggestedPositions: [
          "Marketing Specialist",
          "Brand Associate",
          "Digital Marketing Officer",
          "Market Research Analyst",
          "Sales and Marketing Coordinator",
        ],
      },
    ],
  },
  {
    name: "College of Education",
    programs: [
      {
        name: "BSEd major in English",
        suggestedPositions: [
          "Secondary School Teacher",
          "English Teacher",
          "Curriculum Developer",
          "Guidance Counselor",
          "Content Editor",
        ],
      },
      {
        name: "BSEd major in Mathematics",
        suggestedPositions: [
          "Secondary School Teacher",
          "Mathematics Teacher",
          "Curriculum Developer",
          "Academic Tutor",
        ],
      },
      {
        name: "BSEd major in Sciences",
        suggestedPositions: [
          "Secondary School Teacher",
          "Science Teacher",
          "Curriculum Developer",
          "Laboratory Instructor",
        ],
      },
      {
        name: "Bachelor of Special Needs Education",
        suggestedPositions: [
          "Special Education Teacher",
          "Elementary School Teacher",
          "Guidance Counselor",
          "Learning Support Specialist",
        ],
      },
    ],
  },
  {
    name: "College of Arts",
    programs: [
      {
        name: "AB English Language",
        suggestedPositions: [
          "Technical Writer",
          "Copywriter",
          "Content Editor",
          "Public Relations Specialist",
          "Communications Officer",
          "Teacher/Instructor",
          "Broadcast Journalist",
          "Editorial Assistant",
        ],
      },
      {
        name: "AB Political Science",
        suggestedPositions: [
          "Legislative Staff",
          "Policy Analyst",
          "Paralegal",
          "Public Administration Officer",
          "Foreign Service Aide",
          "Local Government Associate",
          "Political Science Researcher",
          "Diplomat",
          "Legislative Aide",
        ],
      },
    ],
  },
  {
    name: "Senior High School",
    programs: [
      {
        name: "STEM Strand (Science, Technology, Engineering, and Mathematics)",
        suggestedPositions: [
          "Software Developer",
          "Civil Engineer",
          "Data Analyst",
          "Mechanical Engineer",
          "Web Designer",
        ],
      },
      {
        name: "ABM Strand (Accountancy, Business, and Management)",
        suggestedPositions: [
          "Accountant",
          "Marketing Assistant",
          "HR Coordinator",
          "Business Analyst",
        ],
      },
      {
        name: "HUMSS Strand (Humanities and Social Sciences)",
        suggestedPositions: [
          "Content Writer",
          "Public Relations Specialist",
          "Legal Assistant",
          "Communications Officer",
        ],
      },
      {
        name: "GAS Strand (General Academic Strand)",
        suggestedPositions: [
          "Business Assistant",
          "Administrative Officer",
          "Customer Support Associate",
        ],
      },
      {
        name: "TVL Strand (Technical-Vocational-Livelihood)",
        suggestedPositions: [
          "IT Support Technician",
          "Multimedia Assistant",
          "System Support Specialist",
        ],
      },
    ],
  },
];
