const { Division } = require("./student-core");
const readFileAsync = require("fs").promises.readFile;

const PUBLIC_CONFIG = require("../../public-config");

const SCHEDULE_TEMPLATE_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const getSchedule = async (division, day) => {
	// make sure the getSchedule call is valid
	if ((division !== Division.MIDDLE && division !== Division.UPPER) || !SCHEDULE_TEMPLATE_DAYS.includes(day))
		throw new Error("Invalid Request – malformed schedule template query");

	// for weekends
	if (day === "SAT" || day === "SUN") {
		return { "message": "You have no classes today. Please check back later." };
	}

	// all other days
	let scheduleFile = await readFileAsync(`${__dirname}/../../../schedules/${PUBLIC_CONFIG.schedule_folder_name || "schedules"}/${division}/${day}.json`);
	return JSON.parse(scheduleFile.toString());
};

module.exports = {
	getSchedule
};