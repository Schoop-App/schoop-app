(window => {
	const setServerSendDivisionGradeAndPeriods = (division, grade, periods) => {
		document.querySelector("#studentDivision").value = division;
		document.querySelector("#studentGrade").value = grade;
		document.querySelector("#studentPeriods").value = JSON.stringify(periods);
	};

	const handleGradeSelectChanged = elem => () => showEntryTableForGrade(parseInt(elem.options[elem.selectedIndex].value), setServerSendDivisionGradeAndPeriods);

	const readyGradeSelectField = elem => {
		let gradeSelectElem = elem || document.querySelector("select#grade-select");
		gradeSelectElem.addEventListener("change", handleGradeSelectChanged(gradeSelectElem), false);
	};

	const onPageReady = () => {
		readyGradeSelectField();
		// showEntryTableForGrade(9); // FOR TESTING
	};

	document.addEventListener("DOMContentLoaded", onPageReady);
})(window);