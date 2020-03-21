const axios = require("axios");
const redisClient = require("redis").createClient();
const setAsync = require("util").promisify(redisClient.set).bind(redisClient);

let doGetQotd = async () => {
	try {
		let qotdReq = await axios.get("https://api.quotable.io/random?maxLength=50&tags=inspirational");
		await setAsync("schoop:qotd", JSON.stringify(qotdReq.data));
		process.exit(0);
	} catch (e) {
		console.log("Error getting quote:");
		console.error(e);
	}
};

doGetQotd();

module.exports = doGetQotd;
