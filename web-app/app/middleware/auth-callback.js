const logger = require("../core/logger");

module.exports = db => {
	return async (req, res, next) => {
		let student = req.user;

		logger.log("user authenticated");
		let studentIsRegistered = await db.doesStudentExist(req.user.id);
		if (studentIsRegistered) {
			req.isNewStudent = false;
			next();
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
				req.isNewStudent = true;
				next();
			} else {
				res.status(500).send("We were not able to register you. Please try again.");
			}
		}

		// res.status(200).send(req.user);
	};
};
