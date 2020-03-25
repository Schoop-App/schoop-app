const fs = require("fs");
const mysql = require("mysql");

const PRIVATE_CONFIG = require("./private-config.json"); // private info

const dbConn = mysql.createConnection({
	host: PRIVATE_CONFIG.database.host,
	user: PRIVATE_CONFIG.database.user,
	password: PRIVATE_CONFIG.database.password,
	database: PRIVATE_CONFIG.database.database,
	port: PRIVATE_CONFIG.database.port,
	ssl: {
		ca: fs.readFileSync(process.env.DATABASE_CERT_PATH || "/home/zanestjohn/ca-certificate.crt")
	}
});

console.log("Connecting to database...");
dbConn.connect(async err => {
	if (err) {
		console.error(err);
	}
	console.log("Connected to database");

	// db client
	const db = require("./app/core/db")({
		Sentry: {
			captureException: e => console.error(e)
		},
		dbConn
	});

	let classQuery = await db.addClass("101538478513395768684", 4, "PreCalc Honors", "https://windwardschool.zoom.us/j/4242891086");
	console.log(classQuery);
});
