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
