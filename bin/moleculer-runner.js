#!/usr/bin/env node

/* moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Moleculer 	= require("../");
const fs 			= require("fs");
const path 			= require("path");
const _ 			= require("lodash");
const Args 			= require("args");

let flags;
let configFile;
let config;
let servicePaths;
let broker;
let logger;

/**
 * Process command line arguments
 *
 * Available options:
 * 		-c, --config <file> - Load an external configuration files (.js or .json)
 * 		-h, --hot  			- Hot reload services if changed
 * 		-r, --repl  		- After broker started, switch to REPL mode
 * 		-s , --silent 		- Silent mode. Disable logger, no console messages.
 */
function processFlags() {
	Args
		.option("config", "Load the configuration from a file")
		.option("repl", "Start REPL mode", false)
		.option("hot", "Hot reload services if changed", false)
		.option("silent", "Silent mode. No logger", false);

	flags = Args.parse(process.argv, {
		minimist: {
			alias: {
				c: "config",
				r: "repl",
				s: "silent"
			},
			boolean: ["repl", "silent", "hot"],
			string: ["config"]
		}
	});

	servicePaths = Args.sub;
}

/**
 * Load configuration file
 *
 * Try to load a configuration file in order to:
 *
 * 		- load file which is defined in CLI option with --config
 * 		- try to load the `moleculer.config.js` file if exist in the cwd
 * 		- try to load the `moleculer.config.json` file if exist in the cwd
 */
function loadConfigFile() {
	let filePath;
	if (flags.config) {
		filePath = path.isAbsolute(flags.config) ? flags.config : path.resolve(process.cwd(), flags.config);
	}
	if (!filePath && fs.existsSync(path.resolve(process.cwd(), "moleculer.config.js"))) {
		filePath = path.resolve(process.cwd(), "moleculer.config.js");
	}
	if (!filePath && fs.existsSync(path.resolve(process.cwd(), "moleculer.config.json"))) {
		filePath = path.resolve(process.cwd(), "moleculer.config.json");
	}

	if (filePath) {
		if (!fs.existsSync(filePath))
			return Promise.reject(new Error(`Config file not found: ${filePath}`));

		const ext = path.extname(filePath);
		switch (ext) {
			case ".json":
			case ".js": {
				configFile = require(filePath);
				break;
			}
			default: return Promise.reject(new Error(`Not supported file extension: ${ext}`));
		}
	}
}

/**
 * Merge broker options
 *
 * Merge options from environment variables and config file. First
 * load the config file if exists. After it overwrite the vars from
 * the environment values.
 *
 * Example options:
 *
 * 	Original broker option: `logLevel`
 *  Config file property: 	`logLevel`
 *  Env variable:			`LOGLEVEL`
 *
 * 	Original broker option: `circuitBreaker.enabled`
 *  Config file property: 	`circuitBreaker.enabled`
 *  Env variable:			`CIRCUITBREAKER_ENABLED`
 *
 */
function mergeOptions() {

	config = _.defaultsDeep(configFile, Moleculer.ServiceBroker.defaultConfig);
	if (config.logger == null && !flags.silent)
		config.logger = console;

	function overwriteFromEnv(obj, prefix) {
		Object.keys(obj).forEach(key => {

			const envName = ((prefix ? prefix + "_" : "") + key).toUpperCase();

			if (process.env[envName]) {
				let v = process.env[envName];

				if (v.toLowerCase() === "true" || v.toLowerCase() === "false") {
					// Convert to boolean
					v = v === "true";
				} else if (!isNaN(v)) {
					// Convert to number
					v = Number(v);
				}

				obj[key] = v;
			}

			if (_.isPlainObject(obj[key]))
				obj[key] = overwriteFromEnv(obj[key], key);
		});

		return obj;
	}

	config = overwriteFromEnv(config);

	if (flags.silent) {
		config.logger = null;
	}

	//console.log("Config", config);
}

