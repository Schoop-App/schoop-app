const PRIVATE_CONFIG = require("../../../private-config.json");

const ScheduleBuildingCore = require("./schedule-building-core")({ emailAuthKey: PRIVATE_CONFIG.email_auth_secret });

const { CLASS_COLORS } = require("../../../app/core/student-core");

module.exports = studentId => {
	const scheduleBuildingCore = ScheduleBuildingCore(studentId); // initialize schedule building with student id for link building

	const getScheduleHtml = (template, classes, seminarZoomLink) => {
		let schedule = JSON.parse(JSON.stringify(scheduleBuildingCore.buildUserSchedule(template, classes)));
		let scheduleHtml = scheduleBuildingCore.buildAllScheduleItemsHTML(schedule, CLASS_COLORS, seminarZoomLink);
		return `<table class="today-schedule fix-border-radius"><tbody>${scheduleHtml}</tbody></table>`;
	};

	return {
		getScheduleHtml
	};

};