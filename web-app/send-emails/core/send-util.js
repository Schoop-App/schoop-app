const getPercentage = (index, outOf) => (index / outOf * 100).toPrecision(3) + "%";

module.exports = imports => {
	const Sentry = imports.Sentry;
	const emailClient = imports.emailClient;

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
			Sentry.captureException(e);
			// maybe I ought to get rid of this part below
			// since no person would see it except in
			// testing...or maybe not. Decisions, decisions!
			console.log("Error sending emails:");
			console.error(e);
		}
	};
	return {
		sendEmails
	};
};