/**
 * Load services from files or directories
 *
 * 1. first check the CLI arguments. If it find filename(s), load it/them
 * 2. If find directory(ies), load it/them
 * 3. If find `SERVICEDIR` env var and not find `SERVICES` env var, load all services from the `SERVICEDIR` directory
 * 4. If find `SERVICEDIR` env var and `SERVICES` env var, load the specified services from the `SERVICEDIR` directory
 * 5. If not find `SERVICEDIR` env var but find `SERVICES` env var, load the specified services from the current directory
 *
 * Please note: you can use shorthand names for `SERVICES` env var.
 * 	E.g.
 * 		SERVICES=posts,users
 *
 * 		It will be load the `posts.service.js` and `users.service.js` files
 *
 *
 */
function loadServices() {
	if (servicePaths.length > 0) {
		servicePaths.forEach(p => {
			if (!p) return;

			if (p.startsWith("npm:")) {
				// Load from NPM module
				loadNpmModule(p.slice(4));

			} else {
				// Load file or dir
				const svcPath = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
				if (!fs.existsSync(svcPath))
					throw new Error(`Path not found: ${svcPath}`);

				const isDir = fs.lstatSync(svcPath).isDirectory();
				if (isDir) {
					broker.loadServices(svcPath);
				} else {
					broker.loadService(svcPath);
				}
			}
		});

	} else if (process.env.SERVICES || process.env.SERVICEDIR) {
		let svcDir = process.env.SERVICEDIR || "";

		if (fs.existsSync(svcDir) && !process.env.SERVICES) {
			// Load all services from directory
			broker.loadServices(path.isAbsolute(svcDir) ? svcDir : path.resolve(process.cwd(), svcDir));
		}

		if (process.env.SERVICES) {
			// Load services from env list
			let services = Array.isArray(process.env.SERVICES) ? process.env.SERVICES : process.env.SERVICES.split(",");
			let dir = path.isAbsolute(svcDir) ? svcDir : path.resolve(process.cwd(), svcDir || "");

			services.map(s => s.trim()).forEach(p => {
				let name = p;

				if (name.startsWith("npm:")) {
					// Load from NPM module
					loadNpmModule(p.slice(4));

				} else {
					// Load from local files
					if (!name.endsWith(".service.js") && !name.endsWith(".js"))
						name = name + ".service.js";

					const svcPath = path.resolve(dir, name);
					if (!fs.existsSync(svcPath))
						throw new Error(`Path not found: ${svcPath}`);

					broker.loadService(svcPath);
				}
			});
		}
	}

	if (flags.hot) {
		let debouncedHotReload = _.debounce(hotReloadService, 500);

		broker.services.forEach(service => {
			if (service.__filename) {
				logger.info(`Watching '${service.name}' service file...`);

				// Better: https://github.com/paulmillr/chokidar
				fs.watch(service.__filename, (eventType, filename) => {
					logger.debug(`The ${filename} is changed: ${eventType}`);

					debouncedHotReload(service);
				});
			}
		});
	}
}
function clearRequireCache(filename) {
	Object.keys(require.cache).forEach(function(key) {
		if (key == filename) {
			delete require.cache[key];
			logger.debug("Cleared from require cache.", filename);
		}
	});
}

function hotReloadService(service) {
	logger.info(`Hot reloading '${service.name}' service...`, service.__filename);

	clearRequireCache(service.__filename);

	broker.destroyService(service)
		.then(() => broker.loadService(service.__filename))
		.then(svc => svc.started.call(svc).then(() => svc))
		.then(svc => logger.info(`Service '${svc.name}' is reloaded.`));
}

/**
 * Load service from NPM module
 *
 * @param {String} name
 * @returns {Service}
 */
function loadNpmModule(name) {
	let svc = require(name);
	return broker.createService(svc);
}

/**
 * Start Moleculer broker
 */
function startBroker() {
	// Create service broker
	broker = new Moleculer.ServiceBroker(config);
	logger = broker.getLogger("runner");

	loadServices();

	broker.start().then(() => {

		if (flags.repl)
			broker.repl();

	});
}

/**
 * Running
 */
Promise.resolve()
	.then(processFlags)
	.then(loadConfigFile)
	.then(mergeOptions)
	.then(startBroker)
	.catch(err => {
		/* eslint-disable no-console */
		console.error(err);
		process.exit(1);
	});
