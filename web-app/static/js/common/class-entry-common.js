(window => {
	let Division = window.DIVISIONS || DIVISIONS;
	let PERIODS = window.DIVISION_PERIODS || DIVISION_PERIODS;

	let CLASS_ENTRY_TEMPLATE = Handlebars.compile(
`<tr>
<td class="signifier left">P<span style="font-size: 0.93em;">{{{period}}}</span></td>
<td class="center" style="font-weight: 700;"><input data-period="{{{period}}}" type="text" placeholder="Period {{{period}}} Name" name="className_P{{{period}}}" class="class-entry-class-name"/></td>
<td class="{{#if showNinthSeminar}}center{{else}}right{{/if}}"><input data-period="{{{period}}}" type="text" placeholder="Zoom Link or Code" name="zoomLink_P{{{period}}}" class="class-entry-class-zoom-link" onblur="checkZoomLinkOrCodeValidity(this);" /></td>
{{#if showNinthSeminar}}<td class="right"><input data-period="{{{period}}}" type="radio" name="athleticsPeriod" value="{{{period}}}" /></td>{{/if}}
</tr>`
	);

	/* HELPERS */
	const deSlashify = text => text.replace(/-/g, "");
	// regex from https://stackoverflow.com/a/3809435/7010492
	const isValidUrl = url => /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(url);
	const isWholeNumber = num => Math.floor(num) === num;
	// maybe revamp with regex when there's time (IF there's time)
	const isValidZoomCode = code => {
		if (typeof code === "number") code = code.toString();
		try {
			let zoomCodeDeSlashed = deSlashify(code); // gets rid of all slashes
			let parsedCode = parseFloat(zoomCodeDeSlashed);
			// between 9 and 11 digits, depending on meeting type (right?)
			return isWholeNumber(parsedCode) && (zoomCodeDeSlashed.length >= 9 && zoomCodeDeSlashed.length <= 11);
		} catch (e) {
			return false;
		}
	};
	const convertZoomCodeToUrl = code => `https://windwardschool.zoom.us/j/${deSlashify(code)}`;
	/* END HELPERS */

	const checkZoomLinkOrCodeValidity = inputElem => {
		let code = inputElem.value;
		if (code === "") {
			inputElem.classList.remove("invalid-input-entered");
		} else {
			if (isValidUrl(code)) {
				inputElem.classList.remove("invalid-input-entered");
			} else {
				// if the input supplied is not a URL
				if (isValidZoomCode(code)) {
					// if it IS a valid zoom code, however, convert it to a URL.
					inputElem.classList.remove("invalid-input-entered");
					inputElem.value = convertZoomCodeToUrl(code);
				} else {
					// not a valid zoom code even. let's tell the user:
					inputElem.classList.add("invalid-input-entered");
				}
			}
		}
	};
	window.checkZoomLinkOrCodeValidity = checkZoomLinkOrCodeValidity;

	const showEntryTablePeriods = (periods, showNinthSeminar, overrideSetupExtras, cb) => {
		let tableBodyElem = document.querySelector("table.class-entry-table tbody");

		let athleticsCol = (showNinthSeminar) ? "<th class=\"center\">Link or Code</th><th class=\"right\">Athletics?</th>" : "<th class=\"right\">Zoom Link</th>";
		tableBodyElem.innerHTML = "<tr><th class=\"left\">Period</th><th class=\"center\">Class Name</th>" + athleticsCol + "</tr>"; // clears list out!

		let period;
		for (let i = 0; i < periods.length; i++) {
			period = periods[i];
			tableBodyElem.innerHTML += CLASS_ENTRY_TEMPLATE({ period, showNinthSeminar });
		}
		tableBodyElem.innerHTML += Handlebars.compile(
`<tr>
<td class="signifier left">SEMINAR</td>
<td class="center" style="font-weight: 700;"><input type="text" value="Seminar" name="className_SEMINAR" disabled /></td>
<td class="{{#if showNinthSeminar}}center{{else}}right{{/if}}"><input type="text" placeholder="Zoom Link or Code" name="zoomLink_SEMINAR" onblur="checkZoomLinkOrCodeValidity(this);" /></td>
{{#if showNinthSeminar}}<td class="right">&nbsp;</td>{{/if}}
</tr>`
		)({ showNinthSeminar });

		if (!overrideSetupExtras) {
			document.querySelector(".class-entry-table-outer").classList.remove("hidden");
			if (showNinthSeminar)
				document.querySelector("#freshmenWarning").classList.remove("hidden");
			else
				document.querySelector("#freshmenWarning").classList.add("hidden");
		}

		cb();
	};

	const showEntryTableForGrade = (grade, cb=function(a, b, c){}, overrideSetupExtras=false) => {
		let division;
		let showNinthSeminar = false;
		if (grade === 9)
			showNinthSeminar = true;
		switch (grade) {
			case 7:
			case 8:
				division = Division.MIDDLE;
				break;
			case 9:
			case 10:
			case 11:
			case 12:
				division = Division.UPPER;
				break;
		}

		let periods = PERIODS[division];
		showEntryTablePeriods(periods, showNinthSeminar, overrideSetupExtras, function () { cb(division, grade, periods); });
	};

	window.showEntryTableForGrade = showEntryTableForGrade;
})(window);