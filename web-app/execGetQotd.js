const getQotd = require("./getQotd");
(async () => {
	await getQotd();
	process.exit(0);
});
