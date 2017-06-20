#!/usr/bin/env node

/* moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

/*
	TODO:
	 	- process args with https://github.com/leo/args
		- load config with https://github.com/egoist/use-config

*/

const Moleculer = require("moleculer");

// Create service broker
let broker = new Moleculer.ServiceBroker({
	logger,
	logLevel: process.env.LOGLEVEL || "info"
});

// Load my services
// broker.loadServices("./server/services");

broker.start().then(() => {

	// if repl


});