/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const chalk = require("chalk");
const ms = require("ms");
const C = require("./constants");
const { table, getBorderCharacters } = require("table");
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
			console.log(chalk.yellow.bold(`>> Call '${args.actionName}' with params:`), args.params);
			broker.call(args.actionName, JSON.parse(args.params || "{}"))
				.then(res => {
					console.log(chalk.yellow.bold(">> Response:"));
					console.log(res);
				})
				.catch(err => {
					console.error(chalk.red.bold(">> ERROR:", err.message));
					console.error(chalk.red.bold(err.stack));
					console.error("Data: ", err.data);
				})
				.finally(done);
		});

	// Register broker.emit
	vorpal
		.command("emit <eventName> [payload]", "Emit an event")
		.action((args, done) => {
			console.log(chalk.yellow.bold(`>> Emit '${args.eventName}' with payload:`), args.payload);
			broker.emit(args.eventName, args.payload);
			done();
		});

	// Register load service file
	vorpal
		.command("load <servicePath>", "Load a service from file")
		.action((args, done) => {
			let filePath = path.resolve(args.servicePath);
			if (fs.existsSync(filePath)) {
				console.log(chalk.yellow(`>> Load '${filePath}'...`));
				let service = broker.loadService(filePath);
				if (service)
					console.log(chalk.green(">> Loaded successfully!"));
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
				console.log(chalk.yellow(`>> Load services from '${filePath}'...`));
				const count = broker.loadServices(filePath, args.fileMask);
				console.log(chalk.green(`>> Loaded ${count} services!`));
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
			console.log(chalk.green(">> Subscribed successfully!"));
			done();
		});		

	// Unsubscribe to event
	vorpal
		.command("unsubscribe <eventName>", "Unsubscribe from an event")
		.action((args, done) => {
			broker.off(args.eventName, eventHandler);
			console.log(chalk.green(">> Unsubscribed successfully!"));
			done();
		});		

	// List actions
	vorpal
		.command("actions", "List of actions")
		.option("-d, --details")
		.action((args, done) => {
			const actions = broker.serviceRegistry.getActionList(false, false, true);

			const data = [
				[
					chalk.bold("Action"),
					chalk.bold("Nodes"),
					chalk.bold("State"),
					chalk.bold("Cached"),
					chalk.bold("Params")
				]
			];

			actions.forEach(item => {
				const action = item.action;
				const state = item.available;
				const params = action.params ? Object.keys(action.params).join(", ") : "";
				
				data.push([
					action.name,
					(item.hasLocal ? "(*) " : "") + item.count,
					state ? chalk.bgGreen.white("   OK   "):chalk.bgRed.white.bold(" FAILED "),
					action.cache ? chalk.green("Yes"):chalk.gray("No"),
					params
				]);

				let getStateLabel = (state) => {
					switch(state) {
					case C.CIRCUIT_CLOSE:		return chalk.bgGreen.white( "   OK   ");
					case C.CIRCUIT_HALF_OPEN: 	return chalk.bgYellow.black("UNSTABLE");
					case C.CIRCUIT_OPEN: 		return chalk.bgRed.white(	" FAILED ");
					}
				};

				if (args.options.details && item.endpoints) {
					item.endpoints.forEach(endpoint => {
						data.push([
							"",
							endpoint.nodeID || chalk.gray("<local>"),
							getStateLabel(endpoint.state),
							"",
							""
						]);						
					});
				}
			});

			const tableConf = {
				border: _.mapValues(getBorderCharacters("honeywell"), char => chalk.gray(char)),
				columns: {
					1: { alignment: "right" },
					3: { alignment: "center" },
					5: { width: 20, wrapWord: true }
				}
			};
			
			console.log(table(data, tableConf));
			done();
		});			

	// List nodes
	vorpal
		.command("nodes", "List of nodes")
		.action((args, done) => {
			const nodes = [];
			broker.transit.nodes.forEach(node => nodes.push(node));
			const localNode = broker.transit.getNodeInfo();
			localNode.id = null;
			localNode.available = true;
			nodes.unshift(localNode);


			// action, nodeID, cached, CB state, description?, params?
			const data = [];
			data.push([
				chalk.bold("Node ID"),
				chalk.bold("Version"),
				chalk.bold("Actions"),
				chalk.bold("IP"),
				chalk.bold("State"),
				chalk.bold("Uptime")
			]);

			nodes.forEach(node => {
				let ip = "?";
				if (node.ipList) {
					if (node.ipList.length == 1) 
						ip = node.ipList[0];
					else if (node.ipList.length > 1)
						ip = node.ipList[0] + `  (+${node.ipList.length - 1})`;
				}

				data.push([
					node.id || chalk.gray("<local>"),
					node.versions && node.versions.moleculer ? node.versions.moleculer : "?",
					Object.keys(node.actions).length,
					ip,
					node.available ? chalk.bgGreen.black(" ONLINE "):chalk.bgRed.white.bold(" OFFLINE "),
					node.uptime ? ms(node.uptime * 1000) : "?"
				]);
			});

			const tableConf = {
				border: _.mapValues(getBorderCharacters("honeywell"), (char) => {
					return chalk.gray(char);
				}),
				columns: {
					2: { alignment: "right" },
					5: { alignment: "right" }
				}
			};
			
			console.log(table(data, tableConf));

			done();
		});			



	// Start REPL
	vorpal
		.delimiter("mol $")
		.show();

}

module.exports = startREPL;