(window => {
	// USER STUFF:
	const getClassTableElement = (type, period) => {
		let prefix = (period === "SEMINAR") ? "" : "P";
		return document.getElementsByName(`${type}_${prefix}${period}`)[0] || null;
	};
	const updateClasses = async () => {
		let periods = DIVISION_PERIODS[STUDENT_DIVISION];
		let currentPeriod, classNameElement, classLinkElement;
		let updatedClassesJson = [];
		for (let i = 0; i < periods.length; i++) {
			currentPeriod = periods[i];

			classNameElement = getClassTableElement("className", currentPeriod);
			classLinkElement = getClassTableElement("zoomLink", currentPeriod);
			// EXAMPLE:
			/*
				{
					"period": 2
					"name": "AP Euro",
					"zoomLink": "https://windwardschool.zoom.us/j/1234567890"
				}
			*/
			updatedClassesJson.push({
				period: currentPeriod,
				name: classNameElement.value,
				zoomLink: classLinkElement.value
			});
		}
		let updateClassesRes = await postJSON("/update_classes", { classes: updatedClassesJson }); // send it off to server
	};
	// ooh, object mapping! fun!!
	let ACCOUNT_DELETION_STATUS_OPTIONS = message => { // FOR deleteAccount FUNCTION
		return {
			ok: () => { window.location.href = "/login?deleted_account=1" },
			error: () => { alert("There was an error deleting your account:\n" + message); }
		};
	};
	const deleteAccount = async () => {
		if (confirm("*** WARNING ***\n\nAre you sure you want to delete your account? This action cannot be undone. All of your data stored on our servers will be deleted.")) {
			let userEmailPrompt = prompt("To confirm that you wish to delete your account, please type your email in below:");
			if (userEmailPrompt !== "" && userEmailPrompt !== null) {
				// if the user typed something in
				try {
					showLoadingOverlay();
					let deleteAccountRes = await postJSON("/delete_account", { email: userEmailPrompt });
					hideLoadingOverlay();
					ACCOUNT_DELETION_STATUS_OPTIONS(deleteAccountRes.message || null)[deleteAccountRes.status](); // object mapping tingzzz
				} catch (e) {
					// alert(e.toString());
					hideLoadingOverlay();
					alert("We are not able to delete your account data at the moment. Please try again later.\n\nFOR URGENT REQUESTS, please email zstjohn22@windwardschool.org");
				}
			}
		}
	};
	// END THIS USER STUFF

	const setClassTableElementValue = (element, valueToInsert) => {
		if (element !== null)
			element.value = valueToInsert || "";
	};

	const populateClassesTable = (classes, seminarLink) => {
		let currentClass, classNameElement, classLinkElement;
		for (let i = 0; i < classes.length; i++) {
			currentClass = classes[i];

			classNameElement = getClassTableElement("className", currentClass.period_number);
			classLinkElement = getClassTableElement("zoomLink", currentClass.period_number);

			setClassTableElementValue(classNameElement, currentClass.class_name);
			setClassTableElementValue(classLinkElement, currentClass.zoom_link);
		}
		classLinkElement = getClassTableElement("className", "SEMINAR");
		setClassTableElementValue(classLinkElement, SEMINAR_ZOOM_LINK);
	};

	const handleMutator = async event => {
		let mutateName = event.target.getAttribute("data-mutates");
		let mutateValue = Number(event.target.checked);

		await postJSON(`/mutate/${mutateName}`, { mutateValue });
	};

	const onPageReady = async () => {
		document.querySelector("#update-classes").addEventListener("click", async () => {
			try {
				showLoadingOverlay();
				await updateClasses();
				window.location.reload();
			} catch (e) {
				alert("Error updating classes:\n\n" + e.toString());
			}
		});
		document.querySelector(".btn.delete-btn").addEventListener("click", deleteAccount);

		let mutatorElems = document.querySelectorAll(".user-settings-mutator");
		let mutatorElem;
		for (let i = 0; i < mutatorElems.length; i++) {
			mutatorElem = mutatorElems[i];
			mutatorElem.addEventListener("change", handleMutator);
		}

		showEntryTableForGrade(STUDENT_GRADE, async (a, b, c) => {
			let userClasses = await getClasses();
			populateClassesTable(userClasses, SEMINAR_ZOOM_LINK);
			hideLoadingOverlay();
		}, true); // NO LONGER empty function (maybe find a better way to express this)
	};

	document.addEventListener("DOMContentLoaded", onPageReady);
})(window);