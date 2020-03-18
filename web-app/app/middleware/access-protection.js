module.exports = (req, res, next) => {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.status(403).send({
			status: "error",
			message: "user not authenticated"
		});
	}
};