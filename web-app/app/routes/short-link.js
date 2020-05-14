const express = require("express");
const Hmac = require("../core/email-auth/hmac");

module.exports = imports => {
	const Sentry = imports.Sentry;
	const db = imports.db;
	const hmac = Hmac({ key: imports.emailAuthKey }); // initialize hmac auth lib

	const router = require("express").Router();

	const authMiddleware = (reqParamName, idParamName) => {
		return (req, res, next) => {
			if (req.isAuthenticated()) {
				// already authenticated via cookie, so no need to check anything else
				console.log("already had auth");
				next();
			} else {
				// no cookie auth
				// reqParamName would be query or params (depends where the id param is stored for the URL)
				if (typeof req.query.token !== "undefined" && typeof req.query.userId !== "undefined" && hmac.verifyHmacAuth(req[reqParamName][idParamName], req.query.userId, req.query.token)) {
					// this is IF there is a token user id info etc. AND that info is valid (ad-hoc auth for emails)
					// by the way, a URL only lasts for the day it was issued. if it's not valid you must sign in to confirm
					// which is fine since this is only used for emails which are received daily anyways.
					// (to clarify I designed the email tokens to only last for a day; it was not just a lazy design choice)
					req.adjustedUserId = req.query.userId;
					next();
				} else {
					res.status(200).send(`Log in to access this page.<br><a href="/login?redirect=${encodeURIComponent(req.originalUrl)}">Click here to log in and access the link.</a>`);
				}
			}
		};
	};

	// BEGIN ROUTING

	router.get("/event_redirect", authMiddleware("query", "url"), (req, res) => res.redirect(req.query.url));

	router.get("/:classId", authMiddleware("params", "classId"), async (req, res) => {
		let classLink = await db.getClassLinkForStudent(req.params.classId, req.adjustedUserId);
		if (typeof classLink === "undefined" || classLink === null)
			res.status(404).send("Error - Not Found");
		else
			res.redirect(classLink);
	});

	// END ROUTING

	return router;
};
