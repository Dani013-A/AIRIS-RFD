import { analyzeResume, parseResumeSections } from "./resumeAnalysisEngine";
import { normalizeResumeText } from "./resumeNormalizer";

const resume = `
DANIEL A. ESPERA

Manila, Philippines
daniel.espera@email.com | +63 917 123 4567
LinkedIn: linkedin.com/in/daniel-espera | GitHub: github.com/daniel-espera

PROFESSIONAL SUMMARY

Aspiring Data Analyst with a strong foundation in data analysis, statistics, programming, and data visualization. Experienced in using Python, SQL, Excel, and Power BI to clean, analyze, and visualize datasets. Developed academic and personal projects involving data processing, dashboard development, and machine learning. Seeking an entry-level Data Analyst position where I can apply analytical and technical skills to solve business problems.

EDUCATION

Bachelor of Science in Information Technology
Technological Institute of the Philippines, Manila
2023 - 2027

Relevant Coursework: Database Management, Data Analytics, Statistics, Programming, Web Development, Machine Learning, Information Management

TECHNICAL SKILLS

Programming: Python, SQL, C++, Java
Data Analysis: Pandas, NumPy, Microsoft Excel
Data Visualization: Matplotlib, Power BI, Tableau
Databases: MySQL, PostgreSQL, Firebase
Tools: Git, GitHub, VS Code, Jupyter Notebook
Machine Learning: Scikit-learn, Data Preprocessing, Classification, Regression

WORK EXPERIENCE

Data Encoding Assistant
Manila, Philippines | 2025 - Present

Encoded and maintained large volumes of structured records while maintaining accuracy and consistency.
Reviewed datasets for missing, duplicated, and inconsistent information.
Organized spreadsheets and prepared records for further processing and reporting.
Used Microsoft Excel to sort, filter, validate, and organize data efficiently.
Improved data-entry workflow by creating standardized formatting and validation procedures.
INTERNSHIP EXPERIENCE

Data Analytics Intern
ABC Solutions Inc., Manila | June 2026 - August 2026

Assisted with cleaning and preparing datasets for analysis.
Created Excel reports and visualizations to communicate business trends.
Used SQL queries to retrieve and organize information from relational databases.
Worked with team members to identify data quality issues and document findings.
Presented analytical findings through charts and summary reports.
PROJECTS

Sales Performance Analysis Dashboard
Python, Pandas, Power BI, SQL

Cleaned and analyzed a dataset containing more than 10,000 sales transactions.
Used Python and Pandas to identify sales trends, missing values, and outliers.
Created interactive Power BI dashboards showing revenue, product performance, and regional sales.
Used SQL queries to summarize customer and transaction data.
Identified the highest-performing products and regions based on historical sales data.

Student Performance Prediction System
Python, Pandas, Scikit-learn

Developed a machine learning model to predict student performance using academic data.
Performed data preprocessing, feature selection, and exploratory data analysis.
Compared classification models using accuracy and other evaluation metrics.
Visualized relationships between attendance, study time, and academic performance.
CERTIFICATIONS

IBM SkillsBuild - Machine Learning Methods and Tools
IBM | 2026

IBM SkillsBuild - Data Analytics for Machine Learning
IBM | 2026

Microsoft Certified: Azure Data Fundamentals
Microsoft | 2026

TRAININGS AND SEMINARS

Introduction to Data Analytics
IBM SkillsBuild | 2026

SQL for Data Analysis Workshop
DataCamp | 2026

Power BI Data Visualization Seminar
Microsoft Learn Community | 2026

Python for Data Science Training
Coursera | 2026

ORGANIZATIONS & LEADERSHIP

Information Technology Student Organization
Member | 2024 - Present

Participated in technical workshops, programming activities, and technology-related seminars.
Collaborated with other students during academic and technical projects.
ACHIEVEMENTS
Dean's List, 2025
Academic Excellence Award, 2024
Finalist, University Data Analytics Competition, 2026
LANGUAGES
English - Fluent
Filipino - Native
`;

console.log("=== RAW PARSE ===");
const parsed = parseResumeSections(normalizeResumeText(resume));
console.log(parsed.map(s => s.name));

console.log("=== FULL ANALYSIS ===");
const result = analyzeResume(resume, "Data Analyst");
console.log(result.parsedSections.map(s => s.name));

console.log("Missing sections:");
console.log(result.missingSections.map(s => s.name));
