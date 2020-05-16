module.exports = db => {
	return async (req, res, next) => {
		if (req.isAuthenticated()) {
			// user logged in
			let studentDidSetup = await db.studentDidSetup(req.user.id);
			if (studentDidSetup === 1) {
				// res.redirect("/home");
				next();
			} else if (studentDidSetup === 0) {
				// user must still set up
				res.redirect("/setup");
			} else {
				res.status(500).send("Error: studentDidSetup had unexpected value: " + studentDidSetup);
			}
		} else {
			res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
		}
	};
};
