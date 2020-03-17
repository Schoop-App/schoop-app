module.exports = conn => {
	return {
		query: queryVal => {
			return new Promise((resolve, reject) => {
				conn.query(queryVal, (error, results, fields) => {
					if (error) {
						reject(error);
					} else {
						resolve({ results, fields });
					}
				});
			});
		}
	};
};
