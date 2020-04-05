(window => {
	let Division = window.DIVISIONS || DIVISIONS;
	let PERIODS = window.DIVISION_PERIODS || DIVISION_PERIODS;

	let CLASS_ENTRY_TEMPLATE = Handlebars.compile(
`<tr>
	<td class="signifier left">P<span style="font-size: 0.93em;">{{{period}}}</span></td>
	<td class="center" style="font-weight: 700;"><input type="text" placeholder="Period {{{period}}} Name" name="className_P{{{period}}}" /></td>
	<td class="{{#if showNinthSeminar}}center{{else}}right{{/if}}"><input type="text" placeholder="Zoom Link" name="zoomLink_P{{{period}}}" /></td>
	{{#if showNinthSeminar}}<td class="right"><input type="radio" name="athleticsPeriod" value="{{{period}}}" /></td>{{/if}}
</tr>`
	);

	const showEntryTablePeriods = (periods, showNinthSeminar) => {
		let tableBodyElem = document.querySelector("table.class-entry-table tbody");

		let athleticsCol = (showNinthSeminar) ? "<th class=\"center\">Zoom Link</th><th class=\"right\">Athletics?</th>" : "<th class=\"right\">Zoom Link</th>";
		tableBodyElem.innerHTML = "<tr><th class=\"left\">Period</th><th class=\"center\">Class Name</th>" + athleticsCol + "</tr>"; // clears list out!
		// let athleticsCol = (showNinthSeminar) ? "<th class=\"center\">Athletics?</th>" : "";
		// tableBodyElem.innerHTML = "<tr><th class=\"center\">Period</th><th class=\"center\">Class Name</th><th class=\"center\">Zoom Link</th>" + athleticsCol + "</tr>"; // clears list out!
		// let athleticsCol = (showNinthSeminar) ? "<th>Athletics?</th>" : "";
		// tableBodyElem.innerHTML = "<tr><th>Period</th><th>Class Name</th><th>Zoom Link</th>" + athleticsCol + "</tr>"; // clears list out!
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

		document.querySelector(".class-entry-table-outer").classList.remove("hidden");

		if (showNinthSeminar)
			document.querySelector("#freshmenWarning").classList.remove("hidden");
		else
			document.querySelector("#freshmenWarning").classList.add("hidden");
	};

	const setServerSendDivisionGradeAndPeriods = (division, grade, periods) => {
		document.querySelector("#studentDivision").value = division;
		document.querySelector("#studentGrade").value = grade;
		document.querySelector("#studentPeriods").value = JSON.stringify(periods);
	};

	const showEntryTableForGrade = grade => {
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
		showEntryTablePeriods(periods, showNinthSeminar);
		setServerSendDivisionGradeAndPeriods(division, grade, periods);
	};

	const handleGradeSelectChanged = elem => () => showEntryTableForGrade(parseInt(elem.options[elem.selectedIndex].value));

	const onPageReady = () => {
		let gradeSelectElem = document.querySelector("select#grade-select");
		gradeSelectElem.addEventListener("change", handleGradeSelectChanged(gradeSelectElem), false);
		// showEntryTableForGrade(9); // FOR TESTING
	};

	document.addEventListener("DOMContentLoaded", onPageReady);
})(window);