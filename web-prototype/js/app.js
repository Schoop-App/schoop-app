const openZoomLink = elem => {
	let link = elem.getAttribute("data-link");
	let shouldOpenLink = confirm("Open Zoom link?");
	if (shouldOpenLink) window.open(link);
};

(window => {
	// CONTSTANTS //
	const API_HOST = "http://localhost:3000"; // json-server testing

	// enums for object mapping
	const EVENT_SIGNIFIERS = {
		PERIOD: "P",
		ASSEMBLY: "ASSEM",
		BREAK: "BREAK"
	};

	// days
	const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	const DAYS_FOR_SCHEDULE_TEMPLATE = DAYS_FULL.map(k => k.substr(0, 3).toUpperCase()); // SUN, MON, TUE, etc. etc.

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

	const generateTimeFromArr = arr => {
		let amOrPm = (arr[0] >= 12) ? "PM" : "AM";
		let hourAdjusted = (arr[0] > 12) ? arr[0] - 12 : arr[0];
		let minuteString = arr[1].toString();
		if (minuteString.length === 1) minuteString = "0" + minuteString;
		return `${hourAdjusted}:${minuteString}${amOrPm}`;
	};

	const generateTimespan = (startArr, endArr) => `${generateTimeFromArr(startArr)}-${generateTimeFromArr(endArr)}`;

	const getJSON = async (path, overrideHost=false) => {
		let apiHost = overrideHost ? "" : API_HOST;
		let req = await fetch(apiHost + path);
		let json = await req.json();
		return json;
	};

	const getScheduleTemplate = async division => {
		// let schedule = await getJSON(`/schedule?division=${division}&time=${Date.now()}`);
		let schedule = await getJSON("http://localhost:3001/UPPER/FRI.json", true);
		return schedule;
	};

	// Okay, does this need to be a method?
	const getClasses = async () => {
		let classes = await getJSON("/classes");
		return classes;
	};

	// builds user schedule from schedule template and classes
	const buildUserSchedule = (template, classes) => {
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

	// const buildScheduleItemHTML = (event, period) => {
	const buildScheduleItemHTML = (event, index=0) => {
		let periodNumber,
			eventSignifier,
			eventZoomLink,
			eventName,
			eventTimespan,
			eventColor,
			eventIsLightOrDark;

		try {
			eventSignifier = EVENT_SIGNIFIERS[event.type];
			if (event.type === "PERIOD") {
				periodNumber = event.number;
				eventSignifier += `<span style="font-size: 19px;">${periodNumber}</span>`; // hacky as hell, sorry
			}
			eventZoomLink = event.zoom_link;
			eventName = event.name || "-----";
			eventTimespan = generateTimespan(event.start, event.end);
			eventColor = event.color;
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

	const buildAllScheduleItemsHTML = schedule => {
		let scheduleHTML = "";

		for (let i = 0; i < schedule.length; i++) {
			const event = schedule[i];
			// scheduleHTML += buildScheduleItemHTML(event, i + 1);
			// scheduleHTML += buildScheduleItemHTML(event, event.number);
			scheduleHTML += buildScheduleItemHTML(event, i);
		}

		return scheduleHTML;
	};

	const onPageReady = async () => {
		let template = await getScheduleTemplate("UPPER");
		let classes = await getClasses();
		let userSchedule = buildUserSchedule(template, classes); // built-out schedule

		console.log(userSchedule);

		let scheduleHtml = buildAllScheduleItemsHTML(userSchedule);
		document.querySelector("table.today-schedule tbody").innerHTML = scheduleHtml;

		document.querySelector(".gridded-mission-control").style.height = document.querySelector("table.today-schedule").offsetHeight + "px";
	};

	document.addEventListener("DOMContentLoaded", onPageReady);
})(window);