const Division = {
	MIDDLE: "MIDDLE",
	UPPER: "UPPER"
};

// const PERIODS = {
// 	MIDDLE: [1, 2, 3, 4, 5, 6, 8],
// 	UPPER: [1, 2, 3, 4, 5, 6, 7, 8, 9]
// };

// new schedule prep!
const PERIODS = {
	MIDDLE: [1, 2, 3, 4, 5, 6, 7, 8],
	UPPER: [1, 2, 3, 4, 5, 6, 7, 8]
};

// Moved these here as I should have a long time ago.
const CLASS_COLORS = [
	"#9CE87B",
	"#89BBEF",
	"#FEF486",
	"#F1D483",
	"#BABABC",
	"#B198E6",
	"#82C2E5",
	"#EE9DC2",
	"#60B2A1"
];

const gradeToGradYear = grade => {
	if (grade >= 0 && grade <= 12) {
		let date = new Date(); // current date
		let yearTimeAdded = (date.getMonth() >= 7 && date.getMonth() <= 11) ? 1 : 0;
		let adjustedYear = date.getFullYear() + yearTimeAdded;

		return adjustedYear + (12 - grade);
	} else {
		throw new Error("invalid grade given");
	}
};

const gradYearToGrade = year => {
	let date = new Date(); // current date
	let yearTimeAdded = (date.getMonth() >= 7 && date.getMonth() <= 11) ? 1 : 0;
	// let yearTimeDeducted = (date.getMonth() <= 6 || date.getMonth() > 11) ? 1 : 0;
	let adjustedYear = date.getFullYear() + yearTimeAdded;

	// return (year - adjustedYear) + 7;
	return adjustedYear - year + 12;
};

const getDivision = grade => {
	let division;
	switch (grade) {
		case 7:
		case 8:
			division = Division.MIDDLE;
			break;
		case 9:
		case 10:
		case 11:
		case 12:
			division = Division.UPPER;
			break;
	}
	return division;
};

// Now that I've written this, I ought to employ it everywhere that uses this basic formula (below).
const getDivisionFromGradYear = gradYear => getDivision(gradYearToGrade(gradYear));

module.exports = {
	Division,
	PERIODS,
	CLASS_COLORS,
	gradeToGradYear,
	gradYearToGrade,
	getDivision,
	getDivisionFromGradYear
};
