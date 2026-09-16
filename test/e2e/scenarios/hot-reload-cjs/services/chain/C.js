const describe = require("./B");

module.exports = function tell() {
	return `C wraps: [${describe()}]`;
};
