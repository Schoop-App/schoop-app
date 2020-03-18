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
			let studentIsRegistered = await db.doesStudentExist(req.user.id);
			if (studentIsRegistered) {
				res.status(200).send("You are already registered with us.");
			} else {
				// studentId, firstName, lastName, email, profilePicUrl
				 // returns boolean
				let studentRegistryQuery = await db.addStudent(req.user.id,
															 	req.user.name.givenName,
															 	req.user.name.familyName,
															 	req.user.emails[0].value,
															 	req.user.photos[0].value);

				if (studentRegistryQuery) {
					// successfully registered
					res.status(200).send("Successfully registered!");
				} else {
					res.status(500).send("We were not able to register you. Please try again.");
				}
			}

			// res.status(200).send(req.user);
		}
	);

	return router;
};
