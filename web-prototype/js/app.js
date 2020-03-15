const openZoomLink = elem => {
	let link = elem.getAttribute("data-link");
	let shouldOpenLink = confirm("Open Zoom link?");
	if (shouldOpenLink) window.open(link);
};

// SHOW/HIDE LOADING OVERLAY
const hideLoadingOverlay = () => document.querySelector(".loading-overlay").classList.add("hidden");
const showLoadingOverlay = () => document.querySelector(".loading-overlay").classList.remove("hidden");

(window => {
	// CONTSTANTS //
	const API_HOST = "http://localhost:3000"; // json-server testing

	// enums for object mapping (prolly)
	const EVENT_SIGNIFIERS = {
		PERIOD: "P",
		ASSEMBLY: "ASSEM",
		BREAK: "BREAK"
	};

	// days
	const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	const DAYS_FOR_TODAY_VIEW = DAYS_FULL.map(k => k.substring(0, 3)); // Sun, Mon, Tue, etc.
	const DAYS_FOR_SCHEDULE_TEMPLATE = DAYS_FOR_TODAY_VIEW.map(k => k.toUpperCase()); // SUN, MON, TUE, etc.
	// months
	const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	const MONTHS_FOR_TODAY_VIEW = MONTHS_FULL.map(k => k.substring(0, 3)); // Jan, Feb, Mar, etc.

	const eventRowTemplate = Handlebars.compile(
`<tr style="background-color: {{{eventColor}}};" class="event-{{{eventIsLightOrDark}}}{{#if hasLink}} event-has-link{{/if}}"{{#if hasLink}} data-link="{{{eventZoomLink}}}" onclick="openZoomLink(this);"{{/if}}>
	<td class="signifier left">{{{eventSignifier}}}</td>
	<td class="center" style="font-weight: 700;">{{eventName}}</td>
	<td class="right">{{eventTimespan}}</td>
</tr>`
	);

// 	// eliminated heavy Handlebars dependency (not needed for now)
// 	const eventRowTemplate = config => {
// return `<tr>
// 	<td class="left">${config.eventSignifier}</td>
// 	<td class="center"><a href="${config.eventZoomLink}">${config.eventName}</a></td>
// 	<td class="right">${config.eventTimespan}</td>
// </tr>`;
// 	}

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

	const generateTime = (hour, min, space) => {
		let minuteString = min.toString();
		if (minuteString.length === 1) minuteString = "0" + minuteString;

		if (hour === 0) {
			return `12:${minuteString}${space}AM`
		} else {
			let amOrPm = (hour >= 12) ? "PM" : "AM";
			let hourAdjusted = (hour > 12) ? hour - 12 : hour;
			return `${hourAdjusted}:${minuteString}${space}${amOrPm}`;
		}
	};

	// const generateTimeFromArr = arr => {
	// 	let amOrPm = (arr[0] >= 12) ? "PM" : "AM";
	// 	let hourAdjusted = (arr[0] > 12) ? arr[0] - 12 : arr[0];
	// 	let minuteString = arr[1].toString();
	// 	if (minuteString.length === 1) minuteString = "0" + minuteString;
	// 	return `${hourAdjusted}:${minuteString}${amOrPm}`;
	// };

	const generateTimeFromArr = (arr, space="") => generateTime(arr[0], arr[1], space);
	const generateTimeFromDate = (d, space="") => generateTime(d.getHours(), d.getMinutes(), space);

	const generateTimespan = (startArr, endArr) => `${generateTimeFromArr(startArr)}-${generateTimeFromArr(endArr)}`;

	const getJSON = async (path, overrideHost=false) => {
		if (typeof CANCEL_API_REQS !== "undefined" && CANCEL_API_REQS) {
			return {};
		} else {
			let apiHost = overrideHost ? "" : API_HOST;
			let req = await fetch(apiHost + path);
			let json = await req.json();
			return json;
		}
	};

	const getClassColors = async () => {
		let colors = await getJSON("/class_colors");
		return colors;
	};

	const getQotd = async () => {
		let qotd = await getJSON("/qotd");
		return qotd;
	};

	const getScheduleTemplate = async (division, givenDate) => {
		// let schedule = await getJSON(`/schedule?division=${division}&time=${Date.now()}`);
		let daySymbol = DAYS_FOR_SCHEDULE_TEMPLATE[givenDate.getDay()];
		let schedule = await getJSON(`http://localhost:3001/${division}/${daySymbol}.json`, true);
		return schedule;
	};
	window.getScheduleTemplate = getScheduleTemplate;

	// Okay, does this need to be a method?
	const getClasses = async () => {
		let classes = await getJSON("/classes");
		return classes;
	};

	// builds user schedule from schedule template and classes
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
					let classInfo = classes[event.number - 1];
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

	// {
 //        "name": "PreCalc Honors",
 //        "zoom_link": "https://zoom.us",
 //        "type": "PERIOD",
 //        "start": [
 //            8,
 //            0
 //        ],
 //        "end": [
 //            9,
 //            15
 //        ]
 //    }

 	const getEventSignifier = event => {
 		if (typeof event.overrideSignifier === "undefined") {
			// no override
			return EVENT_SIGNIFIERS[event.type];
		} else {
			// OVERRIDDEN
			return event.overrideSignifier;
		}
 	}

	// const buildScheduleItemHTML = (event, period) => {
	const buildScheduleItemHTML = (event, colors, index=0) => {
		let periodNumber,
			eventSignifier,
			eventZoomLink,
			eventName,
			eventTimespan,
			eventColor,
			eventIsLightOrDark;

		try {
			eventSignifier = getEventSignifier(event);
			if (event.type === "PERIOD") {
				periodNumber = event.number;
				eventColor = colors[periodNumber - 1];
				console.log((periodNumber - 1), eventColor);

				eventSignifier += `<span style="font-size: 0.93em;">${periodNumber}</span>`; // hacky as hell, sorry
			}
			eventZoomLink = event.zoom_link;
			eventName = event.name || "-----";
			eventTimespan = generateTimespan(event.start, event.end);
			eventIsLightOrDark = lightOrDark(event.color);
		} catch (e) {
			// console.error(e);
			console.log("something went wrong. fine because was already handled");
			// eventSignifier = 
		}

		return eventRowTemplate({
			eventSignifier,
			eventName,
			eventTimespan,
			eventZoomLink,
			eventColor: eventColor || "transparent",
			eventIsLightOrDark: eventIsLightOrDark || "light",
			hasLink: typeof eventZoomLink !== "undefined" && eventZoomLink !== ""
		});
	};

	const buildAllScheduleItemsHTML = (schedule, classColors) => {
		let scheduleHTML = "";

		if (typeof schedule.message === "undefined") {
			for (let i = 0; i < schedule.length; i++) {
				const event = schedule[i];
				// scheduleHTML += buildScheduleItemHTML(event, i + 1);
				// scheduleHTML += buildScheduleItemHTML(event, event.number);
				scheduleHTML += buildScheduleItemHTML(event, classColors, i);
			}

			return scheduleHTML;
		} else {
			// HAS MESSAGE! ALERT
			return `<tr><td style="text-align: center; font-size: 1.07em;">${schedule.message}</td></tr>`;
		}
	};

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
	window.dateFitsInTimeRange = dateFitsInTimeRange;

	// const generateMissionControlEventText = event => `${getEventSignifier(event)}${event.number || ""} - ${event.name}`;
	const generateMissionControlEventText = event => event.name;

	// early or late enum
	const EarlyOrLate = {
		EARLY: "early",
		LATE: "late"
	};
	const checkEarlyOrLate = (d, absoluteStartTime, absoluteEndTime) => {
		// if (d.getHours() < absoluteStartTime[0])
		// 	return EarlyOrLate.EARLY;
		// else if (d.getHours() > absoluteEndTime[0])
		// 	return EarlyOrLate.LATE;
		if (convertDateToMins(d) < convertArrToMins(absoluteStartTime))
			return EarlyOrLate.EARLY;
		else if (convertDateToMins(d) > convertArrToMins(absoluteEndTime))
			return EarlyOrLate.LATE;
		else
			throw new Error("Unexpected scenario in populateMissionControlStatus. (No period/event handling)"); // debug
	};

	// WORK ON THIS
	const populateMissionControlStatus = (d, schedule, classColors) => {
		// console.log("SCHEDULE:", JSON.stringify(schedule, null, 2));
		let nowTimeElem = document.querySelector("div.mission-control-status-container.now div.time");
		let nowEventElem = document.querySelector("div.mission-control-status-container.now div.event");
		
		let upNextTimeElem = document.querySelector("div.mission-control-status-container.up-next div.time");
		let upNextEventElem = document.querySelector("div.mission-control-status-container.up-next div.event");

		nowTimeElem.innerText = generateTimeFromDate(d, " ");
		if (typeof schedule.message === "undefined") {
			// no warning
			let absoluteSchoolStartTime = schedule[0].start;
			let absoluteSchoolEndTime = schedule[schedule.length - 1].end;
			if (dateFitsInTimeRange(d, absoluteSchoolStartTime, absoluteSchoolEndTime)) {
				// THERE IS A PERIOD OR EVENT OF SOME SORT NOW

				let missionControlCurrentEvent = schedule.find(k => dateFitsInTimeRange(d, k.start, k.end));
				nowEventElem.innerHTML = generateMissionControlEventText(missionControlCurrentEvent);

				// tries to find up next. if there is no period next then it fails gracefully
				try {
					let upNextEventIndex = schedule.findIndex(k => k === missionControlCurrentEvent) + 1;
					let upNextEvent = schedule[upNextEventIndex];
					console.log("upNextEvent", upNextEvent);

					upNextTimeElem.innerText = generateTimeFromArr(upNextEvent.start, " ");
					upNextEventElem.innerHTML = generateMissionControlEventText(upNextEvent);
				} catch (e) {
					console.error(e);
					console.log("No upcoming event");
				}
			} else {
				// THERE IS ***NOT*** A PERIOD/EVENT NOW
				nowEventElem.innerHTML = "-----";
				switch (checkEarlyOrLate(d, absoluteSchoolStartTime, absoluteSchoolEndTime)) {
					case EarlyOrLate.EARLY:
						let upNextEvent = schedule[0];
						upNextTimeElem.innerText = generateTimeFromArr(upNextEvent.start, " ");
						upNextEventElem.innerHTML = generateMissionControlEventText(upNextEvent);
						break;
					case EarlyOrLate.LATE:
						upNextTimeElem.innerText = "-----";
						upNextEventElem.innerText = "-----";
						break;
					default:
						console.log("UNEXPECTED OUTCOME FOR EARLY OR LATE IN populateMissionControlStatus");
				}
			}
		} else {
			// THERE IS A MESSAGE (means there is no school that day...)
			nowEventElem.innerText = "-----";

			upNextTimeElem.innerText = "-----";
			upNextEventElem.innerText = "-----";
		}
	};

	// On window resize, fix height of Mission Control to new height of today schedule
	const handleWindowResize = () => {
		let winWidth = window.innerWidth;
		let winHeight = window.innerHeight;
		if (winWidth > 949) {
			document.querySelector(".gridded-mission-control").style.height = document.querySelector("table.today-schedule").offsetHeight + "px";
		} else {
			document.querySelector(".gridded-mission-control").style.height = 0.8 * winHeight + "px";
		}
	};

	// const updateCurrentClass = (schedule, d) => {
	// 	// d: DATE
	// 	// schedule: BUILT (COMBINED) SCHEDULE
	// };


	// window.addEventListener("twitterReady", () => console.log("twitter load"));

	const onPageReady = async () => {
		// let twitterHasLoaded = false;
		// let allOtherReqsHaveLoaded = false;
		// showLoadingOverlay();

		// let todaysDate = new Date("Monday March 16 2020 7:59 AM");
		let todaysDate = new Date("Tuesday March 17 2020 10:35 AM");
		// let todaysDate = new Date();
		if (!(typeof CANCEL_API_REQS !== "undefined" && CANCEL_API_REQS)) {
			let template = await getScheduleTemplate("UPPER", todaysDate);
			let classes = await getClasses();
			let userSchedule = buildUserSchedule(template, classes); // built-out schedule

			let classColors = await getClassColors(); // colors for the **periods** in other words
			console.log(classColors);
			let scheduleHtml = buildAllScheduleItemsHTML(userSchedule, classColors);
			document.querySelector("table.today-schedule tbody").innerHTML = scheduleHtml;

			// MISSION CONTROL (Your Schoop)
			populateMissionControlStatus(todaysDate, userSchedule, classColors);

			let qotd = await getQotd();
			document.querySelector(".quote-content span").innerText = qotd.content;
			document.querySelector(".quote-author span").innerText = qotd.author;
		}

		handleWindowResize();
		window.addEventListener("resize", handleWindowResize);

		// title would look something like "Today - Monday"
		document.querySelector(".today-heading").innerHTML = `Today <span style="font-weight: 500;">&ndash; <strong>${DAYS_FULL[todaysDate.getDay()]}</strong>, ${MONTHS_FOR_TODAY_VIEW[todaysDate.getMonth()]} ${todaysDate.getDate()}</span>`;

		setTimeout(hideLoadingOverlay, 150);
	};
	window.renderPage = onPageReady; // for refresh

	document.addEventListener("DOMContentLoaded", onPageReady);
})(window);