// REQUIRES
const Handlebars = require("handlebars");
const Hmac = require("../../../app/core/email-auth/hmac");
// END REQUIRES

// CONSTANTS
const SCHOOP_HOST = "https://schoop.app"; // maybe not hardcode...
const SCHOOP_REDIRECT_REF = "email"; // for analytics...

// enums for object mapping (prolly)
const EVENT_SIGNIFIERS = {
	PERIOD: "P",
	ASSEMBLY: "ASSEM",
	BREAK: "BREAK"
};
const NOTHING_DEMARCATOR = "-----";

// This WILL need to be changed for the email. Work on it!!! (I think I have now...?)
// also I unescaped eventName because it is now sanitized and leaving it unescaped
// leads to html entities showing up for users.
const eventRowTemplate = Handlebars.compile(
`<tr style="background-color: {{{eventColor}}};" class="event-{{{eventIsLightOrDark}}}{{#if hasLink}} event-has-link{{/if}}">
	<td class="signifier left">{{{eventSignifier}}}</td>
	<td class="center" style="font-weight: 700;">{{#if hasLink}}<a href="{{{eventZoomLink}}}">{{/if}}{{{eventName}}}{{#if hasLink}}</a>{{/if}}</td>
	<td class="right">{{eventTimespan}}</td>
</tr>`
);

// TIME STRINGS, ET AL
const generateTime = (hour, min, space) => {
	let minuteString = min.toString();
	if (minuteString.length === 1) minuteString = "0" + minuteString;

	if (hour === 0) {
		return `12:${minuteString}${space}AM`;
	} else {
		let amOrPm = (hour >= 12) ? "PM" : "AM";
		let hourAdjusted = (hour > 12) ? hour - 12 : hour;
		return `${hourAdjusted}:${minuteString}${space}${amOrPm}`;
	}
};
const generateTimeFromArr = (arr, space="") => generateTime(arr[0], arr[1], space);
const generateTimeFromDate = (d, space="") => generateTime(d.getHours(), d.getMinutes(), space);
const generateTimespan = (startArr, endArr) => `${generateTimeFromArr(startArr)}-${generateTimeFromArr(endArr)}`;
// SEES WHETHER DATE FITS IN TIME RANGE
const convertHoursAndMinsToMins = (hours, mins) => (hours * 60) + mins;
const convertArrToMins = arr => convertHoursAndMinsToMins(arr[0], arr[1]); // for time arrays
const convertDateToMins = d => convertHoursAndMinsToMins(d.getHours(), d.getMinutes());
const dateFitsInTimeRange = (d, timeArr1, timeArr2) => {
	// This is for seeing what event is current.
	let dateMinutes = convertHoursAndMinsToMins(d.getHours(), d.getMinutes());
	let timeArr1Minutes = convertHoursAndMinsToMins(timeArr1[0], timeArr1[1]);
	let timeArr2Minutes = convertHoursAndMinsToMins(timeArr2[0], timeArr2[1]);

	return (dateMinutes >= timeArr1Minutes && dateMinutes < timeArr2Minutes);
};

// light or dark algorithm from https://awik.io/determine-color-bright-dark-using-javascript/. thank you!
const lightOrDark = color => {

	// Variables for red, green, blue values
	let r, g, b, hsp;

	// Check the format of the color, HEX or RGB?
	if (color.match(/^rgb/)) {

		// If HEX --> store the red, green, blue values in separate variables
		color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

		r = color[1];
		g = color[2];
		b = color[3];
	} else {

		// If RGB --> Convert it to HEX: http://gist.github.com/983661
		color = +("0x" + color.slice(1).replace(
			color.length < 5 && /./g, '$&$&'));

		r = color >> 16;
		g = color >> 8 & 255;
		b = color & 255;
	}

	// HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
	hsp = Math.sqrt(
		0.299 * (r * r) +
		0.587 * (g * g) +
		0.114 * (b * b)
	);

	// Using the HSP value, determine whether the color is light or dark
	if (hsp > 127.5) {
		return 'light';
	} else {
		return 'dark';
	}
};

const getEventSignifier = (event, addPeriod=false) => {
	let signifierToReturn;
	if (typeof event.overrideSignifier === "undefined") {
		// no override
		signifierToReturn = EVENT_SIGNIFIERS[event.type] || NOTHING_DEMARCATOR;
		if (addPeriod && typeof event.number !== "undefined") signifierToReturn += event.number;
	} else {
		// OVERRIDDEN
		signifierToReturn = event.overrideSignifier;
	}
	return signifierToReturn;
};

