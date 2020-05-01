const scheduleBuildingCore = require("./schedule-building-core");

// const PRIVATE_CONFIG = require("../../../private-config.json");

const CLASS_COLORS = [
	"#9CE87B",
	"#89BBEF",
	"#FEF486",
	"#F1D483",
	"#BABABC",
	"#B198E6",
	"#82C2E5",
	"#EE9DC2",
	"#60B2A1"
];

const getScheduleHtml = (template, classes, seminarZoomLink) => {
	let schedule = JSON.parse(JSON.stringify(scheduleBuildingCore.buildUserSchedule(template, classes)));
	let scheduleHtml = scheduleBuildingCore.buildAllScheduleItemsHTML(schedule, CLASS_COLORS, seminarZoomLink);
	// console.log("SCHEDULE HTML: ", scheduleHtml);
	return `<table class="today-schedule fix-border-radius"><tbody>${scheduleHtml}</tbody></table>`;
};

module.exports = {
	getScheduleHtml
};