/* MAIN FILE */
// FYI: Passport and Google OAuth help from http://gregtrowbridge.com/node-authentication-with-google-oauth-part1-sessions/

// Sentry error reporting init
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://b7ca5bed93fc4dd791eff38ce5db1185@sentry.io/4547846' });

const PRIVATE_CONFIG = require("./private-config.json");

// const RAND = Math.random().toString();
const PORT = process.env.SCHOOP_PORT || 3060;

const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const mysql = require("mysql");
const logger = require("./app/core/logger");

const dbConn = mysql.createConnection({
	host: PRIVATE_CONFIG.database.host,
	user: PRIVATE_CONFIG.database.user,
	password: PRIVATE_CONFIG.database.password,
	database: PRIVATE_CONFIG.database.database,
	ssl: {
		ca: fs.readFileSync(process.env.DATABASECERTPATH)
	}
});

dbConn.connect(async err => {
	if (err) {
		Sentry.captureException(err);
		//throw err;
		logger.error(err);
	}

	const db = require("./app/core/db")({ Sentry, dbConn });

	// begin app stuff
	const app = express();

	app.enable("trust proxy"); // trust Nginx reverse proxy
	app.disable("x-powered-by"); // hide Express headers

	// Set up passport strategy
	passport.use(new GoogleStrategy(  
		{
			clientID: PRIVATE_CONFIG.googleOAuth.web.client_id,
			clientSecret: PRIVATE_CONFIG.googleOAuth.web.client_secret,
			callbackURL: "https://schoop.app/api/auth/google/callback",
			scope: ["email", "profile"]
		},
		// This is a "verify" function required by all Passport strategies
		(accessToken, refreshToken, profile, cb) => {
			// logger.log("Our user authenticated with Google, and Google sent us back this profile info identifying the authenticated user:", profile);
			logger.log("User authenticated through Google");
			return cb(null, profile);
		}
	));

	app.use("/api", require("./app/routes/api")({ Sentry, passport, logger }));

	// app.get("/rand", (req, res) => res.status(200).send(RAND));

	app.get("/test", (req, res) => res.status(200).send(`Look what you found!! Backend is working! Server time ${Date.now()}`));

	app.get("/test_db", async (req, res) => res.status(200).send(await db.doesUserExist("test")));

	app.listen(PORT, () => logger.log(`Server listening on port ${PORT}`));
});
