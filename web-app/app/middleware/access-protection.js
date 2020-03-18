module.exports = (req, res, next) => {
	if (req.isAuthenticated()) {
		next();
	} else {
		console.log(req.isAuthenticated(), req.session, req.user);
		res.status(403).send({
			status: "error",
			message: "user not authenticated"
		});
	}
};
