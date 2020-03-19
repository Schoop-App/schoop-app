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

dbConn.connect(async err => {
	if (err) {
		Sentry.captureException(err);
		//throw err;
		logger.error(err);
	}

	const db = require("./app/core/db")({ Sentry, dbConn });
	// MIDDLEWARE **** FOR HOME:
	const homeAuthCheck = require("./app/middleware/home-auth-check")(db);
	const setupCheck = require("./app/middleware/setup-check")(db);

	// begin app stuff
	const app = express();

	let RedisStore = require("connect-redis")(session);
	let redisClient = redis.createClient();

	app.use(session({
		store: new RedisStore({ client: redisClient }),
		secret: process.env.SESSION_SECRET || "development_secret",
		resave: false,
		saveUninitialized: false
	}));

	// passport init
	app.use(passport.initialize());
	app.use(passport.session());

	// just putting in "null for now :)"
	passport.serializeUser((user, done) => {
		done(null, user);
	});

	passport.deserializeUser((userDataFromCookie, done) => {
		done(null, userDataFromCookie);
	});

	//passport.serializeUser((user, done) => done(null, user));
	//passport.deserializeUser((userDataFromCookie, done) => done(null, userDataFromCookie));

	app.enable("trust proxy"); // trust Nginx reverse proxy
	app.disable("x-powered-by"); // hide Express headers

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

	app.use("/api", require("./app/routes/api")({ Sentry, passport, logger, db }));

	// app.get("/rand", (req, res) => res.status(200).send(RAND));

	// app.get("/test", (req, res) => res.status(200).send(`Look what you found!! Backend is working! Server time ${Date.now()}`));

	// app.get("/test_db", async (req, res) => res.status(200).send(await db.doesStudentExist("test")));

	// ROUTES
	app.get("/", slashAuthCheck);

	app.get("/login", loginAuthCheck, (req, res) => res.status(200).send(`<a href="/api/auth/google">Log In with Google (WW account)</a>`));

	// PROTECTED ROUTES
	app.get("/setup", generalAuthCheck, setupCheck, (req, res) => res.status(200).send("Set up your account (WIP)"));
	app.get("/home", homeAuthCheck, (req, res) => res.status(200).send("Welcome to homepage!"));

	// CATCH-ALL ROUTE (must go at end) 404
	app.all("*", (req, res) => res.status(404).send("Error - Not Found"));

	app.listen(PORT, () => logger.log(`Server listening on port ${PORT}`));
});
