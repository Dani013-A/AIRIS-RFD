export type ResumeTemplateId = 'tip' | 'harvard' | 'oxford';
export interface OfficialResumeTemplate {
  id: ResumeTemplateId;
  name: string;
  publisher: string;
  description: string;
  sourcePage: string;
  documentUrl?: string;
  fileName?: string;
  sha256?: string;
  md5?: string;
  unavailableReason?: string;
}

export const OFFICIAL_RESUME_TEMPLATES: readonly OfficialResumeTemplate[] = [
  {
    id: 'tip', name: 'T.I.P. Resume Template', publisher: 'T.I.P. Career Center',
    description: 'Official template file not yet available in AIRIS.',
    sourcePage: 'https://tip-careercenter.prosple.com/',
    unavailableReason: 'A verified T.I.P. Career Center template file is not available yet. Request the official file from the Career Center. AIRIS will not substitute a generated document.',
  },
  {
    id: 'harvard', name: 'Harvard Resume Template', publisher: 'Harvard Mignone Center for Career Success',
    description: 'Original bullet-point resume template. Replace the placeholders with your own information.',
    sourcePage: 'https://careerservices.fas.harvard.edu/resources/bullet-point-resume-template/',
    documentUrl: 'https://cdn-careerservices.fas.harvard.edu/wp-content/uploads/sites/161/2024/07/resume-bullets.pdf',
    fileName: 'Harvard_Resume_Template.pdf',
    sha256: '6bd063e2f87d5a237b94cc1cad6f8719bf8c83d13ecd2ca3b9866ae395aeb433',
    md5: 'cd232452b51bf5dbc7672f50fa8098cf',
  },
  {
    id: 'oxford', name: 'Oxford CV Example', publisher: 'University of Oxford Careers Service',
    description: 'Original traditional CV example. Use its structure as a guide; do not copy the example applicant’s details.',
    sourcePage: 'https://www.ox.ac.uk/careers/careers-guidance/job-search-and-applications/writing-applications/cvs',
    documentUrl: 'https://assets-oxweb.admin.ox.ac.uk/2026-06/traditional-cv-examplepdf.pdf',
    fileName: 'Oxford_CV_Example.pdf',
    sha256: '9b251dbd7d6700636e938b0bea2dbc58c4f5d130b8b8454381018dc1177a2c69',
    md5: '9f63ec8c9ee520f0b2c36a5c433fdfd0',
  },
];
