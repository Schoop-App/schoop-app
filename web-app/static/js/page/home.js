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

const SCHOOP_REDIRECT_REF = "dashboard";

(window => {
	// STARTING DATE
	let initialDate = new Date();

	const eventRowTemplate = Handlebars.compile(
`<tr style="background-color: {{{eventColor}}};" class="event-{{{eventIsLightOrDark}}}{{#if hasLink}} event-has-link{{/if}}"{{#if hasLink}} data-link="{{{eventZoomLink}}}" data-link-raw="{{{eventZoomLinkRaw}}}" onclick="openZoomLink(this);"{{/if}} data-event-name="{{{eventName}}}">
	<td class="signifier left">
		<div style="display: flex; align-items: center;">
			{{{eventSignifier}}}
			{{#if calColor}}
			<div style="background-color: {{calColor}}; border-radius: 50%; width: 14px; height: 14px; margin-left: 10px;" onclick="eventInfo(event)" data-event-name="{{{eventName}}}" data-event-id="{{{calId}}}" class="clickable" />
			{{/if}}
		</div>
	</td>
	<td class="center" style="font-weight: 700;">{{eventName}}</td>
	<td class="right">{{eventTimespan}}</td>
</tr>`
	);

	// INIT STATE
	let dateState = {
		currentDate: initialDate,
		// previousDate: new Date(initialDate) // copying it
		lastRefreshedDate: initialDate
	};
	let appState = mobx.observable({
		time: initialDate.getTime()
		// timeLastRefreshed: initialDate.getTime()
	});

	// for dates
	let isMidnightHrsMinsOnly = d => d.getHours() === 0 && d.getMinutes() === 0;

	const getClassColors = async (forceUpdate=false) => {
		if (forceUpdate) {
			let colors = await getJSON("/class_colors?" + Date.now());
			localStorage.setItem("classColors", JSON.stringify(colors));
			return colors;
		} else {
			return JSON.parse(localStorage.getItem("classColors"));
		}
	};

	const getQotd = async (forceUpdate=false) => {
		if (forceUpdate) {
			let qotd = await getJSON("/qotd?" + Date.now());
			localStorage.setItem("qotd", JSON.stringify(qotd));
			return qotd;
		} else {
			return JSON.parse(localStorage.getItem("qotd"));
		}
	};

	// let SCHEDULE_TEMPLATES = [];
	// const getScheduleTemplate = async (division, givenDate, forceUpdate=false) => {
	// 	// let schedule = await getJSON(`/schedule?division=${division}&time=${Date.now()}`);
	// 	let daySymbol = DAYS_FOR_SCHEDULE_TEMPLATE[givenDate.getDay()]; // MON, TUE, WED, etc.
	// 	let scheduleTemplatesKeyName = `${daySymbol}_${division}`;

	// 	if (typeof SCHEDULE_TEMPLATES[scheduleTemplatesKeyName] === "undefined" || forceUpdate) {
	// 		// let schedule = await getJSON(`http://localhost:3001/${division}/${daySymbol}.json`, true);
	// 		let schedule = await getJSON(`/schedule/${division}/${daySymbol}?${Date.now()}`);
	// 		SCHEDULE_TEMPLATES[scheduleTemplatesKeyName] = schedule; // for in-memory cache ;)
	// 		return schedule;
	// 	} else {
	// 		return SCHEDULE_TEMPLATES[scheduleTemplatesKeyName];
	// 	}
	// };

	// Honestly my design for this has been rather silly.
	// But with funky schedules I can't risk anyone having
	// an outdated schedule. Heavens no.
	const getScheduleTemplate = async (division, givenDate, forceUpdate=false) => {
		let daySymbol = DAYS_FOR_SCHEDULE_TEMPLATE[givenDate.getDay()]; // MON, TUE, WED, etc.
		let schedule = await getJSON(`/schedule/${division}/${daySymbol}?${Date.now()}`);
		return schedule;
	};
	window.getScheduleTemplate = getScheduleTemplate;

	const getCalendarEvents = async date => {
    const events = await getJSON(
      `/calendar/myevents/${encodeURIComponent(date.toISOString())}`
    );
    if (!events.length) return null;
    return events;
  };

  const addCalEventsToSchedule = async (events, schedule) => {
    let newSchedule = schedule;

		for (let i = 0; i < events.length; i++) {
			const event = events[i];

      const [start, end] = [event.start, event.end].map(t => {
        const temp = new Date(t);
        return [temp.getHours(), temp.getMinutes()];
      });

      const cal = await getJSON(
        `/calendar/cal/${encodeURIComponent(event.cal)}`
      );

      let newEvent = {
        name: event.name,
        overrideLink: true,
        overrideSignifier: 'CAL',
        type: 'CAL',
        start,
        end,
        color: cal.backgroundColor,
				id: event.id,
      };
      if (event.location) {
        newEvent.link = event.location;
      }

      if (newSchedule.length) {
        let i = newSchedule.findIndex(
          e =>
            e.start[0] > start[0] ||
            (e.start[0] === start[0] && e.start[1] > start[1])
        );
        i = i === -1 ? newSchedule.length : i;
        newSchedule.splice(i, 0, newEvent);
      } else {
        newSchedule = [newEvent];
      }
    };

    return newSchedule;
  };

	// builds user schedule from schedule template and classes
	const buildUserSchedule = (template, classes) => {
		if (typeof template.message === "undefined") {
			// extracts periods from template
			let builtSchedule = [];

			// let periods = template.filter(event => event.type === "PERIOD");
			// for (const period of periods) {
			for (const event of template) {
				// added for overriding links
				if (event.type === "PERIOD") {
					// console.log("It's a period!", event);
					// CLASS
					// let classInfo = classes[event.number - 1];
					let classInfo;
					try {
						classInfo = classes.find(item => item.period_number === event.number);
					} catch (e) {} // I'm doing absolutely nothing here because there haven't been problems w/ the users heh
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
					let augmentedEvent = Object.assign({}, event);
					if (typeof event.overrideLink !== "undefined") augmentedEvent.overrideLink = event.overrideLink;
					if (typeof event.link !== "undefined") augmentedEvent.link = event.link;
					builtSchedule.push(augmentedEvent);
				}
			}

			return builtSchedule;
		} else {
			return template; // ALERT! MESSAGE
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
 	}

	// const buildScheduleItemHTML = (event, period) => {
	const buildScheduleItemHTML = (event, colors, index=0) => {
		let periodNumber,
			eventSignifier,
			eventZoomLink,
			eventZoomLinkRaw,
			eventName,
			eventTimespan,
			eventColor,
			eventIsLightOrDark,
			calColor,
			calId;

		try {
			eventSignifier = getEventSignifier(event);
			if (event.type === "PERIOD") {
				periodNumber = event.number;
				eventColor = colors[periodNumber - 1];
				// console.log((periodNumber - 1), eventColor);

				eventSignifier += `<span style="font-size: 0.93em;">${periodNumber}</span>`; // quite hacky, sorry
			} else if (event.type === 'CAL') {
				eventColor = colors[8]; // This color seems to be unused this year because no one has a ninth period?
				calColor = event.color;
				calId = event.id;
			}

			// links can now be overriden through schedule JSON
			if (event.overrideLink) {
				// SPECIAL handling
				eventZoomLink = event.link;
				eventZoomLinkRaw = event.link;
			} else {
				// regular link handling
				eventZoomLink = (event.overrideSignifier === "SEMINAR") ? `/s/event_redirect?url=${encodeURIComponent(SEMINAR_ZOOM_LINK)}&ref=${SCHOOP_REDIRECT_REF}` : `/s/${event.class_id || "empty"}?ref=${SCHOOP_REDIRECT_REF}`;
				eventZoomLink = SCHOOP_HOST + eventZoomLink;
				eventZoomLinkRaw = (event.overrideSignifier === "SEMINAR") ? SEMINAR_ZOOM_LINK : event.zoom_link;
			}
			eventName = event.class_name || event.name || NOTHING_DEMARCATOR;
			eventTimespan = generateTimespan(event.start, event.end);
			eventIsLightOrDark = lightOrDark(event.color);
		} catch (e) {
			// console.error(e);
			// console.log("something went wrong. fine because was already handled");
			// eventSignifier = 
		}

		return eventRowTemplate({
			eventSignifier,
			eventName,
			eventTimespan,
			eventZoomLink,
			eventZoomLinkRaw,
			eventColor: eventColor || "transparent",
			eventIsLightOrDark: eventIsLightOrDark || "light",
			hasLink: typeof eventZoomLinkRaw !== "undefined" && eventZoomLinkRaw !== "",
			calColor: calColor || false,
			calId: calId || false
		});
	};

	const buildAllScheduleItemsHTML = (schedule, classColors) => {
		let scheduleHTML = "";

		if (typeof schedule.message === "undefined") {
			let event; // performance fix
			for (let i = 0; i < schedule.length; i++) {
				event = schedule[i];
				// scheduleHTML += buildScheduleItemHTML(event, i + 1);
				// scheduleHTML += buildScheduleItemHTML(event, event.number);
				scheduleHTML += buildScheduleItemHTML(event, classColors, i);
			}

			return scheduleHTML;
		} else {
			// HAS MESSAGE! ALERT
			return `<tr><td style="text-align: center; font-size: 1.07em; padding: 15px;">${schedule.message}</td></tr>`;
		}
	};

	// const generateMissionControlEventText = event => `${getEventSignifier(event)}${event.number || ""} - ${event.name}`;
	const generateMissionControlEventText = event => event.class_name || event.name || NOTHING_DEMARCATOR;

	// early or late enum
	const EarlyOrLate = {
		EARLY: "EARLY",
		LATE: "LATE"
	};
	const checkEarlyOrLate = (d, absoluteStartTime, absoluteEndTime) => {
		let mins = convertDateToMins(d); // current
		let startMins = convertArrToMins(absoluteStartTime);
		let endMins = convertArrToMins(absoluteEndTime);
		if (mins < startMins) // early
			return EarlyOrLate.EARLY;
		else if (mins >= endMins) // late
			return EarlyOrLate.LATE;
		else
			throw new Error("Unexpected scenario in populateMissionControlStatus. (No period/event handling)"); // debug
	};

	const getIndexOfEventAfterPassingPeriod = (d, schedule) => {
		let firstEvent;
		let secondEvent;
		let dateMinutes = convertDateToMins(d);
		for (let i = 0; i < schedule.length - 1; i++) {
			firstEvent = schedule[i];
			secondEvent = schedule[i + 1];

			if (convertArrToMins(firstEvent.end) < dateMinutes && convertArrToMins(secondEvent.start) > dateMinutes) {
				return i + 1;
			}
		}
		return -1;
	};

	const populateMissionControlUpNextEvent = (upNextEvent, upNextTimeElem, upNextEventElem, upNextSignifierElem) => {
		upNextTimeElem.innerText = generateTimeFromArr(upNextEvent.start, " ");
		upNextEventElem.innerText = generateMissionControlEventText(upNextEvent);
		upNextSignifierElem.innerText = getEventSignifier(upNextEvent, true);
	}

	// WORK ON THIS
	const populateMissionControlStatus = (d, schedule) => {
		// console.log("SCHEDULE:", JSON.stringify(schedule, null, 2));
		let nowSignifierElem = document.querySelector("div.mission-control-status-container.now .event-signifier");
		let nowTimeElem = document.querySelector("div.mission-control-status-container.now div.time");
		let nowEventElem = document.querySelector("div.mission-control-status-container.now div.event");
		
		let upNextSignifierElem = document.querySelector("div.mission-control-status-container.up-next .event-signifier");
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
				if (typeof missionControlCurrentEvent === "undefined") {
					let upNextEvent = schedule[getIndexOfEventAfterPassingPeriod(d, schedule)];

					if (upNextEvent.type === "CAL") {
            nowEventElem.innerText = "Nothing";
            nowSignifierElem.innerText = "BREAK";
          } else {
            // Passing Period (not needed for now)
            nowEventElem.innerText = "Passing Period";
            nowSignifierElem.innerText = "PP";
          }

					populateMissionControlUpNextEvent(upNextEvent, upNextTimeElem, upNextEventElem, upNextSignifierElem);
				} else {
					// there's actually an event now
					nowEventElem.innerText = generateMissionControlEventText(missionControlCurrentEvent);
					nowSignifierElem.innerText = getEventSignifier(missionControlCurrentEvent, true);
					try {
						let upNextEventIndex = schedule.findIndex(k => k === missionControlCurrentEvent) + 1;
						let upNextEvent = schedule[upNextEventIndex];
						// console.log("upNextEvent", upNextEvent);

						populateMissionControlUpNextEvent(upNextEvent, upNextTimeElem, upNextEventElem, upNextSignifierElem);
					} catch (e) {
						// console.error(e);
						// console.log("No upcoming event");

						upNextTimeElem.innerText = NOTHING_DEMARCATOR;
						upNextEventElem.innerText = "You're free";
						upNextSignifierElem.innerText = "FREE";
					}
				}
				// tries to find up next. if there is no period next then it fails gracefully
			} else {
				// THERE IS ***NOT*** A PERIOD/EVENT NOW
				nowSignifierElem.innerText = "FREE";
				switch (checkEarlyOrLate(d, absoluteSchoolStartTime, absoluteSchoolEndTime)) {
					case EarlyOrLate.EARLY:
						nowEventElem.innerHTML = `Good morning, ${STUDENT_FIRST_NAME}!`;
						let upNextEvent = schedule[0];
						populateMissionControlUpNextEvent(upNextEvent, upNextTimeElem, upNextEventElem, upNextSignifierElem);
						break;
					case EarlyOrLate.LATE:
						nowEventElem.innerHTML = "School is over";
						upNextTimeElem.innerText = NOTHING_DEMARCATOR;
						upNextEventElem.innerText = "You're free";
						upNextSignifierElem.innerText = "FREE";
						break;
					default:
						console.log("UNEXPECTED OUTCOME FOR EARLY OR LATE IN populateMissionControlStatus");
				}
			}
		} else {
			// THERE IS A MESSAGE (means there is no [normal] school that day...)
			nowEventElem.innerText = NOTHING_DEMARCATOR;
			nowSignifierElem.innerText = NOTHING_DEMARCATOR;

			upNextTimeElem.innerText = NOTHING_DEMARCATOR;
			upNextEventElem.innerText = NOTHING_DEMARCATOR;
			upNextSignifierElem.innerText = NOTHING_DEMARCATOR;
		}
	};

	// const updateCurrentClass = (schedule, d) => {
	// 	// d: DATE
	// 	// schedule: BUILT (COMBINED) SCHEDULE
	// };


	// window.addEventListener("twitterReady", () => console.log("twitter load"));

	// takes dates (i.e. current and last refreshed but for testing could be anything) and checks whether it should refresh all (API requests)
	const handleAutorunRefresh = async date => {
		let shouldRefreshAll = isMidnightHrsMinsOnly(date.currentDate) || new Date().getDate() !== date.lastRefreshedDate.getDate();
		await onPageReady(shouldRefreshAll);
		dateState.lastRefreshedDate = new Date();
	};
	window.handleAutorunRefresh = handleAutorunRefresh;

	const onPageReady = async (shouldRefreshAll=true) => {
		// localStorage.clear();
		// let twitterHasLoaded = false;
		// let allOtherReqsHaveLoaded = false;
		// showLoadingOverlay();

		// let initialDate = new Date("Monday March 16 2020 7:59 AM");
		// let initialDate = new Date("Monday March 16 2020 8:01 AM");
		// let initialDate = new Date("Tuesday March 17 2020 10:35 AM");
		// let initialDate = new Date("Thursday March 19 2020 2:06 PM");
		// initialDate = new Date("Friday March 20 2020 2:06 PM");
		// initialDate = new Date(Date.now() + (24 * 60 * 60 * 1000));
		initialDate = new Date();
		// if (!(typeof CANCEL_API_REQS !== "undefined" && CANCEL_API_REQS)) {
		// if it is okay to do API requests
		let template = await getScheduleTemplate(window.STUDENT_DIVISION || STUDENT_DIVISION, initialDate, shouldRefreshAll);
		let classes = await getClasses(shouldRefreshAll);
		const calEvents = await getCalendarEvents(initialDate);
		let userSchedule = buildUserSchedule(template, classes, shouldRefreshAll); // built-out schedule
		if (calEvents) {
      userSchedule = await addCalEventsToSchedule(calEvents, userSchedule);
    }
		// console.log("USER SCHEDULE (debug): ", JSON.stringify(userSchedule, null, 4));

		let classColors = await getClassColors(shouldRefreshAll); // colors for the **periods** in other words
		// console.log(classColors);
		let scheduleHtml = buildAllScheduleItemsHTML(userSchedule, classColors);
		document.querySelector("table.today-schedule tbody").innerHTML = scheduleHtml;

		// MISSION CONTROL (Your Schoop)
		populateMissionControlStatus(initialDate, userSchedule);

		let qotd = await getQotd(shouldRefreshAll);
		document.querySelector(".quote-content span").innerText = qotd.content;
		document.querySelector(".quote-author span").innerText = qotd.author;
		// }

		// title would look something like "Today - Monday" (NOW: "{{name}}'s {{day}}")
		// document.querySelector(".today-heading").innerHTML = `Today&nbsp;<span style="font-weight: 500;">&ndash;&nbsp;<strong>${DAYS_FULL[initialDate.getDay()]}</strong>,&nbsp;${MONTHS_FOR_TODAY_VIEW[initialDate.getMonth()]} ${initialDate.getDate()}</span>`;
		document.getElementById("daySpan").innerHTML = DAYS_FULL[initialDate.getDay()]; // easier

		setTimeout(hideLoadingOverlay, 150);
	};
	// window.renderPage = onPageReady; // for refresh

	document.addEventListener("DOMContentLoaded", async () => {
		localStorage.clear();
		window.addEventListener("focus", () => handleAutorunRefresh(dateState)); // because silly browsers can't be trusted
		await onPageReady(); // General page init/refresh instructions
		// MOBX STATE STUFF
		mobx.autorun(() => {
			// dateState.previousDate = dateState.currentDate;
			dateState.currentDate = new Date(appState.time);
			if (dateState.currentDate.getSeconds() === 0) {
				// refresh visuals ONLY at the top of the minute
				handleAutorunRefresh(dateState);
			}
		});
		setIntervalAdjusted(() => { appState.time = Date.now(); }, 1000);
	});
})(window);
