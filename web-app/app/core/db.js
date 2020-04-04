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
	const studentDidSetup = async studentId => {
		let query = await dbConnAsync.query(`SELECT student_did_setup FROM students where google_oauth_id = ${dbConn.escape(studentId)}`);
		//console.log(query.results[0].student_did_setup);
		//return Boolean(query.results[0].student_did_setup);
		return query.results[0].student_did_setup;
	};

	const getClasses = async studentId => {
		let query = await dbConnAsync.query(`SELECT * FROM classes where student_oauth_id = ${dbConn.escape(studentId)}`);
		return query.results;
	};
	/* END READ DB */

	/* WRITE DB */
	const dbInsertQueryGeneric = async (table, dbJson) => {
		try {
			let dbInsertIdentifiers = `(${Object.keys(dbJson).join(", ")})`;
			let dbValues = Object.keys(dbJson).map(k => dbJson[k]);

			let querySql = `INSERT INTO ${table} ${dbInsertIdentifiers} VALUES ${dbUtil.generateValuesList(dbValues)}`;
			// logger.log(querySql);
			let query = await dbConnAsync.query(querySql);
			return true;
		} catch (e) {
			// logger.error(e);
			Sentry.captureException(e); // for me to see what exactly went wrong
			throw e;
			// return false;
		}
	};

	const dbUpdateQueryGeneric = async (table, cell, primaryKeyName, primaryKeyValue, updateValue) => {
		// UPDATE table SET cell='new_value' WHERE whatever='somevalue'
		try {
			let querySql = `UPDATE ${table} SET ${cell}=${dbConn.escape(updateValue)} WHERE ${primaryKeyName}=${dbConn.escape(primaryKeyValue)}`;
			let query = await dbConnAsync.query(querySql);
		} catch (e) {
			Sentry.captureException(e);
			throw e;
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

	// const setSeminarZoomLink = async (studentId, zoomLink) => {
	// 	let querySql = `UPDATE students SET seminar_zoom_link=${dbConn.escape(zoomLink)} WHERE google_oauth_id = ${dbConn.escape(studentId)}`;
	// 	let query = await dbConnAsync.query(querySql);
	// };

	// const setStudentGradYear = async (studentId, gradYear) => {
	// 	let querySql = `UPDATE students SET graduation_year=${dbConn.escape(gradYear)} WHERE google_oauth_id = ${dbConn.escape(studentId)}`;
	// 	let query = await dbConnAsync.query(querySql);
	// };

	//                                                                             (table,      cell,                primaryKeyName,   primaryKeyValue, updateValue)
	const setSeminarZoomLink = async (studentId, zoomLink) => await dbUpdateQueryGeneric("students", "seminar_zoom_link", "google_oauth_id", studentId, zoomLink);
	const setStudentGradYear = async (studentId, gradYear) => await dbUpdateQueryGeneric("students", "graduation_year", "google_oauth_id", studentId, gradYear);
	// sets true for email consent
	const setStudentConsentedToEmail = async (studentId, newState) => await dbUpdateQueryGeneric("students", "did_consent_to_email", "google_oauth_id", studentId, newState);
	// sets true for user wanting daily email (if they do)
	const setStudentWantsDailyEmail = async (studentId, newState) => await dbUpdateQueryGeneric("students", "did_consent_to_email", "google_oauth_id", studentId, newState);

	const setSetupState = async (studentId, setupState) => {
		if (setupState === 0 || setupState === 1) {
			let querySql = `UPDATE students SET student_did_setup=${dbConn.escape(setupState)} WHERE google_oauth_id = ${dbConn.escape(studentId)}`;
			let query = await dbConnAsync.query(querySql);
		} else {
			throw new Error(`Invalid setup state provided (given ${setupState}`);
		}
	};

	/* END WRITE DB */

	return {
		doesStudentExist,
		getStudentInfo,
		studentDidSetup,
		getClasses,
		addStudent,
		addClass,
		setSeminarZoomLink,
		setStudentGradYear,
		setStudentConsentedToEmail,
		setSetupState
	};
};
