(window => {
	document.addEventListener("DOMContentLoaded", () => {
		if (window.IS_ON_BREAK) {
			// student is on break and will get the message
			Swal.fire(window.SCHOOL_BREAK_ALERT);
		}
	});
})(window);