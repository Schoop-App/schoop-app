(window => {
	let Division = window.DIVISIONS || DIVISIONS;
	let PERIODS = window.DIVISION_PERIODS || DIVISION_PERIODS;

	let CLASS_ENTRY_TEMPLATE = Handlebars.compile(
`<tr>
<td class="signifier left">P<span style="font-size: 0.93em;">{{{period}}}</span></td>
<td class="center" style="font-weight: 700;"><input data-period="{{{period}}}" type="text" placeholder="Period {{{period}}} Name" name="className_P{{{period}}}" class="class-entry-class-name"/></td>
<td class="{{#if showNinthSeminar}}center{{else}}right{{/if}}"><input data-period="{{{period}}}" type="text" placeholder="Zoom Link" name="zoomLink_P{{{period}}}" class="class-entry-class-zoom-link" /></td>
{{#if showNinthSeminar}}<td class="right"><input data-period="{{{period}}}" type="radio" name="athleticsPeriod" value="{{{period}}}" /></td>{{/if}}
</tr>`
	);

	const showEntryTablePeriods = (periods, showNinthSeminar, overrideSetupExtras, cb) => {
		let tableBodyElem = document.querySelector("table.class-entry-table tbody");

		let athleticsCol = (showNinthSeminar) ? "<th class=\"center\">Zoom Link</th><th class=\"right\">Athletics?</th>" : "<th class=\"right\">Zoom Link</th>";
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
<td class="{{#if showNinthSeminar}}center{{else}}right{{/if}}"><input type="text" placeholder="Zoom Link" name="zoomLink_SEMINAR" /></td>
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