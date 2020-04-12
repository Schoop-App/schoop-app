const express = require("express");

module.exports = imports => {
	const Sentry = imports.Sentry;
	const db = imports.db;

	const router = require("express").Router();

	router.get("/:classId", async (req, res) => {
		if (req.isAuthenticated()) {
			let classLink = await db.getClassLink(req.params.classId);
			if (typeof classLink === "undefined" || classLink === null)
				res.status(404).send("Error - Not Found");
			else
				res.redirect(classLink);
		} else {
			res.status(200).send(`Log in to access this page.<br><a href="/login?redirect=${encodeURIComponent(req.originalUrl)}">Click here to log in and access the link.</a>`);
		}
	});

	return router;
};
