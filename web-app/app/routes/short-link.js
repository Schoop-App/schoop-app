const express = require("express");

module.exports = imports => {
	const Sentry = imports.Sentry;
	const db = imports.db;

	const router = require("express").Router();

	router.get("/event_redirect", (req, res) => {
		if (req.isAuthenticated()) {
			res.redirect(req.query.url);
		} else {
			res.status(200).send(`Log in to access this page.<br><a href="/login?redirect=${encodeURIComponent(req.originalUrl)}">Click here to log in and access the link.</a>`);
		}
	});

	router.get("/:classId", async (req, res) => {
		if (req.isAuthenticated()) {
			let classLink = await db.getClassLinkForStudent(req.params.classId, req.user.id);
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
