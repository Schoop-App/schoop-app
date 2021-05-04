module.exports = conn => {
	return {
		generateValuesList: arr => {
			let arrEscaped = arr.map(k => conn.escape(k));
			return `(${arrEscaped.join(", ")})`;
		},
		formatMySqlTimestamp: date => {
			return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
		}
	};
};
