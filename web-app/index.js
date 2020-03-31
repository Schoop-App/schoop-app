/* MAIN FILE */
// FYI: Passport and Google OAuth help from http://gregtrowbridge.com/node-authentication-with-google-oauth-part1-sessions/

// Sentry error reporting init
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://b7ca5bed93fc4dd791eff38ce5db1185@sentry.io/4547846' });

const PRIVATE_CONFIG = require("./private-config.json");

// const RAND = Math.random().toString();
const PORT = process.env.SCHOOP_PORT || 3060;

const fs = require("fs");

const express = require("express");
const redis = require("redis");
const session = require("express-session"); // session handling middleware
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mysql = require("mysql");
const logger = require("./app/core/logger");

// STUDENT CORE
const { gradYearToGrade, getDivision } = require("./app/core/student-core");

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
			callbackURL: (process.env.SCHOOP_HOST || "https://schoop.app") + "/api/auth/google/callback",
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

	// STATIC FILES
	app.use(express.static(`${__dirname}/static`));

	// API ROUTES
	app.use("/api", require("./app/routes/api")({ Sentry, passport, logger, db, redisClient }));

	/* BEGIN ROUTES */
	app.get("/", slashAuthCheck);

	app.get("/login", loginAuthCheck, (req, res) => res.status(200).send(`<a href="/api/auth/google">Log In with Google (WW account)</a>`));

	// PROTECTED ROUTES
	app.get("/setup", generalAuthCheck, setupCheck, (req, res) => res.status(200).render("setup", { layout: false }));
	app.get("/home", homeAuthCheck, async (req, res) => {
		let studentInfo = await db.getStudentInfo(req.user.id);
		let studentGrade = gradYearToGrade(studentInfo.graduation_year);
		//logger.log(studentInfo);
		//logger.log(studentInfo.graduation_year);
		//logger.log(studentGrade);
		let studentDivision = getDivision(studentGrade); // MIDDLE or UPPER
		res.status(200).render("home", { studentInfo, studentDivision: studentDivision || "UNKNOWN" });
	});

	app.get("/test_division", (req, res) => {
		res.status(200).send(getDivision(req.query.grade));
	});

	// CATCH-ALL ROUTE (must go at end) 404
	app.all("*", (req, res) => res.status(404).send("Error - Not Found"));
	/* END ROUTES */

	app.listen(PORT, () => logger.log(`Server listening on port ${PORT}`));
});
