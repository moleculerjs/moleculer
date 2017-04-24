/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

module.exports = {
	//Memory: require("./memory"),  - slower
	Memory: require("./memory-map"),
	Redis: require("./redis")
};