const accessProtectionMiddleware = require("../middleware/access-protection");

/* API ROUTES */
module.exports = imports => {
	const Sentry = imports.Sentry;
	const passport = imports.passport;
	const logger = imports.logger;
	const db = imports.db; // database

	const router = require("express").Router();

	router.use("/auth", require("./auth")({ Sentry, passport, logger, db })); // hee hee

	// protected endpoint test
	router.get("/test_login", accessProtectionMiddleware, (req, res) => {
		res.status(200).send({
			message: "You are authenticated. Welcome to this protected endpoint!",
			userInfo: req.user
		});
	});

	// routes here

	return router;
};