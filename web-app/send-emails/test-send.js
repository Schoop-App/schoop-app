const Sentry = require('@sentry/node');
const mysql = require("mysql");
const fs = require("fs");
const PRIVATE_CONFIG = require("../private-config.json");
const mailgunConfig = PRIVATE_CONFIG.mailgun;
// error reporting
Sentry.init({ dsn: 'https://5412e7c93c7148678b15f5c6e588f60f@o378464.ingest.sentry.io/5205352' });

const emailClient = require("./core/email-client")({ Sentry, mailgunConfig });

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

dbConn.connect(async err => {
	if (err) throw err;

	const db = require("../app/core/db")({ Sentry, dbConn });

	console.log("Sending schedule emails...");
	await emailClient.sendScheduleEmail(db, "Zane", "zstjohn22@windwardschool.org", "UPPER", new Date("Monday April 20 2020 04:07:35"));
	// await emailClient.sendScheduleEmail(db, "Jude", "jstjohn24@windwardschool.org", "MIDDLE", new Date("Monday April 20 2020 04:07:35"));
	console.log("Emails sent!");

	dbConn.end();
});