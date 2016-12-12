"use strict";

/*let TokenGenerator = require("uuid-token-generator");
let tokgen256 = new TokenGenerator(256, TokenGenerator.BASE62);
let tokgen128 = new TokenGenerator(128, TokenGenerator.BASE62);
*/
const uuidV4 = require("uuid/v4");

module.exports = {

	generateToken() {
		// return tokgen128.generate();
		return uuidV4();
	}
/*
	generateToken256() {
		//return tokgen256.generate();
		return uuidV4();
		// return "1"; 
	}
	*/
};