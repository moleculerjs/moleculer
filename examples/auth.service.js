/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const { CustomError } 	= require("../src/errors");

module.exports = {
	name: "auth",
	settings: {
	},
	actions: {
		resolveUser(ctx) {
			switch(ctx.params.apiKey) {
			case "123": return { id: 1, name: "John Doe" };
			case "124": return { id: 2, name: "Jane Doe" };
			}
			return null;
		}
	}
};