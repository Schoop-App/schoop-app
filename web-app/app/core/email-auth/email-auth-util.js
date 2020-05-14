const generateFormattedTimestamp = date => date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();

module.exports = {
	generateFormattedTimestamp
};