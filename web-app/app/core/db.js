const util = require("util");
// const uniqid = require("uniqid");
const shortid = require("shortid");
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
		// added bound_for_deletion. this feature was added to protect data from deletion
		let query = await dbConnAsync.query(`SELECT * FROM classes where student_oauth_id = ${dbConn.escape(studentId)} AND bound_for_deletion = 0`);
		return query.results;
	};

	// return class link for...purposes
	const getClassLink = async classId => {
		let query = await dbConnAsync.query(`SELECT zoom_link FROM classes WHERE class_id = ${dbConn.escape(classId)}`);
		return query.results[0].zoom_link;
	};
	const getClassLinkForStudent = async (classId, studentId) => {
		let query = await dbConnAsync.query(`SELECT zoom_link FROM classes WHERE class_id = ${dbConn.escape(classId)} AND student_oauth_id = ${dbConn.escape(studentId)}`);
		return query.results[0].zoom_link;
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
		let classId = shortid.generate(); // unique identifier for class
		let query = await dbInsertQueryGeneric("classes", {
			student_oauth_id: studentId,
			class_id: classId,
			period_number: periodNumber,
			class_name: className,
			zoom_link: zoomLink
		});
		return query;
	};
	const deleteClass = async classId => {
		let deleteClassRecordQuery = `DELETE FROM classes WHERE class_id=${dbConn.escape(classId)}`;
		let query = await dbConnAsync.query(deleteClassRecordQuery);
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
	// sets value for email consent
	const setStudentConsentedToEmail = async (studentId, newState) => await dbUpdateQueryGeneric("students", "did_consent_to_email", "google_oauth_id", studentId, newState);
	// sets value for user wanting daily email (if they do)
	const setStudentWantsDailyEmail = async (studentId, newState) => await dbUpdateQueryGeneric("students", "wants_daily_email", "google_oauth_id", studentId, newState);

	const setSetupState = async (studentId, setupState) => {
		if (setupState === 0 || setupState === 1) {
			let querySql = `UPDATE students SET student_did_setup=${dbConn.escape(setupState)} WHERE google_oauth_id = ${dbConn.escape(studentId)}`;
			let query = await dbConnAsync.query(querySql);
		} else {
			throw new Error(`Invalid setup state provided (given ${setupState}`);
		}
	};

	// ***HELPER*** - mark classes bound for deletion
	const markClassesBoundForDeletion = async studentId => {
		let setBoundForDeletionStateQuery = `UPDATE classes SET bound_for_deletion=1 WHERE student_oauth_id=${dbConn.escape(studentId)}`;
		await dbConnAsync.query(setBoundForDeletionStateQuery); // do this to flag bound_for_deletion ones ASAP
	};
	// ***HELPER*** - delete classes marked bound for deletion
	const deleteClassesBoundForDeletion = async studentId => {
		let deleteClassesQuery = `DELETE FROM classes WHERE student_oauth_id=${dbConn.escape(studentId)} AND bound_for_deletion=1`;
		await dbConnAsync.query(deleteClassesQuery); // deletes all of student's classes
	};
	const updateClasses = async (studentId, classesJson) => {
		await markClassesBoundForDeletion(studentId); // mark all currently existing classes for deletion
		// classesJson example:
		/*
			{
				"period": 2
				"name": "AP Euro",
				"zoomLink": "https://windwardschool.zoom.us/j/1234567890"
			}
		*/
		let currentClassObj;
		for (let i = 0; i < classesJson.length; i++) {
			currentClassObj = classesJson[i];
			if (currentClassObj.name !== "" || currentClassObj.zoomLink !== "") // DeMorgan's Law coming in handy ;)
				await addClass(studentId, currentClassObj.period, currentClassObj.name, currentClassObj.zoomLink);
		}
		await deleteClassesBoundForDeletion(studentId); // now tht new classes are in the DB, delete classes previosuly marked for deletion
	};
	const updateClassesNew = async (studentId, classesJson) => {
		let classesInfoQuerySql = `SELECT class_id, period_number FROM classes WHERE student_oauth_id=${dbConn.escape(studentId)}`;
		let classesInfoQuery = await dbConnAsync.query(classesInfoQuerySql);
		let classesInfo = classesInfoQuery.results;

		let currentClassObj, currentDatabaseArticle, classIsEmpty;
		for (let i = 0; i < classesJson.length; i++) {
			currentClassObj = classesJson[i];
			currentDatabaseArticle = classesInfo.find(k => k.period_number === currentClassObj.period);
			classIsEmpty = currentClassObj.name === "" && currentClassObj.zoomLink === "";
			if (classIsEmpty) {
				// if the database article is not undefined and the class is NOT empty
				if (typeof currentDatabaseArticle !== "undefined")
					await deleteClass(currentDatabaseArticle.class_id);
			} else {
				//typeof currentDatabaseArticle === "undefined" && !
				if (typeof currentDatabaseArticle === "undefined") // there's no class here. so create it
					await addClass(studentId, currentClassObj.period, currentClassObj.name, currentClassObj.zoomLink);
				else // update instead of creating a class
					await dbConnAsync.query(`UPDATE classes SET class_name = ${dbConn.escape(currentClassObj.name)}, zoom_link = ${dbConn.escape(currentClassObj.zoomLink)} WHERE class_id = ${dbConn.escape(currentDatabaseArticle.class_id)}`);
			}
		}
	};
	// BIG ONE: DELETE STUDENT RECORD
	const deleteAccount = async studentId => {
		// STEPS: mark classes for deletion, delete those marked classes, and then delete the student's record in DB
		let studentIdEscaped = dbConn.escape(studentId);

		await markClassesBoundForDeletion(studentId);
		await deleteClassesBoundForDeletion(studentId);

		let deleteStudentRecordQuery = `DELETE FROM students WHERE google_oauth_id=${studentIdEscaped}`;
		await dbConnAsync.query(deleteStudentRecordQuery);
	};

	/* END WRITE DB */

	return {
		doesStudentExist,
		getStudentInfo,
		studentDidSetup,
		getClasses,
		// getClassLink,
		getClassLinkForStudent, // user-specific
		addStudent,
		addClass,
		setSeminarZoomLink,
		setStudentGradYear,
		setStudentConsentedToEmail,
		setStudentWantsDailyEmail,
		setSetupState,
		// updateClasses,
		updateClasses: updateClassesNew, // NEW FUNCTION TO UPDATE. DOES NOT OVERWRITE, SO IDS ARE PRESERVED
		deleteAccount
	};
};
