const { gradeToGradYear, gradYearToGrade, getDivision } = require("../app/core/student-core");

test("gradeToGradYear works as expected", () => {
	expect(gradeToGradYear(7)).toEqual(2025);
	expect(gradeToGradYear(8)).toEqual(2024);
	expect(gradeToGradYear(9)).toEqual(2023);
	expect(gradeToGradYear(10)).toEqual(2022);
	expect(gradeToGradYear(11)).toEqual(2021);
	expect(gradeToGradYear(12)).toEqual(2020);
});

test("gradYearToGrade works as expected", () => {
	expect(gradYearToGrade(2025)).toEqual(7);
	expect(gradYearToGrade(2024)).toEqual(8);
	expect(gradYearToGrade(2023)).toEqual(9);
	expect(gradYearToGrade(2022)).toEqual(10);
	expect(gradYearToGrade(2021)).toEqual(11);
	expect(gradYearToGrade(2020)).toEqual(12);
});

test("getDivision works as expected", () => {
	expect(getDivision(7)).toEqual("MIDDLE");
	expect(getDivision(8)).toEqual("MIDDLE");
	expect(getDivision(9)).toEqual("UPPER");
	expect(getDivision(10)).toEqual("UPPER");
	expect(getDivision(11)).toEqual("UPPER");
	expect(getDivision(12)).toEqual("UPPER");
});