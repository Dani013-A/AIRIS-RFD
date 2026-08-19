export const STANDARD_ROLES = [
  // ... (all existing roles unchanged) ...
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Mobile Developer",
  "Mobile Application Developer",
  "UI Designer",
  "QA Engineer",
  "System Analyst",
  "Cloud Engineer",
  "DevOps Engineer",
  "Network Administrator",
  "Software Engineer",
  "AI Engineer",
  "AI Data Trainer",
  "Data Annotation Specialist",
  "Data Scientist",
  "Machine Learning Engineer",
  "Database Administrator",
  "Systems Programmer",
  "Cybersecurity Analyst",
  "Research Scientist",
  "Data Analyst",
  "Business Intelligence Analyst",
  "Data Engineer",
  "Statistical Analyst",
  "Analytics Consultant",
  "Game Developer",
  "3D Animator",
  "Multimedia Artist",
  "Game Designer",
  "VFX Artist",
  "AR/VR Developer",
  "Motion Graphics Artist",
  "Design Architect",
  "Project Architect",
  "CAD/BIM Specialist",
  "Interior Designer",
  "Urban Planner",
  "Landscape Architect",
  "Process Engineer",
  "Plant Engineer",
  "Quality Control Engineer",
  "Production Engineer",
  "Environmental Engineer",
  "Materials Engineer",
  "Structural Engineer",
  "Site Engineer",
  "Project Engineer",
  "Geotechnical Engineer",
  "Construction Manager",
  "Estimator",
  "Embedded Software Engineer",
  "Hardware Engineer",
  "Firmware Engineer",
  "Network Architect",
  "IoT Solutions Architect",
  "Systems Engineer",
  "Electrical Design Engineer",
  "Power Systems Engineer",
  "Control Systems Engineer",
  "Project Electrical Engineer",
  "Substation Engineer",
  "Electronics Engineer",
  "Telecommunications Engineer",
  "Network Engineer",
  "Embedded Systems Engineer",
  "Microelectronics Engineer",
  "Signal Processing Engineer",
  "Process Improvement Engineer",
  "Production Planner",
  "Quality Engineer",
  "Supply Chain Analyst",
  "Operations Manager",
  "Manufacturing Engineer",
  "Mechanical Design Engineer",
  "HVAC Engineer",
  "Automotive Engineer",
  "Power Plant Engineer",
  "Maintenance Engineer",
  "Certified Public Accountant",
  "Auditor",
  "Financial Analyst",
  "Tax Consultant",
  "Bookkeeper",
  "Controller",
  "Accounting Systems Analyst",
  "Financial Systems Consultant",
  "Internal Auditor",
  "ERP Implementation Specialist",
  "HR Generalist",
  "Talent Acquisition Specialist",
  "Compensation and Benefits Analyst",
  "Training and Development Officer",
  "HR Business Partner",
  "Logistics Coordinator",
  "Procurement Officer",
  "Inventory Planner",
  "Warehouse Operations Manager",
  "Marketing Specialist",
  "Brand Associate",
  "Digital Marketing Officer",
  "Market Research Analyst",
  "Sales and Marketing Coordinator",
  "Technical Writer",
  "Copywriter",
  "Content Editor",
  "Public Relations Specialist",
  "Communications Officer",
  "Teacher/Instructor",
  "Legislative Staff",
  "Policy Analyst",
  "Paralegal",
  "Public Administration Officer",
  "Foreign Service Aide",
  "Local Government Associate",
  "Data Annotation Specialist",

  // Environmental & Sanitary Engineering (T.I.P. Quezon City CEA)
  "Sanitary Engineer",
  "Wastewater Treatment Engineer",
  "Environmental Compliance Officer",
  "Solid Waste Management Engineer",

  // College of Education (T.I.P. Quezon City)
  "Elementary School Teacher",
  "Secondary School Teacher",
  "English Teacher",
  "Mathematics Teacher",
  "Science Teacher",
  "Special Education Teacher",
  "Curriculum Developer",
  "Guidance Counselor",

  // College of Arts (BA English Language / BA Political Science, both campuses)
  "Political Science Researcher",
  "Diplomat",
  "Legislative Aide",
  "Broadcast Journalist",
  "Editorial Assistant",

  // Entertainment and Multimedia Computing (T.I.P. Manila CCS)
  "Unity Developer",
  "Unreal Engine Developer",
  "Character Animator",
  "Level Designer",
  "Technical Artist",
];

/**
 * Measure how many character changes (additions, removals, or edits) are needed to turn one text string into another.
 */
export function getLevenshteinDistance(s1: string, s2: string): number {
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      // Count if letters need to be added, removed, or replaced to change one word into the other.
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }

  return track[s2.length][s1.length];
}

/**
 * Helper to generate bigrams of a string for character similarity calculations.
 */
function getBigrams(str: string): string[] {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Calculates Sorenson-Dice similarity between two normalized strings based on character bigrams.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const bigrams1 = getBigrams(str1);
  const bigrams2 = getBigrams(str2);

  if (bigrams1.length === 0 && bigrams2.length === 0) return 1;
  if (bigrams1.length === 0 || bigrams2.length === 0) return 0;

  const set2 = new Set(bigrams2);
  let intersection = 0;
  for (const bigram of bigrams1) {
    if (set2.has(bigram)) {
      intersection++;
    }
  }

  return (2 * intersection) / (bigrams1.length + bigrams2.length);
}

/**
 * Normalizes input and fuzzy-matches it to a list of standard roles in the system.
 * Handles typographical errors (e.g. "Data Anotation" -> "Data Annotation Specialist").
 */
export function fuzzyMatchRole(input: string): string {
  if (!input) return "";

  const normalizedInput = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");
  if (!normalizedInput) return input;

  let bestMatch = "";
  let highestSimilarity = 0;

  // Step 1: Check if the text matches any standard job title exactly.
  // Step 2: Check if what the user typed is a part of a longer job title we have on record.
  // Step 3: Compare the letter combinations of both words to check for matching pairs.
  for (const role of STANDARD_ROLES) {
    const normalizedRole = role
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "");
    if (normalizedInput === normalizedRole) {
      return role;
    }
  }

  for (const role of STANDARD_ROLES) {
    const normalizedRole = role
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "");
    if (normalizedInput.includes(normalizedRole) || normalizedRole.includes(normalizedInput)) {
      // Calculate how similar the words are when a match is found.
      const similarity = calculateStringSimilarity(normalizedInput, normalizedRole);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = role;
      }
    }
  }

  if (highestSimilarity >= 0.5) {
    return bestMatch;
  }

  for (const role of STANDARD_ROLES) {
    const normalizedRole = role
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "");
    const similarity = calculateStringSimilarity(normalizedInput, normalizedRole);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = role;
    }
  }

  if (highestSimilarity >= 0.65) {
    return bestMatch;
  }

  // Step 4: Look for minor typos or spelling differences in short words.
  let closestRole = "";
  let minDistance = Infinity;

  for (const role of STANDARD_ROLES) {
    const normalizedRole = role
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "");
    const dist = getLevenshteinDistance(normalizedInput, normalizedRole);
    if (dist < minDistance) {
      minDistance = dist;
      closestRole = role;
    }
  }

  if (minDistance <= 3) {
    return closestRole;
  }

  return input;  // If no close match is found, keep the text exactly as the student typed it.
}
