module.exports = db => {
	return async (req, res, next) => {
		let studentDidSetup = await db.studentDidSetup(req.user.id);
		if (studentDidSetup === 1) {
			res.redirect("/home");
		} else if (studentDidSetup === 0) {
			// user must still set up
			next();
		} else {
			res.status(500).send("Error: studentDidSetup had unexpected value: " + studentDidSetup);
		}
	};
};
