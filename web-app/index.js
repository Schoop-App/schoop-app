/* MAIN FILE */
// FYI: Passport and Google OAuth help from http://gregtrowbridge.com/node-authentication-with-google-oauth-part1-sessions/

// Sentry error reporting init
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://9e300dfd5afb4c2db06743525644f742@o378464.ingest.sentry.io/5201899' });

const PRIVATE_CONFIG = require("./private-config.json");

// const RAND = Math.random().toString();
const SCHOOP_HOST = process.env.SCHOOP_HOST || "https://schoop.app";
const PORT = process.env.SCHOOP_PORT || 3060;

const fs = require("fs");
const path = require("path");

const express = require("express");
const redis = require("redis");
const session = require("express-session"); // session handling middleware
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mysql = require("mysql");
const csrf = require("csurf"); // CSRF Protection
const logger = require("./app/core/logger");

// INIT CSRF PROTECTION
const csrfProtection = csrf({ cookie: true });

// STUDENT CORE
const { SCHOOL_BREAK_ALERT, gradYearToGrade, getDivision, PERIODS, Division } = require("./app/core/student-core");
const divisionPeriods = JSON.stringify(PERIODS),
      divisionOptions = JSON.stringify(Division);

// logger.log(gradYearToGrade(2022));

// IMPORTANT MIDDLEWARES
// const homeAuthCheck = require("./app/middleware/home-auth-check");
const generalAuthCheck = require("./app/middleware/general-auth-check");
const slashAuthCheck = require("./app/middleware/slash-auth-check"); // for the endpoint / ("slash")
const loginAuthCheck = require("./app/middleware/login-auth-check");

const dbConn = mysql.createConnection({
	host: PRIVATE_CONFIG.database.host,
	user: PRIVATE_CONFIG.database.user,
	password: PRIVATE_CONFIG.database.password,
	database: PRIVATE_CONFIG.database.database,
	port: PRIVATE_CONFIG.database.port,
	ssl: {
		ca: fs.readFileSync(process.env.DATABASE_CERT_PATH)
	}
});

let JS_LAST_REVISED;
try {
	JS_LAST_REVISED = parseInt(fs.readFileSync(path.join(__dirname, "/JS_LAST_REVISED.txt")).toString());
} catch (e) {
	JS_LAST_REVISED = Date.now();
}

