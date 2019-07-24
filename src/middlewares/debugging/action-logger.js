/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const kleur = require("kleur");
const fs = require("fs");
const path = require("path");
const { makeDirs, match } = require("../../utils");

module.exports = function ActionLoggerMiddleware(opts) {
	opts = _.defaultsDeep(opts, {
		logger: null,
		logLevel: "info",
		logParams: false,
		logResponse: false,
		logMeta: false,

		folder: null,
		extension: ".json",

		colors: {
			request: "yellow",
			response: "cyan",
			error: "red"
		},
		whitelist: ["**"]
	});

	let logger;
	let nodeID;

	let targetFolder;

	function saveToFile(filename, payload) {
		const data = JSON.stringify(payload, payload instanceof Error ? Object.getOwnPropertyNames(payload) : null, 4);
		fs.writeFile(path.join(targetFolder, filename), data, () => { /* Silent error */ });
	}

	function isWhiteListed(actionName) {
		return !!opts.whitelist.find(pattern => match(actionName, pattern));
	}

	const coloringRequest = opts.colors && opts.colors.request ? opts.colors.request.split(".").reduce((a,b) => a[b] || a()[b], kleur) : s => s;
	const coloringResponse = opts.colors && opts.colors.response ? opts.colors.response.split(".").reduce((a,b) => a[b] || a()[b], kleur) : s => s;
	const coloringError = opts.colors && opts.colors.error ? opts.colors.error.split(".").reduce((a,b) => a[b] || a()[b], kleur) : s => s;

	let logFn;

	return {
		name: "ActionLogger",
		created(broker) {
			logger = opts.logger || broker.getLogger("debug");
			nodeID = broker.nodeID;

			if (opts.folder) {
				targetFolder = path.join(opts.folder, nodeID);
				makeDirs(targetFolder);
			}

			logFn = opts.logLevel ? logger[opts.logLevel] : null;
		},

		call(next) {
			return (actionName, params, callingOpts) => {
				// Whitelist filtering
				if (!isWhiteListed(_.isObject(actionName) ? actionName.action.name : actionName)) {
					return next(actionName, params, callingOpts);
				}

				// Logging to logger
				if (logFn) {
					const msg = coloringRequest(`Calling '${actionName}'` + (opts.logParams ? " with params:" : "."));
					opts.logParams ? logFn(msg, params) : logFn(msg);
					if (opts.logMeta && callingOpts && callingOpts.meta) {
						logFn("Meta:", callingOpts.meta);
					}
				}

				// Logging to file
				if (targetFolder) {
					if (opts.logParams) {
						saveToFile(`${Date.now()}-call-${actionName}-request${opts.extension}`, params);
					}

					if (opts.logMeta && callingOpts && callingOpts.meta) {
						saveToFile(`${Date.now()}-call-${actionName}-meta${opts.extension}`, callingOpts.meta);
					}
				}

				// Call the original method
				const p = next(actionName, params, callingOpts);

				const p2 = p
					.then(response => {

						// Log response to logger
						if (logFn) {
							const msg = coloringResponse(`Response for '${actionName}' is received` + (opts.logResponse ? ":" : "."));
							opts.logResponse ? logFn(msg, response) : logFn(msg);
						}

						// Log response to file
						if (targetFolder && opts.logResponse)
							saveToFile(`${Date.now()}-call-${actionName}-response${opts.extension}`, response);

						return response;
					})
					.catch(err => {

						// Log error to logger
						if (logFn) {
							logFn(coloringError(`Error for '${actionName}' is received:`), err);
						}

						// Logger error to file
						if (targetFolder && opts.logResponse)
							saveToFile(`${Date.now()}-call-${actionName}-error${opts.extension}`, err);

						throw err;
					});

				// Context issue workaround: https://github.com/moleculerjs/moleculer/issues/413
				p2.ctx = p.ctx;

				return p2;
			};
		}
	};
};
