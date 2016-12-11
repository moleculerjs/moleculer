"use strict";

let TokenGenerator = require("uuid-token-generator");
let tokgen256 = new TokenGenerator(256, TokenGenerator.BASE62);
let tokgen128 = new TokenGenerator(128, TokenGenerator.BASE62);

module.exports = {

	generateToken() {
		return tokgen128.generate(); 
	},

	generateToken256() {
		return tokgen256.generate();
	}
	
};