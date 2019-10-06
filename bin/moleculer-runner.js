#!/usr/bin/env node

/* moleculer
 * Copyright (c) 2018 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const Moleculer 	= require("../");
const utils			= require("../src/utils");
const Promise		= require("bluebird");
const fs 			= require("fs");
const path 			= require("path");
const glob 			= require("glob").sync;
const _ 			= require("lodash");
const Args 			= require("args");
const os			= require("os");
const cluster		= require("cluster");
const kleur			= require("kleur");

const stopSignals = [
	"SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT",
	"SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM"
];
const production = process.env.NODE_ENV === "production";

const watchFolders = [];

let flags;
let configFile;
let config;
let servicePaths;
let broker;

/* eslint-disable no-console */

/**
 * Logger helper
 *
 */
const logger = {
	info(message) {
		console.log(kleur.green().bold(message));
	},
	error(err) {
		if (err instanceof Error)
			console.error(kleur.red().bold(err.message), err);
		else
			console.error(kleur.red().bold(err));
	}
};

/**
 * Process command line arguments
 *
 * Available options:
    -c, --config     Load the configuration from a file
    -e, --env        Load .env file from the current directory
    -E, --envfile    Load a specified .env file
    -h, --help       Output usage information
    -H, --hot        Hot reload services if changed (disabled by default)
    -i, --instances  Launch [number] instances node (load balanced)
    -m, --mask       Filemask for service loading
    -r, --repl       Start REPL mode (disabled by default)
    -s, --silent     Silent mode. No logger (disabled by default)
    -v, --version    Output the version number
 */
function processFlags() {
	Args
		.option("config", "Load the configuration from a file")
		.option("repl", "Start REPL mode", false)
		.option(["H", "hot"], "Hot reload services if changed", false)
		.option("silent", "Silent mode. No logger", false)
		.option("env", "Load .env file from the current directory")
		.option("envfile", "Load a specified .env file")
		.option("instances", "Launch [number] instances node (load balanced)")
		.option("mask", "Filemask for service loading");

	flags = Args.parse(process.argv, {
		mri: {
			alias: {
				c: "config",
				r: "repl",
				H: "hot",
				s: "silent",
				e: "env",
				E: "envfile",
				i: "instances",
				m: "mask"
			},
			boolean: ["repl", "silent", "hot", "env"],
			string: ["config", "envfile", "mask"]
		}
	});

	servicePaths = Args.sub;
}

/**
 * Load environment variables from '.env' file
 */
function loadEnvFile() {
	if (flags.env || flags.envfile) {
		try {
			const dotenv = require("dotenv");

			if (flags.envfile)
				dotenv.config({ path: flags.envfile });
			else
				dotenv.config();
		} catch(err) {
			throw new Error("The 'dotenv' package is missing! Please install it with 'npm install dotenv --save' command.");
		}
	}
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
			case ".js":
			case ".ts": {
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

	config = _.defaultsDeep(configFile, Moleculer.ServiceBroker.defaultOptions);
	if (flags.silent)
		config.logger = false;

	function normalizeEnvValue(value) {
		if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
			// Convert to boolean
			value = value === "true";
		} else if (!isNaN(value)) {
			// Convert to number
			value = Number(value);
		}
		return value;
	}

	function overwriteFromEnv(obj, prefix) {
		Object.keys(obj).forEach(key => {

			const envName = ((prefix ? prefix + "_" : "") + key).toUpperCase();

			if (process.env[envName]) {
				obj[key] = normalizeEnvValue(process.env[envName]);
			}

			if (_.isPlainObject(obj[key]))
				obj[key] = overwriteFromEnv(obj[key], (prefix ? prefix + "_" : "") + key);
		});

		const moleculerPrefix = "MOL_";
		Object.keys(process.env)
			.filter(key => key.startsWith(moleculerPrefix))
			.map(key => ({
				key,
				withoutPrefix: key.substr(moleculerPrefix.length)
			}))
			.forEach(variable => {
				const dotted = variable.withoutPrefix
					.split("__")
					.map(level => level.toLocaleLowerCase())
					.map(level =>
						level
							.split("_")
							.map((value, index) => {
								if (index == 0) {
									return value;
								} else {
									return value[0].toUpperCase() + value.substring(1);
								}
							})
							.join("")
					)
					.join(".");
				obj = utils.dotSet(obj, dotted, normalizeEnvValue(process.env[variable.key]));
			});

		return obj;
	}

	config = overwriteFromEnv(config);

	if (flags.silent) {
		config.logger = null;
	}

	if (flags.hot) {
		config.hotReload = true;
	}

	//console.log("Config", config);
}

/**
 * Check the given path whether directory or not
 *
 * @param {String} p
 * @returns {Boolean}
 */
function isDirectory(p) {
	try {
		return fs.lstatSync(p).isDirectory();
	} catch(_) {
		// ignore
	}
	return false;
}

/**
 * Check the given path whether a file or not
 *
 * @param {String} p
 * @returns {Boolean}
 */
function isServiceFile(p) {
	try {
		return !fs.lstatSync(p).isDirectory();
	} catch(_) {
		// ignore
	}
	return false;
}

