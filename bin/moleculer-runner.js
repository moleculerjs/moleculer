#!/usr/bin/env node

/* moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const Moleculer = require("../");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");
const Args = require("args");

let flags;
let configFile;
let servicePaths;
let broker;

/**
 * Process command line arguments
 */
function processFlags() {
	Args
		.option("config", "Load the configuration from a file")
		.option("repl", "Start REPL mode", false)
		.option("silent", "Silent mode. No logger", false);

	flags = Args.parse(process.argv, {
		minimist: {
			alias: {
				c: "config",
				r: "repl",
				s: "silent"
			},
			boolean: ["repl", "silent"],
			string: ["config"]
		}
	});

	servicePaths = Args.sub;
}

/**
 * Load configuration file
 * 
 * @returns 
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
 * Start Moleculer broker
 */
function startBroker() {

	let config = _.defaultsDeep(configFile, Moleculer.ServiceBroker.defaultConfig);
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

	// Create service broker
	broker = new Moleculer.ServiceBroker(config);

	loadServices();

	broker.start().then(() => {

		if (flags.repl)
			broker.repl();

	});

}

/**
 * Load services from files or directories
 */
function loadServices() {
	if (servicePaths.length > 0) {
		servicePaths.forEach(p => {
			if (!p) return;

			const svcPath = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
			if (!fs.existsSync(svcPath))
				throw new Error(`Path not found: ${svcPath}`);

			const isDir = fs.lstatSync(svcPath).isDirectory();
			if (isDir) {
				broker.loadServices(svcPath);
			} else {
				broker.loadService(svcPath);
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
				if (!name.endsWith(".service.js"))
					name = name + ".service.js";

				const svcPath = path.resolve(dir, name);
				if (!fs.existsSync(svcPath))
					throw new Error(`Path not found: ${svcPath}`);

				broker.loadService(svcPath);
			});
		}
	}

}

/**
 * Run
 */
Promise.resolve()
	.then(processFlags)
	.then(loadConfigFile)
	.then(startBroker)
	.catch(err => {
		/* eslint-disable no-console */
		console.error(err);
		process.exit(1);
	});
