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

const getPercentage = (index, outOf) => (index / outOf * 100).toPrecision(3) + "%";

const sendEmails = async (db, studentIds) => {
	try {
		let numStudentIds = studentIds.length;
		let currentStudentId;
		for (let i = 1; i <= numStudentIds; i++) {
			currentStudentId = studentIds[i - 1];
			// sending email message
			console.log(`Sending email ${i} / ${numStudentIds} (${getPercentage(i - 1, numStudentIds)} done) to ${currentStudentId}`);

			// actually sending the email via client
			await emailClient.sendScheduleEmail(db, currentStudentId);

			// email sent messgae
			console.log(`Email sent to ${currentStudentId}\n`);
		}
	} catch (e) {
		console.log("Error sending emails:");
		console.error(e);
	}
};


// begin actual "meat" of the program

let date = new Date();
if (date.getDay() !== 6 && date.getDay() !== 0) {
	// this is just a fail-safe. the cron job knows to send monday thru friday only
	console.log("Connecting...");
	dbConn.connect(async err => {
		const db = require("../app/core/db")({ Sentry, dbConn });
		console.log("Connected to database. Start sending student emails");
		
		// let studentIds = await db.getStudentIdsWhoWantDailyEmail();
		let studentIds = ["101538478513395768684"];

		await sendEmails(db, studentIds); // send emails to retrieved student ids

		console.log("Done!"); // it's over

		dbConn.end(); // close connection when done
	});
} else {
	// just in case
	console.log("Email not sent (reason: it's the weekend!)");
}