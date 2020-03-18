module.exports = (req, res, next) => {
	if (req.isAuthenticated()) {
		// user logged in
		next();
	} else {
		res.redirect("/login");
	}
};