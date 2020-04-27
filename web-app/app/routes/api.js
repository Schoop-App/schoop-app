const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const accessProtectionMiddleware = require("../middleware/access-protection");
const endpointNoCacheMiddleware = require("../middleware/endpoint-no-cache");
const getQotd = require("../../getQotd");

const urlencodedParser = bodyParser.urlencoded({ extended: true }); // using qs
const jsonParser = bodyParser.json();

// SCHEDULES
const schedules = require("../core/schedules");

// STUDENT CORE
const { Division, PERIODS, gradeToGradYear, gradYearToGrade, getDivision } = require("../core/student-core");

const INTERNAL_SERVER_ERROR_RESPONSE = {
	status: "error",
	message: "Internal Server Error"
};

const parseAthleticsPeriod = period => {
	let athleticsPeriod;
	try {
		// it's parsed as a string by body-parser
		athleticsPeriod = parseInt(period);
	} catch (e) {
		athleticsPeriod = period;
	}
	athleticsPeriod = (typeof athleticsPeriod === "number" && athleticsPeriod >= 1 && athleticsPeriod <= 9) ? athleticsPeriod : -1;
	return athleticsPeriod;
};

/* API ROUTES */
module.exports = imports => {
	const Sentry = imports.Sentry;
	const passport = imports.passport;
	const logger = imports.logger;
	const db = imports.db; // database
	const redisClient = imports.redisClient; // Redis client

	const redisGetAsync = require("util").promisify(redisClient.get).bind(redisClient); // set async function for redis

	// const limiter = rateLimit({
	// 	windowMs: 60 * 1000, // 1 minute
	// 	max: 100 // limit each IP to 100 req/min (too much? too little?)
	// });

	const router = require("express").Router();

	router.use("/auth", require("./auth")({ Sentry, passport, logger, db })); // hee hee
	router.use("/mutate", require("./mutate")({ Sentry, db, accessProtectionMiddleware }));

	// PROTECTED ENDPOINTS
	// setup
	router.post("/classes", accessProtectionMiddleware, urlencodedParser, async (req, res) => {
		// logger.log("Called /classes in API endpoints");
		let studentSetupState = await db.studentDidSetup(req.user.id);
		if (studentSetupState === 0) {
			// DID NOT SET UP
			let athleticsPeriod = parseAthleticsPeriod(req.body.athleticsPeriod);
			// this may not even be necessary but I wanted to do some quality control11
			let studentDivision = getDivision(req.body.studentGrade) || req.body.studentDivision;
			let studentPeriods = PERIODS[studentDivision];
			try {
				let periodNumber, className, zoomLink, isAthletics;
				//for (const periodNumber in studentPeriods) {
				for (let i = 0; i < studentPeriods.length; i++) {
					periodNumber = studentPeriods[i];
					className = req.body[`className_P${periodNumber}`].trim();
					zoomLink = req.body[`zoomLink_P${periodNumber}`].trim();
					isAthletics = periodNumber === athleticsPeriod;
					if (className !== "" || zoomLink !== "") // DeMorgan's Law coming in handy ;)
						db.addClass(req.user.id, periodNumber, className, zoomLink, isAthletics);
				}

				// *** Setting graduation year
				await db.setStudentGradYear(req.user.id, gradeToGradYear(req.body.studentGrade));

				// *** Setting seminar Zoom link
				await db.setSeminarZoomLink(req.user.id, req.body.zoomLink_SEMINAR);

				// *** Setting student email consent (or not)
				// side note: not sure if the studentConsentedToEmail checkbox is parsed as a 0/1 binary value or as a JS boolean. But either one will work below:
				if (req.body.studentConsentedToEmail) await db.setStudentConsentedToEmail(req.user.id, 1);
				if (req.body.studentWantsDailyEmail) await db.setStudentWantsDailyEmail(req.user.id, 1);

				// class query successful
				await db.setSetupState(req.user.id, 1);
				res.redirect("/home");
			} catch (e) {
				// unsuccessful
				Sentry.captureException(e); // so I can see it hehe
				logger.log("oops, error:");
				logger.error(e);
				res.status(500).send(`We were not able to register you. Please try again.<br><br><em>SERVER ERROR: ${e.message}</em>`);
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
	// maybe I SHOULD be caching this...on the server side (with Redis maybe?)
	router.get("/schedule/:division/:day", accessProtectionMiddleware, endpointNoCacheMiddleware, async (req, res) => {
		try {
			let schedule = await schedules.getSchedule(req.params.division, req.params.day);
			res.status(200).send(schedule);
		} catch (e) {
			res.status(400).send({
				status: "error",
				message: e.message
			});
		}
	});
	router.get("/classes", accessProtectionMiddleware, endpointNoCacheMiddleware, async (req, res) => {
		let classes = await db.getClasses(req.user.id);
		for (let i = 0; i < classes.length; i++) {
			delete classes[i]["student_oauth_id"]; // probably best to hide this
			delete classes[i]["bound_for_deletion"]; // unneeded
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
	
	// misc (NOT for production):
	if (typeof process.env.NODE_ENV !== "undefined" && process.env.NODE_ENV !== "production") {
		router.get("/me", accessProtectionMiddleware, endpointNoCacheMiddleware, async (req, res) => {
			let studentInfo = await db.getStudentInfo(req.user.id);
			res.status(200).send(studentInfo);
		});
		router.get("/me_session", accessProtectionMiddleware, endpointNoCacheMiddleware, (req, res) => res.status(200).send(req.user));
	}

	// USER PAGE APIs (for now, that's just for updating classes and deleting account)
	router.post("/update_classes", accessProtectionMiddleware, jsonParser, async (req, res) => {
		try {
			await db.updateClasses(req.user.id, req.body.classes);
			await db.setSeminarZoomLink(req.user.id, req.body.seminarZoomLink);
			await db.setAthleticsPeriod(req.user.id, parseAthleticsPeriod(req.body.athleticsPeriod || -1));
			res.status(200).send({
				status: "ok"
			});
		} catch (e) {
			logger.error(e);
			res.status(500).send({
				status: "error",
				message: "Internal Server Error (maybe tell Zane!)",
				error: e.message // maybe best not to leave this here
			});
		}
	});
	router.post("/delete_account", accessProtectionMiddleware, jsonParser, async (req, res) => {
		try {
			let studentInfo = await db.getStudentInfo(req.user.id);
			if (studentInfo.email === req.body.email) {
				// user successfully initiated account deletion
				await db.deleteAccount(req.user.id);
				req.session.destroy(err => {
					res.status(200).send({
						status: "ok"
					});
				});
			} else {
				// res.status(400).send({
				res.status(200).send({ // because...
					status: "error",
					message: "We were not able to delete your account because you did not type your email in correctly. Please try again."
				});
			}
		} catch (e) {
			logger.error(e);
			res.status(500).send({
				status: "error",
				message: "Internal Server Error (maybe tell Zane!)",
				error: e.message // maybe best not to leave this here
			});
		}
	});

	// ONBOARDING
	router.post("/student_has_seen_onboarding", async (req, res) => {
		try {
			await db.setStudentHasSeenOnboarding(req.user.id, 1);
			res.status(200).send({ status: "ok" });
		} catch (e) {
			res.status(500).send(INTERNAL_SERVER_ERROR_RESPONSE);
		}
	});

	// routes here

	return router;
};
