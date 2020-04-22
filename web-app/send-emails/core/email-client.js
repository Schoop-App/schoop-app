const fs = require("fs");
const juice = require("juice");
const striptags = require("striptags");
const { minify } = require("html-minifier");

const { getDateString, getScheduleDay } = require("./date-util");
const { getScheduleHtml } = require("./schedule/schedule-html-generate");
const schedules = require("../../app/core/schedules");

const vendorCss = fs.readFileSync(__dirname + "/../../static/css/vendor.css").toString();
const appCss = fs.readFileSync(__dirname + "/../../static/css/app-cssnext.css").toString();

module.exports = imports => {
	// imports
	const Sentry = imports.Sentry;
	const mailgunConfig = imports.mailgunConfig;

	// init mailgun client
	const mailgun = require("mailgun-js")({
		apiKey: mailgunConfig.api_key,
		domain: mailgunConfig.domain_name
	});

	// promisifed mailgun sending
	const sendMailAsync = data => {
		return new Promise((resolve, reject) => {
			mailgun.messages().send(data, (error, body) => {
				if (error) return reject(error);
				resolve(body); // if there is NO error
			});
		});
	};

	// sends email with schedule to user (WORK IN PROGRESS)
	const sendScheduleEmail = async (db, studentFirstName, studentEmail, studentDivision, todaysDate = new Date()) => {
		// let todaysDate = new Date();

		let template = await schedules.getSchedule(studentDivision, getScheduleDay(todaysDate));
		let classes = await db.getClassesByStudentEmail(studentEmail);
		let scheduleHtml = getScheduleHtml(template, classes);

		let randNum = Math.random(); // for my testing

		let htmlToSend =
`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<script type="application/ld+json">
	{
	  "@context": "http://schema.org",
	  "@type": "EmailMessage",
	  "potentialAction": {
	    "@type": "ViewAction",
	    "url": "https://schoop.app/home",
	    "name": "Open schedule in Schoop"
	  },
	  "description": "Open today's schedule in the Schoop app"
	}
	</script>
</head>
<body>
	<p>Hi ${studentFirstName},</p>
	<p>Here is your schedule for today, ${getDateString(todaysDate, true)}. If you would like to view it in the Schoop app, <a href="https://schoop.app/home">click here</a>.</p><br>
	${scheduleHtml}<br>
	If you have any questions or concerns, <a href="mailto:zstjohn22@windwardschool.org">please let us know</a>. Have a great day!
</body>
</html>`;
		let htmlJuiced = minify(juice(htmlToSend, {
			extraCss: vendorCss + "\n" + appCss
		}));
		let plainTextMessage = striptags(htmlToSend);

		// console.log(htmlJuiced);

		let data = {
			from: `Schoop Schedules <noreply-schedules@${mailgunConfig.domain_name}>`,
			to: studentEmail,
			subject: `Your schedule for ${getDateString(todaysDate)}`,
			text: plainTextMessage,
			html: htmlJuiced
		};

		try {
			return await sendMailAsync(data);
		} catch (e) {
			Sentry.captureException(e);
			return false;
		}
	};

	return {
		sendMailAsync,
		sendScheduleEmail
	};
};