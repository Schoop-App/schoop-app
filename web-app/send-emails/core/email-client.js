const fs = require("fs");
const juice = require("juice");
const striptags = require("striptags");
const { minify } = require("html-minifier");

const { getDateString, getScheduleDay } = require("./date-util");
const { getScheduleHtml } = require("./schedule/schedule-html-generate");
const schedules = require("../../app/core/schedules");
const studentCore = require("../../app/core/student-core");

const vendorCss = fs.readFileSync(__dirname + "/../../static/css/vendor.css").toString();
const emailCss = fs.readFileSync(__dirname + "/../../static/css/app-cssnext.css").toString();

module.exports = imports => {
	// imports
	const Sentry = imports.Sentry;
	const mailgunConfig = imports.mailgunConfig;

	// init mailgun client
	const mailgun = require("mailgun-js")({
		apiKey: mailgunConfig.api_key,
		domain: `${mailgunConfig.subdomain_name}.${mailgunConfig.domain_name}`
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
	const sendScheduleEmail = async (db, studentEmail, todaysDate = new Date()) => {
		// let todaysDate = new Date();

		// NEW: get the info straight from the db instead of via arguments
		// REPLACES ARGUMENTS: studentFirstName, studentDivision, studentSeminarZoomLink
		let studentInfo = await db.getStudentInfoByEmail(studentEmail);
		/* ----- */
		let studentFirstName = studentInfo.first_name;
		let studentDivision = studentCore.getDivisionFromGradYear(studentInfo.graduation_year);
		let studentSeminarZoomLink = studentInfo.seminar_zoom_link;

		let template = await schedules.getSchedule(studentDivision, getScheduleDay(todaysDate));
		let classes = await db.getClassesByStudentEmail(studentEmail);
		let scheduleHtml = getScheduleHtml(template, classes, studentSeminarZoomLink);

		let randNum = Math.random(); // for my testing

		/* The Gmail schema I implemented in the HTML below
		 * does not work yet for a couple reasons:
		 *     (1) Gmail has a minimum sending quota for using
		 *     (2) the URL in the quota isn't even yet implemented
		 *         (I honestly haven't done too much analytics
		 *         setup yet)
		 */
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
	    "url": "https://schoop.app/s/general_redirect?url=%2Fhome&ref=email_viewaction",
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
	If you have any questions or concerns, <a href="mailto:schoophelp@gmail.com">please let us know</a>. Have a great day!
</body>
</html>`;
		let htmlJuiced = minify(juice(htmlToSend, {
			extraCss: vendorCss + "\n" + emailCss
		}));
		let plainTextMessage = striptags(htmlToSend); // fallback if no HTML

		// console.log(htmlJuiced);

		let data = {
			from: `Schoop Schedules <noreply-schedules@${mailgunConfig.subdomain_name}.${mailgunConfig.domain_name}>`,
			to: studentEmail,
			subject: `Your schedule for ${getDateString(todaysDate)}`,
			text: plainTextMessage,
			html: htmlJuiced
		};
		
		// any errors are to be caught by the client
		return await sendMailAsync(data);
	};

	return {
		sendMailAsync,
		sendScheduleEmail
	};
};