/**
 * Load services from files or directories
 *
 * 1. If find `SERVICEDIR` env var and not find `SERVICES` env var, load all services from the `SERVICEDIR` directory
 * 2. If find `SERVICEDIR` env var and `SERVICES` env var, load the specified services from the `SERVICEDIR` directory
 * 3. If not find `SERVICEDIR` env var but find `SERVICES` env var, load the specified services from the current directory
 * 4. check the CLI arguments. If it find filename(s), load it/them
 * 5. If find directory(ies), load it/them
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
	watchFolders.length = 0;
	const fileMask = flags.mask || "**/*.service.js";

	const serviceDir = process.env.SERVICEDIR || "";
	const svcDir = path.isAbsolute(serviceDir) ? serviceDir : path.resolve(process.cwd(), serviceDir);

	let patterns = servicePaths;

	if (process.env.SERVICES || process.env.SERVICEDIR) {

		if (isDirectory(svcDir) && !process.env.SERVICES) {
			// Load all services from directory (from subfolders too)
			broker.loadServices(svcDir, fileMask);

			if (config.hotReload) {
				watchFolders.push(svcDir);
			}
		} else if (process.env.SERVICES) {
			// Load services from env list
			patterns = Array.isArray(process.env.SERVICES) ? process.env.SERVICES : process.env.SERVICES.split(",");
		}
	}

	if (patterns.length > 0) {
		let serviceFiles = [];

		patterns.map(s => s.trim()).forEach(p => {
			const skipping = p[0] == "!";
			if (skipping)
				p = p.slice(1);

			if (p.startsWith("npm:")) {
				// Load NPM module
				loadNpmModule(p.slice(4));

			} else {
				let files;
				const svcPath = path.isAbsolute(p) ? p : path.resolve(svcDir, p);
				// Check is it a directory?
				if (isDirectory(svcPath)) {
					if (config.hotReload) {
						watchFolders.push(svcPath);
					}
					files = glob(svcPath + "/" + fileMask, { absolute: true });
					if (files.length == 0)
						return broker.logger.warn(kleur.yellow().bold(`There is no service files in directory: '${svcPath}'`));
				} else if (isServiceFile(svcPath)) {
					files = [svcPath.replace(/\\/g, "/")];
				} else if (isServiceFile(svcPath + ".service.js")) {
					files = [svcPath.replace(/\\/g, "/") + ".service.js"];
				} else {
					// Load with glob
					files = glob(p, { cwd: svcDir, absolute: true });
					if (files.length == 0)
						broker.logger.warn(kleur.yellow().bold(`There is no matched file for pattern: '${p}'`));
				}

				if (files && files.length > 0) {
					if (skipping)
						serviceFiles = serviceFiles.filter(f => files.indexOf(f) === -1);
					else
						serviceFiles.push(...files);
				}
			}
		});

		_.uniq(serviceFiles).forEach(f => broker.loadService(f));
	}
}

/**
 * Start cluster workers
 */
function startWorkers(instances) {
	let stopping = false;

	cluster.on("exit", function(worker, code) {
		if (!stopping) {
			// only restart the worker if the exit was by an error
			if (production && code !== 0) {
				logger.info(`The worker #${worker.id} has disconnected`);
				logger.info(`Worker #${worker.id} restarting...`);
				cluster.fork();
				logger.info(`Worker #${worker.id} restarted`);
			} else {
				process.exit(code);
			}
		}
	});

	const workerCount = Number.isInteger(instances) && instances > 0 ? instances : os.cpus().length;

	logger.info(`Starting ${workerCount} workers...`);

	for (let i = 0; i < workerCount; i++) {
		cluster.fork();
	}

	stopSignals.forEach(function(signal) {
		process.on(signal, () => {
			logger.info(`Got ${signal}, stopping workers...`);
			stopping = true;
			cluster.disconnect(function() {
				logger.info("All workers stopped, exiting.");
				process.exit(0);
			});
		});
	});
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
	let worker = cluster.worker;

	if (worker) {
		Object.assign(config, {
			nodeID: (config.nodeID || utils.getNodeID()) + "-" + worker.id
		});
	}

	// Create service broker
	broker = new Moleculer.ServiceBroker(Object.assign({}, config));
	broker.runner = {
		flags,
		worker,
		restartBroker
	};

	loadServices();

	if (watchFolders.length > 0)
		broker.runner.folders = watchFolders;

	return broker.start()
		.then(() => {
			if (flags.repl && (!worker || worker.id === 1))
				broker.repl();
		});
}

/**
 * Running
 */
function run() {
	return Promise.resolve()
		.then(loadEnvFile)
		.then(loadConfigFile)
		.then(mergeOptions)
		.then(startBroker)
		.catch(err => {
			logger.error(err);
			process.exit(1);
		});
}

function restartBroker() {
	if (broker && broker.started) {
		return broker.stop()
			.catch(err => {
				logger.error("Error while stopping ServiceBroker", err);
			})
			.then(() => run());
	} else {
		return run();
	}
}

Promise.resolve()
	.then(processFlags)
	.then(() => {
		if (flags.instances !== undefined && cluster.isMaster) {
			return startWorkers(flags.instances);
		}

		return run();
	});
