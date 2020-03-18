module.exports = async (req, res) => {
	logger.log("user authenticated");
	let studentIsRegistered = await db.doesStudentExist(req.user.id);
	if (studentIsRegistered) {
		req.isNewUser = false;
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
			req.isNewUser = true;
			next();
		} else {
			res.status(500).send("We were not able to register you. Please try again.");
		}
	}

	// res.status(200).send(req.user);
};