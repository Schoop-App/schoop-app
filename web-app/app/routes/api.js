/* API ROUTES */
module.exports = imports => {
	const Sentry = imports.Sentry;
	const passport = imports.passport;
	const logger = imports.logger;

	const router = require("express").Router();

	router.use("/auth", require("./auth")({ Sentry, passport, logger })); // hee hee

	// routes here

	return router;
};