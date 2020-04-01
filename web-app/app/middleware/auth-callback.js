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
			 try {
				let studentRegistryQuery = await db.addStudent(req.user.id, // google_oauth_id
															 	req.user.name.givenName, // first_name
															 	req.user.name.familyName, // last_name
															 	req.user.emails[0].value, // email
															 	req.user.photos[0].value); // google_profile_pic_url

				req.isNewStudent = true;
				next();

				// if (studentRegistryQuery) {
				// 	// successfully registered
				// 	req.isNewStudent = true;
				// 	next();
				// } else {
				// 	res.status(500).send("We were not able to register you. Please try again.");
				// }
			} catch (e) {
				res.status(500).send(`We were not able to register you. Please try again.<br><br><em>SERVER ERROR: ${e.toString()}</em>`);
			}
		}

		// res.status(200).send(req.user);
	};
};
