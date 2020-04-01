const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const accessProtectionMiddleware = require("../middleware/access-protection");
const endpointNoCacheMiddleware = require("../middleware/endpoint-no-cache");
const getQotd = require("../../getQotd");
const readFileAsync = require("fs").promises.readFile;

const urlencodedParser = bodyParser.urlencoded({ extended: true }); // using qs

// STUDENT CORE
const { Division, PERIODS, gradeToGradYear, gradYearToGrade, getDivision } = require("../core/student-core.js");

const SCHEDULE_TEMPLATE_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const INTERNAL_SERVER_ERROR_RESPONSE = {
	status: "error",
	message: "Internal Server Error"
};

/* API ROUTES */
module.exports = imports => {
	const Sentry = imports.Sentry;
	const passport = imports.passport;
	const logger = imports.logger;
	const db = imports.db; // database
	const redisClient = imports.redisClient; // Redis client

	const redisGetAsync = require("util").promisify(redisClient.get).bind(redisClient); // set async function for redis

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
	// setup
	router.post("/classes", accessProtectionMiddleware, urlencodedParser, async (req, res) => {
		// logger.log("Called /classes in API endpoints");
		let studentSetupState = await db.studentDidSetup(req.user.id);
		if (studentSetupState === 0) {
			// DID NOT SET UP
			// let studentGradYear = gradeToGradYear(parseInt(req.body.studentGrade));
			let studentDivision = getDivision(req.body.studentGrade) || req.body.studentDivision;
			let studentPeriods = PERIODS[studentDivision];
			// logger.log(`studentPeriods: ${studentPeriods[0]}`);
			// logger.log(`req.body: ${JSON.stringify(req.body)}`);

			// let addedClassesSuccessfully = true;
			try {
				// logger.log("Adding classes...");
				// *** Adding classes:
				let periodNumber;
				//for (const periodNumber in studentPeriods) {
				for (let i = 0; i < studentPeriods.length; i++) {
					periodNumber = studentPeriods[i];
					// ARGS ORDER: studentId, periodNumber, className, zoomLink
					// logger.log("Try for periodNumber " + periodNumber);
					/*let classQuery = */  db.addClass(req.user.id, periodNumber, req.body[`className_P${periodNumber}`].trim(), req.body[`zoomLink_P${periodNumber}`].trim());
					// logger.log(classQuery);
				}

				// *** Setting graduation year
				await db.setStudentGradYear(req.user.id, gradeToGradYear(req.body.studentGrade));

				// *** Setting seminar Zoom link
				await db.setSeminarZoomLink(req.user.id, req.body.zoomLink_SEMINAR);

				// *** Setting student email consent (or not)
				// side note: not sure if the studentConsentedToEmail checkbox is parsed as a 0/1 binary value or as a JS boolean. But either one will work below:
				if (req.body.studentConsentedToEmail) await db.setStudentConsentedToEmail(req.user.id);

				// class query successful
				await db.setSetupState(req.user.id, 1);
				res.redirect("/home");
			} catch (e) {
				// unsuccessful
				logger.log("oops, error:");
				logger.error(e);
				res.status(500).send(`We were not able to register you. Please try again.<br><br><em>SERVER ERROR: ${e.toString()}</em>`);
			}
		} else if (studentSetupState === 1) {
			// ALREADY SET UP
			// TODO: move this into a file
			res.status(400).send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Already Registered</title><meta http-equiv="refresh" content="2;url=https://schoop.app/home" /></head><body><p>You have already completed setup. You will be redirected to the homepage.</p><p><em>If you are not redirected, <a href="https://schoop.app/home">click here</a> to be redirected.</em></p></body></html>`);
		} else {
			// UNEXPECTED VALUE
			let errString = "Internal Server Error – Unexpected student setup state";
			Sentry.captureException(new Error(errString)); // send it along to me!
			res.status(500).send(errString); // send it along to the user
		}
	});

	// home
	router.get("/schedule/:division/:day", accessProtectionMiddleware, endpointNoCacheMiddleware, async (req, res) => {
		if ((req.params.division === Division.MIDDLE || req.params.division === Division.UPPER) && SCHEDULE_TEMPLATE_DAYS.includes(req.params.day)) {
			try {
				let scheduleFile = await readFileAsync(`${__dirname}/../../../schedules/${req.params.division}/${req.params.day}.json`);
				res.status(200).send(JSON.parse(scheduleFile.toString()));
			} catch (e) {
				logger.error(e);
				res.status(500).send(INTERNAL_SERVER_ERROR_RESPONSE);
			}
		} else {
			res.status(400).send({
				status: "error",
				message: "Invalid Request – malformed schedule template query"
			});
		}
	});
	router.get("/classes", accessProtectionMiddleware, endpointNoCacheMiddleware, async (req, res) => {
		let classes = await db.getClasses(req.user.id);
		for (let i = 0; i < classes.length; i++) {
			delete classes[i]["student_oauth_id"]; // probably best to hide this
		}
		res.status(200).send(classes);
	});
	// QUESTION: should this be no-cache?
	router.get("/qotd", accessProtectionMiddleware, async (req, res) => {
		try {
			let qotdDataFromRedis = await redisGetAsync("schoop:qotd");
			let quoteToSend;
			if (qotdDataFromRedis === null) {
				quoteToSend = await getQotd();
			} else {
				quoteToSend = JSON.parse(qotdDataFromRedis);
			}
			res.status(200).send(quoteToSend);
		} catch (e) {
			res.status(500).send(INTERNAL_SERVER_ERROR_RESPONSE);
		}
	});
	router.get("/class_colors", accessProtectionMiddleware, (req, res) => res.status(200).send([
		"#9CE87B",
		"#89BBEF",
		"#FEF486",
		"#F1D483",
		"#BABABC",
		"#B198E6",
		"#82C2E5",
		"#EE9DC2",
		"#60B2A1"
	])); // for now......... Maybe I should store this in a file or in Redis. We will see...
	// misc:
	router.get("/me", accessProtectionMiddleware, endpointNoCacheMiddleware, async (req, res) => {
		let info = await db.getStudentInfo(req.user.id);
		res.status(200).send(info);
	});

	// routes here

	return router;
};