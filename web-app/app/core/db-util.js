module.exports = conn => {
	return {
		generateValuesList: arr => {
			let arrEscaped = arr.map(k => conn.escape(k));
			return `(${arrEscaped.join(", ")})`;
		};
	};
};