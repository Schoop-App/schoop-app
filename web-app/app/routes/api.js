const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const accessProtectionMiddleware = require("../middleware/access-protection");

const urlencodedParser = bodyParser.urlencoded({ extended: true }); // using qs

// TODO: (MAYBE) Move ALLLLLLL of this stuff to a separate file (Modularize! Make it compact!)
const Division = {
	MIDDLE: "MIDDLE",
	UPPER: "UPPER"
};

const PERIODS = {
	MIDDLE: [1, 2, 3, 4, 5, 6, 8],
	UPPER: [1, 2, 3, 4, 5, 6, 7, 8, 9]
};

const gradeToGradYear = grade => {
	if (grade >= 0 && grade <= 12) {
		let date = new Date(); // current date
		let yearTimeAdded = (date.getMonth() > 6 && date.getMonth() <= 11) ? 1 : 0;
		let adjustedYear = date.getFullYear() + yearTimeAdded;

		return adjustedYear + (12 - grade);
	} else {
		throw new Error("invalid grade given");
	}
};

const gradYearToGrade = year => {
	let date = new Date(); // current date
	// let yearTimeDeducted = !(date.getMonth() > 6 && date.getMonth() <= 11) ? 1 : 0;
	let yearTimeDeducted = (date.getMonth() <= 6 || date.getMonth() > 11) ? 1 : 0;
	let adjustedYear = date.getFullYear() - yearTimeDeducted;

	return (year - adjustedYear) + 7;
};

const getDivision = grade => {
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
};

/* API ROUTES */
module.exports = imports => {
	const Sentry = imports.Sentry;
	const passport = imports.passport;
	const logger = imports.logger;
	const db = imports.db; // database

	const limiter = rateLimit({
		windowMs: 60 * 1000, // 1 minute
		max: 100 // limit each IP to 100 req/min (too much? too little?)
	});

	const router = require("express").Router();

	router.use("/auth", require("./auth")({ Sentry, passport, logger, db })); // hee hee

	// protected endpoint test
	// router.get("/test_login", accessProtectionMiddleware, (req, res) => {
	// 	res.status(200).send({
	// 		message: "You are authenticated. Welcome to this protected endpoint!",
	// 		userInfo: req.user
	// 	});
	// });

	// PROTECTED ENDPOINTS
	router.put("/classes", accessProtectionMiddleware, urlencodedParser, async (req, res) => {
		let studentGradYear = gradeToGradYear(parseInt(req.body.studentGrade));
		let studentPeriods = PERIODS[getDivision(req.body.studentGrade)];

		for (const periodNumber in studentPeriods) {
			// ARGS ORDER: studentId, periodNumber, className, zoomLink
			let classQuery = await db.addClass(req.user.id, periodNumber, req.body[`className_P${periodNumber}`], req.body[`zoomLink_P${periodNumber}`]);
			if (classQuery) {
				// class query successful
				await db.setSetupState(req.user.id, 1);
				res.redirect("/home");
			} else {
				// unsuccessful
				res.status(500).send("Internal Server Error - We were unable to add your classes.");
			}
		}
	});

	// routes here

	return router;
};