logger.log("Connecting to database...");
dbConn.connect(async err => {
	if (err) {
		Sentry.captureException(err);
		//throw err;
		logger.error(err);
	}

	logger.log("Connected to database"); // debug

	// init redis client
	let RedisStore = require("connect-redis")(session);
	let redisClient = redis.createClient();

	const db = require("./app/core/db")({ Sentry, dbConn });
	// MIDDLEWARE **** FOR HOME:
	const homeAuthCheck = require("./app/middleware/home-auth-check")(db);
	const setupCheck = require("./app/middleware/setup-check")(db);

	// begin app stuff
	const app = express();

	// disable any caching when NOT in production (i.e. development)
	if (process.env.NODE_ENV !== "production") {
		app.use((req, res, next) => {
			res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
			next();
		});
	}

	app.use(require("helmet")()); // helmet security headers (good to have here)

	// general app config
	app.set("trust proxy", "127.0.0.1"); // trust Nginx reverse proxy
	app.disable("x-powered-by"); // hide Express headers

	// init sessions
	app.use(session({
		store: new RedisStore({ client: redisClient }),
		secret: process.env.SESSION_SECRET || "development_secret",
		resave: false,
		saveUninitialized: false,
		//                               h    m    s     ms
		expires: new Date(Date.now() + (12 * 60 * 60 * 1000)) // 12 hours session life
	}));

	// passport init
	app.use(passport.initialize());
	app.use(passport.session()); // tie together w/ session

	// just putting in "null" for now :)
	passport.serializeUser((user, done) => {
		done(null, user);
	});

	passport.deserializeUser((userDataFromCookie, done) => {
		done(null, userDataFromCookie);
	});

	// Set up passport strategy
	passport.use(new GoogleStrategy(
		{
			clientID: PRIVATE_CONFIG.googleOAuth.web.client_id,
			clientSecret: PRIVATE_CONFIG.googleOAuth.web.client_secret,
			callbackURL: `${SCHOOP_HOST}/api/auth/google/callback`,
			scope: ["email", "profile"]
		},
		// This is a "verify" function required by all Passport strategies
		(accessToken, refreshToken, profile, cb) => {
			// logger.log("Our user authenticated with Google, and Google sent us back this profile info identifying the authenticated user:", profile);
			logger.log("User authenticated through Google");
			return cb(null, profile);
		}
	));

	// HANDLEBARS VIEW ENGINE SETUP
	app.engine("handlebars", require("express-handlebars")());
	app.set("view engine", "handlebars");
	const VIEW_PATH = (typeof process.env.VIEW_PATH === "undefined") ? "/views" : process.env.VIEW_PATH;
	app.set("views", path.join(__dirname, VIEW_PATH)); // allows for me to change path of views later on

	// STATIC FILES
	app.use(express.static(path.join(__dirname, "/static")));

	// EXTERNAL ROUTES
	app.use("/api", require("./app/routes/api")({ Sentry, passport, logger, db, redisClient }));
	app.use("/s", require("./app/routes/short-link")({
		Sentry,
		db,
		emailAuthKey: PRIVATE_CONFIG.email_auth_secret
	}));

	// default includes (maybe change location of this? idk)
	app.use(async (req, res, next) => {
		let includeDefaults = {
			divisionPeriods,
			divisionOptions,
			appHost: SCHOOP_HOST,
			jsLastRevised: JS_LAST_REVISED,
			isOnBreak: PRIVATE_CONFIG.is_school_break,
			currentYear: new Date().getFullYear() // this may be a performance issue. should
												  // I be caching this value? creating a
												  // whole date object may not be very performant.
		};
		if (typeof req.user !== "undefined" && typeof req.user.id === "string") {
			let studentHasSeenOnboarding = await db.studentHasSeenOnboarding(req.user.id);
			includeDefaults.studentHasSeenOnboarding = Boolean(studentHasSeenOnboarding);
		}
		
		// school alert setup
		includeDefaults.schoolBreakAlert = (PRIVATE_CONFIG.is_school_break) ? JSON.stringify(SCHOOL_BREAK_ALERT) : {};

		req.includeDefaults = includeDefaults;
		next();
	});

	/* BEGIN ROUTES */
	app.get("/", slashAuthCheck);

	app.get("/login", loginAuthCheck, (req, res) => {
		let redirectString = (typeof req.query.redirect === "undefined") ? "" : `?redirect=${encodeURIComponent(req.query.redirect)}`;
		res.status(200).render("login", {
			layout: false,
			redirectString,
			defaults: req.includeDefaults
		});
	});

	// PROTECTED ROUTES
	app.get("/setup", generalAuthCheck, setupCheck, (req, res) => res.status(200).render("setup", {
		layout: false,
		divisionPeriods,
		divisionOptions,
		pageJS: "class-entry",
		defaults: req.includeDefaults
	}));
	app.get("/home", homeAuthCheck, async (req, res) => {
		let studentInfo = await db.getStudentInfo(req.user.id);
		let studentDivision = getDivision(gradYearToGrade(studentInfo.graduation_year)); // MIDDLE or UPPER
		res.status(200).render("home", {
			studentInfo,
			studentGrade: gradYearToGrade(studentInfo.graduation_year), // we NEED THIS!!!
			studentDivision,
			pageJS: "home",
			pageTitle: "Home",
			defaults: req.includeDefaults
		});
	});
	// NOTE: homeAuthCheck works here (it doesn't redirect anywhere if the user has set up)
	app.get("/user", (req, res) => res.redirect("/profile")); // changed location
	app.get("/profile", homeAuthCheck, async (req, res) => {
		let studentInfo = await db.getStudentInfo(req.user.id);
		let studentDivision = getDivision(gradYearToGrade(studentInfo.graduation_year)); // MIDDLE or UPPER
		res.status(200).render("user", {
			studentInfo, // used to render
			studentGrade: gradYearToGrade(studentInfo.graduation_year), // we NEED THIS!!!
			studentWantsDailyEmail: Boolean(studentInfo.wants_daily_email), // wrapped int as boolean
			studentDivision, // either MIDDLE or UPPER
			divisionPeriods, // arrays w/ periods for MIDDLE and UPPER
			divisionOptions, // MIDDLE or UPPER
			pageJS: "user",
			pageTitle: "Profile",
			defaults: req.includeDefaults
		});
	});

	// CATCH-ALL ROUTE (must go at end) 404
	app.all("*", (req, res) => res.status(404).send("Error - Not Found"));
	/* END ROUTES */

	app.listen(PORT, () => logger.log(`Server listening on port ${PORT}`));
});
