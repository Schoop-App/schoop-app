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
