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
		async (req, res) => {
			logger.log("user authenticated");
			let studentIsRegistered = await db.doesStudentExist(user.id);

			res.status(200).send({ studentIsRegistered });

			// res.status(200).send(req.user);
		}
	);

	return router;
};
