/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const vorpal = require("vorpal")();

/* istanbul ignore next */
const eventHandler = payload => {
	console.log(chalk.magenta("Incoming event!"), payload);
};

/**
 * Start REPL mode
 * 
 * @param {ServiceBroker} broker 
 */
/* istanbul ignore next */
function startREPL(broker) {

	// Register broker.call
	vorpal
		.command("call <actionName> [params]", "Call an action")
		.action((args, done) => {
			console.log(`Call '${args.actionName}' with`, args.params);
			broker.call(args.actionName, JSON.parse(args.params || "{}"))
				.then(res => console.log(res))
				.catch(err => console.error(err.message, err.stack, err.data))
				.finally(done);
		});

	// Register broker.emit
	vorpal
		.command("emit <eventName> [payload]", "Emit an event")
		.action((args, done) => {
			console.log(`Emit '${args.eventName}' with`, args.payload);
			broker.emit(args.eventName, args.payload);
			console.log(chalk.green("Event sent."));
		});

	// Register load service file
	vorpal
		.command("load <servicePath>", "Load a service from file")
		.action((args, done) => {
			let filePath = path.resolve(args.servicePath);
			if (fs.existsSync(filePath)) {
				console.log(chalk.yellow(`Load '${filePath}'...`));
				let service = broker.loadService(filePath);
				if (service)
					console.log(chalk.green("Loaded successfully!"));
			} else {
				console.warn(chalk.red("The service file is not exists!", filePath));
			}
			done();
		});	

	// Register load service folder
	vorpal
		.command("loadFolder <serviceFolder> [fileMask]", "Load all service from folder")
		.action((args, done) => {
			let filePath = path.resolve(args.serviceFolder);
			if (fs.existsSync(filePath)) {
				console.log(chalk.yellow(`Load services from '${filePath}'...`));
				const count = broker.loadServices(filePath, args.fileMask);
				console.log(chalk.green(`Loaded ${count} services!`));
			} else {
				console.warn(chalk.red("The folder is not exists!", filePath));
			}
			done();
		});	

	// Subscribe to event
	vorpal
		.command("subscribe <eventName>", "Subscribe to an event")
		.action((args, done) => {
			broker.on(args.eventName, eventHandler);
			console.log(chalk.green("Subscribed successfully!"));
			done();
		});		

	// Unsubscribe to event
	vorpal
		.command("unsubscribe <eventName>", "Unsubscribe from an event")
		.action((args, done) => {
			broker.off(args.eventName, eventHandler);
			console.log(chalk.green("Unsubscribed successfully!"));
			done();
		});		

	// Start REPL
	vorpal
		.delimiter("mol $")
		.show();

}

module.exports = startREPL;