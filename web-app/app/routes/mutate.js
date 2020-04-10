const express = require("express");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();

const MUTATE_ITEMS = require("../core/mutate-items.json");

module.exports = imports => {
	const Sentry = imports.Sentry;
	const db = imports.db;
	const accessProtectionMiddleware = imports.accessProtectionMiddleware; // PROTECT

	const router = require("express").Router();

	router.post("/:mutateName", accessProtectionMiddleware, jsonParser, async (req, res) => {
		try {
			let mutator = MUTATE_ITEMS.find(k => k.mutate_name === req.params.mutateName);
			if (typeof mutator === "undefined") {
				res.status(400).send({
					status: "error",
					message: "invalid mutator"
				});
			} else {
				await db[mutator.db_method_name](req.user.id, req.body.mutateValue); // executes!
				res.status(200).send({
					status: "ok"
				});
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
