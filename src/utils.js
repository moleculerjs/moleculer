"use strict";

let TokenGenerator = require("uuid-token-generator");
let tokgen256 = new TokenGenerator(256, TokenGenerator.BASE62);

module.exports = {

	generateToken() {
		return tokgen256.generate();
	}
	
};