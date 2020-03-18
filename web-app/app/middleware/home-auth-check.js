module.exports = db => {
	return async (req, res, next) => {
		if (req.isAuthenticated()) {
			// user logged in
			if (await db.studentDidSetup(req.user.id)) {
				res.redirect("/home");
			} else {
				// user must still set up
				res.redirect("/setup");
			}
			next();
		} else {
			res.redirect("/login");
		}
	};
};