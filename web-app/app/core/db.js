const util = require("util");
const uniqid = require("uniqid");
const logger = require("./logger");
const MysqlPromisified = require("./mysql-promisified");
const DBUtil = require("./db-util");

module.exports = imports => {
	const Sentry = imports.Sentry; // error reporting
	const dbConn = imports.dbConn; // database connection
	const dbConnAsync = MysqlPromisified(dbConn); // client fixed for promises + async/await
	const dbUtil = DBUtil(dbConn); // database util

	/* READ DB */
	const doesStudentExist = async studentId => {
		let query = await dbConnAsync.query(`SELECT 1 FROM students WHERE google_oauth_id = ${dbConn.escape(studentId)}`);
		return query.results.length > 0;
	};
	const getStudentInfo = async studentId => {
		let query = await dbConnAsync.query(`SELECT * FROM students WHERE google_oauth_id = ${dbConn.escape(studentId)}`);
		return query.results[0];
	};
	/* END READ DB */

	/* WRITE DB */
	const dbInsertQueryGeneric = async (table, dbJson) => {
		try {
			let dbInsertIdentifiers = `(${Object.keys(table).join(", ")})`;
			let dbValues = Object.keys(dbJson).map(k => dbJson[k]);

			let querySql = `INSERT INTO students ${dbInsertIdentifiers} VALUES ${dbUtil.generateValuesList(dbValues)}`;
			let query = await dbConnAsync.query(querySql);
			return true;
		} catch (e) {
			Sentry.captureException(e); // for me to see what exactly went wrong
			return false;
		}
	};
	// const dbWriteQueryGeneric = async query => {
	// 	try {
	// 		let query = await dbConnAsync.query(query);
	// 		return true;
	// 	} catch (e) {
	// 		Sentry.captureException(e); // for me to see what exactly went wrong
	// 		return false;
	// 	}
	// };

	// const addStudent = async (studentId, firstName, lastName, email, profilePicUrl) => {
	// 	try {
	// 		let query = dbConnAsync.query(`INSERT INTO students (google_oauth_id, first_name, last_name, email, google_profile_pic_url) VALUES ${dbUtil.generateValuesList([studentId, firstName, lastName, email, profilePicUrl])}`);
	// 		return true;
	// 	} catch (e) {
	// 		Sentry.captureException(e); // for me to see what exactly went wrong
	// 		return false;
	// 	}
	// };

	const addStudent = async (studentId, firstName, lastName, email, profilePicUrl) => {
		let query = await dbInsertQueryGeneric("students", {
			google_oauth_id: studentId,
			first_name: firstName,
			last_name: lastName,
			email: email,
			google_profile_pic_url: profilePicUrl
		});
		return query;
	};

	const addClass = async (studentId, periodNumber, className, zoomLink) => {
		let classId = uniqid(); // unique identifier for class
		let query = await dbInsertQueryGeneric("classes", {
			student_oauth_id: studentId,
			class_id: classId,
			period_number: periodNumber,
			class_name: className,
			zoom_link: zoomLink
		});
		return query;
	};
	/* END WRITE DB */

	return {
		doesStudentExist,
		getStudentInfo,
		addStudent,
		addClass
	};
};
