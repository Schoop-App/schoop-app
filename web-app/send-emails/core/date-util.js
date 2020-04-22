const firstThree = arr => arr.map(k => k.substring(0, 3));

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_ABRIDGED = firstThree(MONTHS);
const DAYS_ABRIDGED = firstThree(DAYS);
const SCHEDULE_DAYS = DAYS_ABRIDGED.map(k => k.toUpperCase());

const getDateString = (date, full = false) => {
	let monthNames = full ? MONTHS : MONTHS_ABRIDGED;
	let dayNames = full ? DAYS : DAYS_ABRIDGED;
	let commaStr = full ? "," : "";

	return `${dayNames[date.getDay()]}${commaStr} ${monthNames[date.getMonth()]} ${date.getDate()}`;
};

const getScheduleDay = date => SCHEDULE_DAYS[date.getDay()];

module.exports = {
	getDateString,
	getScheduleDay
};