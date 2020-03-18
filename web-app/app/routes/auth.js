const authCallbackMiddleware = require("../middleware/auth-callback");

/* AUTH ROUTES */
module.exports = imports => {
	const Sentry = imports.Sentry;
	const passport = imports.passport;
	const logger = imports.logger;
	const db = imports.db; // database

	const router = require("express").Router();

	// routes here
	router.get("/google", passport.authenticate("google", { hostedDomain: "windwardschool.org" }));

	router.get("/google/callback",
		passport.authenticate("google", { failureRedirect: "/?failed=1", session: true }),
		authCallbackMiddleware,
		(req, res) => {
			if (student.isNew)
				res.redirect("/setup")
			else
				res.redirect("/home")
		}
	);

	return router;
};
