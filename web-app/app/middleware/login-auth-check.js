module.exports = (req, res, next) => {
	if (req.isAuthenticated()) {
		// user already logged in
		res.redirect("/home");
	} else {
		// user must log in
		next();
	}
};