const util = require("util");
const logger = require("./logger");
const MysqlPromisified = require("./mysql-promisified");

module.exports = imports => {
	const Sentry = imports.Sentry;
	const dbConn = imports.dbConn;
	const dbConnAsync = MysqlPromisified(dbConn);

	let doesUserExist = async studentId => {
		let query = dbConnAsync.query(`SELECT 1 FROM students WHERE google_oauth_id = ${dbConn.escape(studentId)}`);
		return query;
	};

	return {
		doesUserExist
	};
};
