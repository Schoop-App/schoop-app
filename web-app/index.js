/* MAIN FILE */
// FYI: Passport and Google OAuth help from http://gregtrowbridge.com/node-authentication-with-google-oauth-part1-sessions/

// Sentry error reporting init
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'https://b7ca5bed93fc4dd791eff38ce5db1185@sentry.io/4547846' });

const PRIVATE_CONFIG = require("./private-config.json");

// const RAND = Math.random().toString();
const PORT = process.env.SCHOOPPORT || 3060;

const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const logger = require("./app/core/logger");

const app = express();

app.enable("trust proxy"); // trust Nginx reverse proxy

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
		logger.log("Our user authenticated with Google, and Google sent us back this profile info identifying the authenticated user:", profile);
		return cb(null, profile);
	}
));

app.use("/api", require("./app/routes/api")({ Sentry, passport, logger }));

// app.get("/rand", (req, res) => res.status(200).send(RAND));

app.get("/test", (req, res) => res.status(200).send(`API is working! Server time ${Date.now()}`));

app.listen(PORT, () => logger.log(`Server listening on port ${PORT}`));
