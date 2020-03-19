module.exports = (req, res, next = () => {}) => {
	if (req.isAuthenticated()) {
		res.redirect("/home");
	} else {
		res.redirect("/login");
	}
};
