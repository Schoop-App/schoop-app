const express = require("express");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

const MUTATE_ITEMS = require("../core/mutate-items.json");

module.exports = imports => {
	const Sentry = imports.Sentry;
	const db = imports.db;
	const accessProtectionMiddleware = imports.accessProtectionMiddleware; // PROTECT

	const router = require("express").Router();

	router.use(accessProtectionMiddleware); // all routes would need this

	router.post("/:mutateName", jsonParser, async (req, res) => {
		try {
			let mutator = MUTATE_ITEMS.find(k => k.mutate_name === req.params.mutateName);
			if (typeof mutator === "undefined") {
				res.status(400).send({
					status: "error",
					message: "invalid mutator"
				});
			} else {
				if (req.body.mutateValue === 0 || req.body.mutateValue === 1) {
					await db[mutator.db_method_name](req.user.id, req.body.mutateValue); // executes!
					res.status(200).send({
						status: "ok"
					});
				} else {
					res.status(400).send({
						status: "error",
						message: "invalid mutation value (must be 0 or 1)"
					});
				}
			}
		} catch (e) {
			res.status(500).send({
				status: "error",
				message: e.toString()
			});
		}
	});

	return router;
};
