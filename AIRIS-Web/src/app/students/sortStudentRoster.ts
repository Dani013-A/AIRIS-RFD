import type { StudentListItem } from "../../types/user.types";

export function sortStudentRoster(students: StudentListItem[], sort: string): StudentListItem[] {
  const [sortField, sortDirection] = sort.split("-");
  return [...students].sort((a, b) => {
    const field = sortField === "resume" ? "resumeScore" : sortField === "interview" ? "interviewScore" : sortField === "readiness" ? "employabilityScore" : null;
    if (field) {
      const aScore = a[field];
      const bScore = b[field];
      if (aScore === undefined) return bScore === undefined ? a.fullName.localeCompare(b.fullName) : 1;
      if (bScore === undefined) return -1;
      return (aScore - bScore) * (sortDirection === "desc" ? -1 : 1) || a.fullName.localeCompare(b.fullName);
    }
    const aName = sortField === "college" ? a.college || "" : sortField === "program" ? a.degreeProgram || "" : sortField === "target" ? a.targetPosition || "" : a.fullName;
    const bName = sortField === "college" ? b.college || "" : sortField === "program" ? b.degreeProgram || "" : sortField === "target" ? b.targetPosition || "" : b.fullName;
    return aName.localeCompare(bName) * (sortDirection === "desc" ? -1 : 1) || a.fullName.localeCompare(b.fullName);
  });
}
