const Sentry = require('@sentry/node');
const mysql = require("mysql");
const fs = require("fs");
const SendUtil = require("./core/send-util");

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
	timezone: 'utc',
	ssl: {
		ca: fs.readFileSync(process.env.DATABASE_CERT_PATH || process.argv[2] || "/Users/zooza310/ca-certificate.crt")
	}
});

// begin actual "meat" of the program

// console debug to show if school
console.log(`IS SCHOOL IN SESSION (NO BREAK): ${({"true":"YES","false":"NO"})[!PRIVATE_CONFIG.is_school_break]} (${!PRIVATE_CONFIG.is_school_break})`);

let date = new Date();
if (date.getDay() !== 6 && date.getDay() !== 0 && !PRIVATE_CONFIG.is_school_break) {
	// this is just a fail-safe. the cron job knows to send monday thru friday only
	console.log("Connecting...");
	dbConn.connect(async err => {
		const db = require("../app/core/db")({ Sentry, dbConn });
		const { sendEmails } = SendUtil({ Sentry, emailClient });
		console.log("Connected to database. Start sending student emails");

		let studentIds = await db.getStudentIdsWhoWantDailyEmail(); // retrieve student ids

		await sendEmails(db, studentIds); // send emails to retrieved student ids

		console.log("Done!"); // it's over

		// I know this has nothing to do with emails but I want to clear unused calendar events every day
		// so I'm adding this on to the existing cron job
		console.log("Deleting yesterday's events");
		date.setHours(0, 0, 0, 0);
		await db.deleteCalendarEventsBeforeDay(date);
		console.log("Done!");

		dbConn.end(); // close connection when done
	});
} else {
	// just in case
	console.log("Email not sent (reason: no school right now)");
}
