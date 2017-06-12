/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const v8 = require("v8");
const _ = require("lodash");
const chalk = require("chalk");
const ms = require("ms");
const C = require("./constants");
const { table, getBorderCharacters } = require("table");
const vorpal = require("vorpal")();
const clui = require("clui");
const pretty = require("pretty-bytes");
const healthInfo = require("./health");

/* istanbul ignore next */
const eventHandler = payload => {
	console.log(chalk.magenta(">> Incoming event!"), payload);
};

/**
 * Start REPL mode
 * 
 * @param {ServiceBroker} broker 
 */
/* istanbul ignore next */
function startREPL(broker) {
	vorpal
		.command("q", "Exit application")
		.action((args, done) => {
			broker.stop().then(() => process.exit(0));
			done();
		});

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

	// Register direct broker.call
	vorpal
		.command("dcall <nodeID> <actionName> [params]", "Direct call an action ")
		.action((args, done) => {
			const nodeID = args.nodeID;
			console.log(chalk.yellow.bold(`>> Call '${args.actionName}' on '${nodeID}' with params:`), args.params);
			broker.call(args.actionName, JSON.parse(args.params || "{}"), { nodeID })
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
			const actions = broker.serviceRegistry.getActionList({ onlyLocal: false, skipInternal: false, withEndpoints: true});

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
				const params = action && action.params ? Object.keys(action.params).join(", ") : "";
				
				if (action) {
					data.push([
						action.name,
						(item.hasLocal ? "(*) " : "") + item.count,
						state ? chalk.bgGreen.white("   OK   "):chalk.bgRed.white.bold(" FAILED "),
						action.cache ? chalk.green("Yes"):chalk.gray("No"),
						params
					]);
				} else {
					data.push([
						item.name,
						item.count,
						chalk.bgRed.white.bold(" FAILED "),
						"",
						""
					]);
				}

				let getStateLabel = (state) => {
					switch(state) {
					case C.CIRCUIT_CLOSE:		return chalk.bgGreen.white( "   OK   ");
					case C.CIRCUIT_HALF_OPEN: 	return chalk.bgYellow.black(" TRYING ");
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

	// List services
	vorpal
		.command("services", "List of services")
		//.option("-d, --details")
		.action((args, done) => {
			const services = broker.serviceRegistry.getServiceList({ onlyLocal: false, withActions: true });

			const data = [
				[
					chalk.bold("Service"),
					chalk.bold("Version"),
					chalk.bold("Actions"),
					chalk.bold("Nodes")
				]
			];

			let list = [];

			services.forEach(svc => {
				let item = list.find(o => o.name == svc.name && o.version == svc.version);
				if (item) {
					item.nodes.push(svc.nodeID);
				} else {
					item = _.pick(svc, ["name", "version"]);
					item.nodes = [svc.nodeID];
					item.actionCount = Object.keys(svc.actions).length;
					list.push(item);
				}
			});

			list.forEach(item => {
				const hasLocal = item.nodes.indexOf(null) !== -1;
				const nodeCount = item.nodes.length;
				
				data.push([
					item.name,
					item.version || "-",
					item.actionCount,
					(hasLocal ? "(*) " : "") + nodeCount
				]);

			});

			const tableConf = {
				border: _.mapValues(getBorderCharacters("honeywell"), char => chalk.gray(char)),
				columns: {
					1: { alignment: "right" },
					2: { alignment: "right" },
					3: { alignment: "right" }
				}
			};
			
			console.log(table(data, tableConf));
			done();
		});			

	// List nodes
	vorpal
		.command("nodes", "List of nodes")
		.option("-d, --details")
		.action((args, done) => {
			if (!broker.transit) {
				console.error("There is no transporter!");
				return done();
			}
			
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
				chalk.bold("Services"),
				chalk.bold("Version"),
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
					Object.keys(node.services).length,
					node.versions && node.versions.moleculer ? node.versions.moleculer : "?",
					ip,
					node.available ? chalk.bgGreen.black(" ONLINE "):chalk.bgRed.white.bold(" OFFLINE "),
					node.uptime ? ms(node.uptime * 1000) : "?"
				]);

				if (args.options.details && Object.keys(node.services).length > 0) {
					_.forIn(node.services, service => {
						data.push([
							"",
							service.name,
							service.version || "-",
							"",
							"",
							""
						]);						
					});
				}				
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

	// Broker info
	vorpal
		.command("info", "Information from broker")
		.action((args, done) => {

			const printHeader = (name) => {
				const title = "  " + name + "  ";
				const lines = "=".repeat(title.length);
				console.log(chalk.yellow.bold(lines));
				console.log(chalk.yellow.bold(title));
				console.log(chalk.yellow.bold(lines));
				console.log("");	
			};

			const print = (caption, value) => {
				console.log("   ", _.padEnd(caption, 25) + (value != null ? ": " + chalk.bold(value) : ""));
			};

			const printObject = (obj, level = 0) => {
				const pad = "  ".repeat(level);
				Object.keys(obj).forEach(key => {
					const val = obj[key];
					if (_.isString(val)) {
						print(pad + key, chalk.green("\"" + val + "\""));
					}
					else if (_.isNumber(val)) {
						print(pad + key, chalk.cyan(val));
					}
					else if (_.isBoolean(val)) {
						print(pad + key, chalk.magenta(val));
					}
					else if (_.isBoolean(val)) {
						print(pad + key, chalk.magenta(val));
					}
					else if (_.isArray(val)) {
						print(pad + key, chalk.blue("[" + val.join(", ") + "]"));
					}
					else if (_.isPlainObject(val) && level < 1) {
						print(pad + key);
						printObject(val, level + 1);
					}
				});
			};			

			console.log("");
			healthInfo(broker).then(health => {
				const Gauge = clui.Gauge;
				const total = health.mem.total;
				const free = health.mem.free;
				const used = total - free;
				const human = pretty(free);

				const heapStat = v8.getHeapStatistics();
				const heapUsed = heapStat.used_heap_size; 
				const maxHeap = heapStat.heap_size_limit;

				printHeader("Common information");
				print("CPU", "Arch: " + (os.arch()) + ", Cores: " + (os.cpus().length));
				print("Memory", Gauge(used, total, 20, total * 0.8, human + " free"));
				print("Heap", Gauge(heapUsed, maxHeap, 20, maxHeap * 0.5, pretty(heapUsed)));
				print("OS", (os.platform()) + " (" + (os.type()) + ")");
				print("IP", health.net.ip.join(", "));
				print("Hostname", os.hostname());
				console.log("");

				printHeader("Broker settings");
				print("Services", broker.services.length);
				print("Actions", broker.serviceRegistry.count());
				print("Cacher", broker.cacher ? broker.cacher.constructor.name : chalk.gray("<None>"));

				if (broker.transit) {
					print("Nodes", broker.transit.nodes.size);

					console.log("");
					printHeader("Transport information");
					print("Serializer", broker.serializer ? broker.serializer.constructor.name : chalk.gray("<None>"));
					print("Pending requests", broker.transit.pendingRequests.size);

					if (broker.transit.tx) {
						print("Transporter", broker.transit.tx ? broker.transit.tx.constructor.name : chalk.gray("<None>"));

						print("Packets");
						print("    Sent", broker.transit.stat.packets.sent);
						print("    Received", broker.transit.stat.packets.received);

						console.log("");

						printHeader("Transporter settings");
						if (_.isString(broker.transit.tx.opts))
							print("URL", broker.transit.tx.opts);
						else
							printObject(broker.transit.tx.opts);
					}
				}
				console.log("");

				printHeader("Broker settings");
				printObject(broker.options);
				console.log("");

				console.log("");
				done();
			}).catch(err => console.error(err));
		});	

	// Start REPL
	vorpal
		.delimiter("mol $")
		.show();

}

module.exports = startREPL;