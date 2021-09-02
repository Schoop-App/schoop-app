const fs = require("fs");
const juice = require("juice");
const striptags = require("striptags");
const { minify } = require("html-minifier");

const { getDateString, getScheduleDay } = require("./date-util");
const schedules = require("../../app/core/schedules");
const studentCore = require("../../app/core/student-core");

const vendorCss = fs.readFileSync(__dirname + "/../../static/css/vendor.css").toString();
const emailCss = fs.readFileSync(__dirname + "/css/email.css").toString();

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
	const sendScheduleEmail = async (db, studentId, todaysDate = new Date(), isTest = false) => {
		const { getScheduleHtml } = require("./schedule/schedule-html-generate")(studentId); // initialize with student ID

		// let todaysDate = new Date();

		// NEW: get the info straight from the db instead of via arguments
		// REPLACES ARGUMENTS: studentFirstName, studentDivision, studentSeminarZoomLink
		// let studentInfo = await db.getStudentInfoByEmail(studentEmail);

		// student ID is better for this purpose
		let studentInfo = await db.getStudentInfo(studentId);
		let studentEmail = isTest ? "zstjohn22@windwardschool.org" : studentInfo.email;
		/* ----- */
		let studentFirstName = studentInfo.first_name;
		let studentDivision = studentCore.getDivisionFromGradYear(studentInfo.graduation_year);

		let template = await schedules.getSchedule(studentDivision, getScheduleDay(todaysDate));
		let classes = await db.getClassesByStudentEmail(studentInfo.email);
		let scheduleHtml = getScheduleHtml(template, classes, studentInfo.seminar_zoom_link, studentInfo.seminar_name);

		/* The Gmail schema I implemented in the HTML below
		 * does not work yet for a couple reasons:
		 *     (1) Gmail has a minimum sending quota for using
		 *     (2) the URL in the quota isn't even yet implemented
		 *         (I honestly haven't done too much analytics
		 *         setup yet)
		 */
		// TODO: swap out template literal for Handlebars
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
	<center><strong>NOTE: The classes listed in this email are the ones we have on file as of today at 7:30 AM. If you changed your schedule after that time or have not updated your schedule, you may see inaccurate information here. If so, please <a href="https://schoop.app/home" target="_blank">view your schedule in the app</a>.</strong></center>
	<p>Hi ${studentFirstName},</p>
	<p>Here is your schedule for today, ${getDateString(todaysDate, true)}. If you would like to view it in the Schoop app, <a href="https://schoop.app/home" target="_blank">click here</a>.</p><br>
	${scheduleHtml}<br>
	If you'd like to unsubscribe, you can do so by <a href="https://schoop.app/profile">changing your settings on the Profile page</a>. If you have any questions or concerns, <a href="mailto:schoophelp@gmail.com">please let us know</a>. Have a great day!
</body>
</html>`;
		let htmlJuiced = minify(juice(htmlToSend, {
			extraCss: vendorCss + "\n" + emailCss
		}));
		let plainTextMessage = striptags(htmlToSend); // fallback if no HTML

		// console.log(htmlToSend);

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