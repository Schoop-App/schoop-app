const fs = require("fs");
const mysql = require("mysql");
const shortid = require("shortid");

const PRIVATE_CONFIG = require("./private-config.json"); // private info

// const STUDENT_ID = "110473812488285706817";
// const codeToWindwardLink = code => `https://windwardschool.zoom.us/j/${code.replace(/-/g, "")}`;

const dbConn = mysql.createConnection({
	host: PRIVATE_CONFIG.database.host,
	user: PRIVATE_CONFIG.database.user,
	password: PRIVATE_CONFIG.database.password,
	database: PRIVATE_CONFIG.database.database,
	port: PRIVATE_CONFIG.database.port,
	ssl: {
		ca: fs.readFileSync(process.env.DATABASE_CERT_PATH || "/Users/zooza310/ca-certificate.crt")
	}
});

console.log("Connecting to database...");
dbConn.connect(async err => {
	if (err) {
		console.error(err);
	}
	console.log("Connected to database");

	const queryAsync = require("./app/core/mysql-promisified")(dbConn).query;

	let classQuery = await queryAsync("SELECT class_id FROM classes");
	let classList = classQuery.results.map(k => k.class_id);

	let currentClassId;
	for (let i = 0; i < classList.length; i++) {
		currentClassId = classList[i];
		console.log(`Fixing ${currentClassId}...`);
		await queryAsync(`UPDATE classes SET class_id=${dbConn.escape(shortid.generate())} WHERE class_id=${dbConn.escape(currentClassId)}`);
		console.log(`Fixed ${currentClassId}!`);
	}

	dbConn.end();
});
	// // db client with faked Sentry client
	// const db = require("./app/core/db")({
	// 	Sentry: {
	// 		captureException: e => console.error(e)
	// 	},
	// 	dbConn
	// });

	// await db.setStudentWantsDailyEmail("101538478513395768684", 1);

	// dbConn.end();
	// // process.exit(0);
// });

	// // let classQuery = await db.addClass("101538478513395768684", 1, "PreCalc Honors", "https://windwardschool.zoom.us/j/4242891086");
	// // console.log(classQuery);
	// let classes = await db.getClasses(STUDENT_ID);
	// classes = classes.map(k => {
	// 	// classesJson example:
		
	// 		{
	// 			"period": 2
	// 			"name": "AP Euro",
	// 			"zoomLink": "https://windwardschool.zoom.us/j/1234567890"
	// 		}
		
	// 	return {
	// 		period: k.period_number,
	// 		name: k.class_name,
	// 		zoomLink: codeToWindwardLink(k.zoom_link)
	// 	};
	// });

	// await db.updateClasses(STUDENT_ID, classes);
// });