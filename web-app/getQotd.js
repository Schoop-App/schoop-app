const axios = require("axios");
const redisClient = require("redis").createClient();
const logger = require("./app/core/logger");
// const setAsync = require("util").promisify(redisClient.set).bind(redisClient);

let getQotd = async () => {
	try {
		let qotdReq = await axios.get("https://api.quotable.io/random?maxLength=50&tags=inspirational");
		// await setAsync("schoop:qotd", JSON.stringify(qotdReq.data));
		return qotdReq.data;
		// process.exit(0);
	} catch (e) {
		logger.log("Error getting quote:");
		logger.error(e);
		return;
	}
};

// doGetQotd().then(() => process.exit(0));

module.exports = getQotd;
