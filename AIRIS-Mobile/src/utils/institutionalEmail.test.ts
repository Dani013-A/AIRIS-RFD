import { isManilaStudentEmail } from './institutionalEmail';
test.each(['mdaespela@tip.edu.ph','m@tip.edu.ph',' M.Student+test@TIP.EDU.PH '])('accepts Manila campus marker %s', email => expect(isManilaStudentEmail(email)).toBe(true));
test.each(['qstudent@tip.edu.ph','student@tip.edu.ph','m..student@tip.edu.ph','m.@tip.edu.ph','m@tip.edu.ph.evil','m @tip.edu.ph','','m@other.edu'])('rejects ineligible/malformed address %s', email => expect(isManilaStudentEmail(email)).toBe(false));
