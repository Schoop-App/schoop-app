const logger = require("./logger");

module.exports = imports => {
	const Sentry = imports.Sentry;
	const dbConn = util.promisify(imports.dbConn);

	let doesUserExist = async studentId => {
		let query = dbConn.query(`SELECT 1 FROM students WHERE google_oauth_id = ${connection.escape(studentId)}`);
		return query;
	};

	return {
		doesUserExist
	};
};