"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	getDataFile(filename, encoding = "utf8") {
		return fs.readFileSync(path.join(__dirname, "data", filename), encoding);
	}
};
