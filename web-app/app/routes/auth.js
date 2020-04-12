const AuthCallback = require("../middleware/auth-callback");

/* AUTH ROUTES */
module.exports = imports => {
	const Sentry = imports.Sentry;
	const passport = imports.passport;
	const logger = imports.logger;
	const db = imports.db; // database

	const router = require("express").Router();

	const authCallbackMiddleware = AuthCallback(db);
	// console.log(authCallbackMiddleware.toString());

	// routes here
	router.get("/google", (req, res, next) => {
		req.session.redirect = req.query.redirect;
		next();
	}, passport.authenticate("google", { hostedDomain: "windwardschool.org" }));

	router.get("/google/callback",
		passport.authenticate("google", { failureRedirect: "/login?failed=1", session: true }),
		authCallbackMiddleware,
		(req, res) => {
			if (req.isNewStudent) {
				res.redirect("/setup");
			} else {
				res.redirect(req.session.redirect || "/home");
			}
		}
	);

	router.post("/logout", (req, res) => {
		// signs user out
		// TODO: async/await this mofo!
		req.session.destroy(err => {
			if (err) {
				res.status(500).send({
					"status": "error",
					"message": "logout failed"
				});
			} else {
				res.status(200).send({
					"status": "ok"
				});
			}
		});
		// res.redirect("/");
	});

	return router;
};
