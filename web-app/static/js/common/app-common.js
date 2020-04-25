// CONTSTANTS //
// const API_HOST = "https://schoop.app/api";
const NOTHING_DEMARCATOR = "-----"; // when there is NOTHING for an event or time

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

// FUNCTIONS
const openZoomLink = elem => {
	let eventLink = elem.getAttribute("data-link");
	let eventLinkRaw = elem.getAttribute("data-link-raw");
	let eventName = elem.getAttribute("data-event-name");
	if (confirm("Open Zoom link for " + eventName + "?\n(" + eventLinkRaw + ")")) window.open(eventLink);
};

// SHOW/HIDE LOADING OVERLAY
const hideLoadingOverlay = () => {
	document.querySelector("main.content").classList.add("page-loaded");
	document.querySelector(".loading-overlay").classList.add("hidden");
};
const showLoadingOverlay = () => {
	document.querySelector("main.content").classList.remove("page-loaded");
	document.querySelector(".loading-overlay").classList.remove("hidden");
};

// As the hours grow my dignity shrinks. Thanks, https://stackoverflow.com/a/8174116/7010492
const setIntervalAdjusted = (fnct, time) => {
	let start;
	let nextAt;

	let f = () => {
		if (!start) {
			start = new Date().getTime();
			nextAt = start;
		}
		nextAt += time;

		let drift = (new Date().getTime() - start) % time;    
		fnct();

		setTimeout(f, nextAt - new Date().getTime());
	};

	f();
};

// thanks to https://stackoverflow.com/a/28633515
const getScrollTop = () => window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

const handleScroll = () => {
	let classAction = getScrollTop() > 5 ? "add" : "remove"
	document.querySelector("nav.navbar").classList[classAction]("scrolled");
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


// USER LOGOUT
const logOutUser = async () => {
	let logoutReq = await fetch(API_HOST + "/auth/logout", { method: "POST" });
	let logoutJson = await logoutReq.json();
	if (logoutJson.status === "ok") {
		window.location.href = "/";
	} else {
		if (logoutJson.status === "error" && typeof logoutJson.message !== "undefined") {
			alert("Error logging you out: " + logoutJson.message);
		} else {
			alert("Error logging you out. Please reach out to Zane (zstjohn22@windwardschool.org) if you need any help.");
		}
	}
};

// highlights the active page link if it exists
const activateLink = elem => {
	try {
		elem.parentElement.classList.add("link-active");
	} catch (e) {
		// console.log("link not present in top bar");
	}
};
const selectActivePageLink = () => {
	let linkUrl = window.location.pathname.replace(/\/$/, "");
	if (linkUrl === "") {
		linkUrl = "/";
	}

	let linkToSelect = Array.from(document.querySelectorAll("div.navbar-nav-btns ul li a")).find(k => k.getAttribute("href") === linkUrl);

	activateLink(linkToSelect);
};

// GETTER METHODS
// Okay, does this need to be a method?
const getClasses = async () => {
	let classes = await getJSON("/classes");
	return classes;
};

(window => {
	let SHOWING_COMMUNICATION_ERROR_DIALOG = false;
	let userChoice;

	const showCommunicationErrorDialog = async (title, message) => {
		if (!SHOWING_COMMUNICATION_ERROR_DIALOG) {
			SHOWING_COMMUNICATION_ERROR_DIALOG = true;
			userChoice = await Swal.fire({
				title: "Error - " + title,
				text: message,
				icon: "error",
				confirmButtonText: 'Reload Page',
				cancelButtonText: 'Close',
				showCancelButton: true,
				reverseButtons: true
			});
			SHOWING_COMMUNICATION_ERROR_DIALOG = false;
			if (userChoice.value) window.location.reload();
		}
	};
	const hideCommunicationErrorDialog = () => {
		try { userChoice.close(); } catch (e) {console.error(e);}
		if (!SHOWING_COMMUNICATION_ERROR_DIALOG) SHOWING_COMMUNICATION_ERROR_DIALOG = false;
	};

	const showLostCommunicationDialog = async (extraBlurb = "") => await showCommunicationErrorDialog("Lost Communication", "Schoop lost communication with the server. " + extraBlurb);

	const getJSON = async (path, overrideHost=false, validateReqs=true) => {
		try {
			let apiHost = (overrideHost === false) ? API_HOST : "";
			// console.log("apiHost: " + apiHost);
			// console.log("path: " + path);
			let req = await fetch(apiHost + path);
			let json = await req.json();
			if (validateReqs && json.status === "error") {
				if (typeof json.status_code !== "undefined" && json.status_code === 502) {
					await showCommunicationErrorDialog("Server Down", json.message);
				} else {
					window.location.href = "/login?expired=1";
				}
			}
			hideCommunicationErrorDialog();
			return json;
		} catch (e) {
			// window.location.href = "/";
			// console.log("ERROR (tell Zane):\n\n" + e.toString());
			await showLostCommunicationDialog("If you would like, you can reload the page to reconnect.");
		}
	};

	const postJSON = async (path, sendBody) => {
		try {
			let req = await fetch((API_HOST || "/api") + path, {
				method: "POST",
				headers: {
					"Accept": "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify(sendBody)
			});
			let res = await req.json();
			hideCommunicationErrorDialog();
			return res;
		} catch (e) {
			// I may need to put something else here. But this will work for now...
			await showLostCommunicationDialog("Close this dialog and try again, or click the button below to reload the page.");
		}
	};

	window.getJSON = getJSON;
	window.postJSON = postJSON;
})(window);

document.addEventListener("DOMContentLoaded", async () => {
	if (typeof handleWindowResize !== "undefined") {
		handleWindowResize(); // handle window resize for vw vh fixes
		window.addEventListener("resize", handleWindowResize);
	}

	handleScroll(); // refresh document scroll feature (navbar shadow)
	document.addEventListener("scroll", handleScroll);

	selectActivePageLink(); // highlight link of current page if it exists

	document.querySelector(".user-btn.btn-logout").addEventListener("click", logOutUser);
});