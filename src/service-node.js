"use strict";

let utils = require("./utils");

class ServiceNode {

	constructor(options = {}) {
		this.options = options;
		this.id = options.id || utils.generateToken();
		this.name = options.name || this.id;
	}
	
}

module.exports = ServiceNode;