(async window => {
	const API_HOST = "http://localhost:3000"; // json-server testing

	// enums for object mapping
	const EVENT_SIGNIFIERS = {
		PERIOD: "P",
		ASSEMBLY: "ASM",
		BREAK: "BRK"
	};

	const eventRowTemplate = Handlebars.compile(
`<tr>
	<td class="left">{{eventSignifier}}</td>
	<td class="center">{{eventName}}</td>
	<td class="right">{{eventTimespan}}</td>
</tr>`
	);

	const generateTimeFromArr = arr => {
		let amOrPm = (arr[0] >= 12) ? "PM" : "AM";
		let hourAdjusted = (arr[0] > 12) ? arr[0] - 12 : arr[0];
		let minuteString = arr[1].toString();
		if (minuteString.length === 1) minuteString = "0" + minuteString;
		return `${hourAdjusted}:${minuteString}${amOrPm}`;
	};

	const generateTimespan = (startArr, endArr) => `${generateTimeFromArr(startArr)}-${generateTimeFromArr(endArr)}`;

	const getJSON = async path => {
		let req = await fetch(API_HOST + path);
		let json = await req.json();
		return json;
	};

	const getScheduleTemplate = async division => {
		let schedule = await getJSON(`/schedule?division=${division}`);
		return schedule;
	};

	// Okay, does this need to be a method?
	const getClasses = async () => {
		let classes = await getJSON(`/classes`);
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
				// CLASS
				let classInfo = classes[event.number - 1];

				// maybe a more efficient way to do this?
				classInfo.type = event.type;
				classInfo.start = event.start;
				classInfo.end = event.end;

				builtSchedule.push(classInfo);
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

	const buildScheduleItemHTML = (event, period) => {
		let eventSignifier = EVENT_SIGNIFIERS[event.type];
		let eventName = event.name;
		let eventTimespan = generateTimespan(event.start, event.end);

		if (event.type === "PERIOD") eventSignifier += period;

		return eventRowTemplate({
			eventSignifier,
			eventName,
			eventTimespan
		});
	};

	const buildAllScheduleItemsHTML = schedule => {
		let scheduleHTML = "";

		for (let i = 0; i < schedule.length; i++) {
			const event = schedule[i];
			scheduleHTML += buildScheduleItemHTML(event, i + 1);
		}

		return scheduleHTML;
	};

	let template = await getScheduleTemplate("UPPER");
	let classes = await getClasses();
	let userSchedule = buildUserSchedule(template, classes); // built-out schedule

	// console.log(JSON.stringify(userSchedule, null, 4));
	// console.log(buildScheduleItemHTML(userSchedule[0], 1));
	// console.log(buildAllScheduleItemsHTML(userSchedule));

	let scheduleHtml = buildAllScheduleItemsHTML(userSchedule);
	document.querySelector("table.today-schedule tbody").innerHTML = scheduleHtml;
})(window);