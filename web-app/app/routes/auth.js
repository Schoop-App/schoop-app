/* AUTH ROUTES */
module.exports = imports => {
	const Sentry = imports.Sentry;
	const passport = imports.passport;
	const logger = imports.logger;

	const router = require("express").Router();

	// routes here
	router.get("/google", passport.authenticate("google"));

	router.get("/google/callback",
		passport.authenticate("google", { failureRedirect: "/?failed=1", session: false, hostedDomain: "windwardschool.org" }),
		(req, res) => {
			logger.log("user authenticated");
			res.status(200).send(req.user);
		}
	);

	return router;
};