const buildUserSchedule = (template, classes) => {
	if (typeof template.message === "undefined") {
		// extracts periods from template
		let builtSchedule = [];

		// let periods = template.filter(event => event.type === "PERIOD");
		// for (const period of periods) {
		for (const event of template) {
			if (event.type === "PERIOD") {
				// console.log("It's a period!", event);
				// CLASS
				// let classInfo = classes[event.number - 1];
				let classInfo = classes.find(item => item.period_number === event.number);
				// console.log(classInfo);
				if (classInfo !== null && typeof classInfo === "object") {
					// maybe a more efficient way to do this?
					classInfo.type = event.type;
					classInfo.start = event.start;
					classInfo.end = event.end;
					classInfo.number = event.number || null; // HAD TO DO THIS PART
					if (typeof event.overrideSignifier !== "undefined") classInfo.overrideSignifier = event.overrideSignifier;
					builtSchedule.push(classInfo);
				} else {
					builtSchedule.push(event);
				}
			} else {
				// OTHER EVENT (BREAK, ASSEMBLY, or others maybe)
				builtSchedule.push(event);
			}
		}

		return builtSchedule;
	} else {
		return template; // ALERT! MESSAGE
	}
};

module.exports = imports => {
	const hmac = Hmac({ key: imports.emailAuthKey }); // hmac auth lib built for this email application

	return studentId => {
		const buildScheduleItemHTML = (event, colors, seminarZoomLink, index=0) => {
			let periodNumber,
				eventSignifier,
				eventZoomLink,
				eventZoomLinkRaw,
				eventName,
				eventTimespan,
				eventColor,
				eventIsLightOrDark;

			try {
				eventSignifier = getEventSignifier(event);
				if (event.type === "PERIOD") {
					periodNumber = event.number;
					eventColor = colors[periodNumber - 1];
					eventIsLightOrDark = lightOrDark(eventColor);
					// console.log((periodNumber - 1), eventColor);

					eventSignifier += `<span style="font-size: 0.93em;">${periodNumber}</span>`; // quite hacky, sorry
				} else {
					eventIsLightOrDark = "light";
				}

				let eventIdAdjusted = (event.overrideSignifier === "SEMINAR") ? seminarZoomLink : event.class_id;
				let emailToken = hmac.generateHmacAuth(eventIdAdjusted, studentId);

				// I should probably redo the query string stuff with the qs (querystring) library to make it a bit tidier
				eventZoomLink = (event.overrideSignifier === "SEMINAR") ? `/s/event_redirect?url=${encodeURIComponent(seminarZoomLink)}&token=${emailToken}&userId=${studentId}&ref=${SCHOOP_REDIRECT_REF}` : `/s/${eventIdAdjusted || "empty"}?token=${emailToken}&userId=${studentId}&ref=${SCHOOP_REDIRECT_REF}`;
				eventZoomLink = SCHOOP_HOST + eventZoomLink; // for email purposes hehe (need a domain there!)
				eventZoomLinkRaw = (event.overrideSignifier === "SEMINAR") ? seminarZoomLink : event.zoom_link;
				eventName = event.class_name || event.name || NOTHING_DEMARCATOR;
				eventTimespan = generateTimespan(event.start, event.end);
			} catch (e) {
				// console.error(e);
				// console.log("something went wrong. fine because was already handled");
				// eventSignifier = 
				console.error(e);
			}

			return eventRowTemplate({
				eventSignifier,
				eventName,
				eventTimespan,
				eventZoomLink,
				eventZoomLinkRaw,
				eventColor: eventColor || "transparent",
				eventIsLightOrDark: eventIsLightOrDark || "light",
				hasLink: typeof eventZoomLinkRaw !== "undefined" && eventZoomLinkRaw !== ""
			});
		};

		const buildAllScheduleItemsHTML = (schedule, classColors, seminarZoomLink) => {
			let scheduleHTML = "";
			if (typeof schedule.message === "undefined") {
				// no special messages, so continue as usual
				let event; // performance fix
				for (let i = 0; i < schedule.length; i++) {
					event = schedule[i];
					scheduleHTML += buildScheduleItemHTML(event, classColors, seminarZoomLink, i);
				}
				return scheduleHTML;
			} else {
				// well this wouldn't matter...unless I were sending emails on the weekend,
				// which I am not. I just grafted this code onto my backend app from my
				// frontend JS.

				// HAS MESSAGE! ALERT
				return `<tr><td style="text-align: center; font-size: 1.07em;">${schedule.message}</td></tr>`;
			}
		};

		// Two functions within a function...within another function! I'm really on a roll here.
		return {
			buildUserSchedule,
			buildAllScheduleItemsHTML
		};

	};

};

// module.exports = {
// 	buildUserSchedule,
// 	buildAllScheduleItemsHTML
// };