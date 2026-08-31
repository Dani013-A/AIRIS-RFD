import { tipManilaPrograms } from "../data/tipManilaPrograms";
import { validateCareerRole } from "../services/ai/careerValidator";

export interface ValidationOutput {
  isValid: boolean;
  message?: string;
  normalizedValue?: string;
}

/**
 * Validates realistic human names.
 * Accepts spaces, hyphens, apostrophes, middle initials, and common suffixes (e.g. "Juan Dela Cruz", "Mary-Jane", "O'Connor").
 * Rejects numbers, symbols, empty strings, and control characters.
 */
export function validatePersonName(name: string): ValidationOutput {
  if (!name || typeof name !== "string") {
    return { isValid: false, message: "Full name is required." };
  }

  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) {
    return { isValid: false, message: "Name must be at least 2 characters long." };
  }

  if (trimmed.length > 70) {
    return { isValid: false, message: "Name must not exceed 70 characters." };
  }

  // Reject names containing digits
  if (/\d/.exec(trimmed)) {
    return { isValid: false, message: "Name cannot contain numbers." };
  }

  // Reject invalid symbol sequences or control characters
  if (/[!@#$%^&*()_+=\[\]{};:"\\|<>?/~`§±×≈]/.exec(trimmed)) {
    return { isValid: false, message: "Name cannot contain invalid symbols." };
  }

  // Realistic name regex: letters, spaces, hyphens, apostrophes, periods (for initials)
  const nameRegex = /^[A-Za-z\u00C0-\u024F\s\-''.]+$/;
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, message: "Please enter a valid name." };
  }

  return { isValid: true, normalizedValue: trimmed };
}

/**
 * Validates College Department and Degree Program against canonical tipManilaPrograms.
 * Ensures the selected degree program strictly belongs to the selected college department.
 */
export function validateAcademicSelection(department: string, program: string): ValidationOutput {
  const normDept = (department || "").trim();
  const normProg = (program || "").trim();

  if (!normDept) {
    return { isValid: false, message: "College Department selection is required." };
  }

  const collegeData = tipManilaPrograms.find(
    (c) => c.name.toLowerCase() === normDept.toLowerCase()
  );

  if (!collegeData) {
    // If not found in standard catalog, return validation result
    return { isValid: false, message: "Please select a valid College Department from the list." };
  }

  if (!normProg) {
    return { isValid: false, message: "Degree Program selection is required." };
  }

  const validProg = collegeData.programs.find(
    (p) => p.name.toLowerCase() === normProg.toLowerCase()
  );

  if (!validProg) {
    return {
      isValid: false,
      message: `The program "${normProg}" does not belong to ${collegeData.name}. Please select a valid program.`,
    };
  }

  return {
    isValid: true,
    normalizedValue: `${collegeData.name} | ${validProg.name}`,
  };
}

/**
 * Validates and normalizes target career role using canonical benchmarks and validator.
 */
export async function validateCareerInput(career: string, degreeProgram?: string): Promise<ValidationOutput> {
  const trimmed = (career || "").trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return { isValid: false, message: "Target career position is required." };
  }

  if (trimmed.length < 3) {
    return { isValid: false, message: "Career title is too short to represent a standard target role." };
  }

  const result = await validateCareerRole(trimmed, degreeProgram || "");
  if (!result.isValid) {
    return { isValid: false, message: result.reason || "Please select or specify a standard professional role." };
  }

  return { isValid: true, normalizedValue: trimmed };
}

export interface CustomCourseValidationOutput extends ValidationOutput {
  isUncertain?: boolean;
}

/**
 * Validates custom "Others" degree program entries against selected College Department.
 * Prevents garbage, numbers-only, or malicious input while safely accepting related or interdisciplinary custom programs (e.g. "Sanitary Engineering" under Civil Engineering / Engineering).
 */
export function validateCustomCourse(customCourse: string, departmentName: string): CustomCourseValidationOutput {
  if (!customCourse || typeof customCourse !== "string") {
    return { isValid: false, message: "Custom degree program name is required." };
  }

  const trimmed = customCourse.trim().replace(/\s+/g, " ");

  if (trimmed.length < 3) {
    return { isValid: false, message: "Degree program name is too short. Please enter at least 3 characters." };
  }

  if (trimmed.length > 80) {
    return { isValid: false, message: "Degree program name must not exceed 80 characters." };
  }

  // Reject numbers-only or symbol-only input
  if (/^\d+$/.test(trimmed)) {
    return { isValid: false, message: "Degree program name cannot consist only of numbers." };
  }

  if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(trimmed)) {
    return { isValid: false, message: "Degree program name cannot consist only of special characters." };
  }

  // Check for invalid control characters or script injection tokens
  if (/[<>{}\\]/.test(trimmed)) {
    return { isValid: false, message: "Degree program name contains invalid characters." };
  }

  // Department token matching using canonical catalog
  const collegeData = tipManilaPrograms.find(
    (c) => c.name.toLowerCase() === (departmentName || "").toLowerCase()
  );

  const deptTokens = (collegeData ? collegeData.name : departmentName)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t !== "college" && t !== "of" && t !== "and" && t.length > 2);

  const courseTokens = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  let matchFound = false;
  for (const cToken of courseTokens) {
    if (deptTokens.some((dToken) => cToken.includes(dToken) || dToken.includes(cToken))) {
      matchFound = true;
      break;
    }
  }

  // Also check if any existing canonical program in that college shares words with custom course
  if (!matchFound && collegeData) {
    for (const prog of collegeData.programs) {
      const pTokens = prog.name.toLowerCase().split(/\s+/);
      if (courseTokens.some((ct) => pTokens.includes(ct))) {
        matchFound = true;
        break;
      }
    }
  }

  if (matchFound) {
    return { isValid: true, normalizedValue: trimmed };
  }

  // If no direct domain token overlap, flag as uncertain warning rather than hard rejection
  return {
    isValid: true,
    isUncertain: true,
    normalizedValue: trimmed,
    message: `"${trimmed}" differs from typical ${departmentName} programs. If this is your official degree, you may proceed.`,
  };
}
