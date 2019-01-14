/*
 * moleculer
 * Copyright (c) 2019 MoleculerJS (https://github.com/moleculerjs/moleculer)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const chalk = require("chalk");
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
		fs.writeFile(path.join(targetFolder, filename), JSON.stringify(payload, null, 4), () => { /* Silent error */ });
	}

	function isWhiteListed(actionName) {
		return !!opts.whitelist.find(pattern => match(actionName, pattern));
	}

	const coloringRequest = opts.colors && opts.colors.request ? opts.colors.request.split(".").reduce((a,b) => a[b], chalk) : s => s;
	const coloringResponse = opts.colors && opts.colors.response ? opts.colors.response.split(".").reduce((a,b) => a[b], chalk) : s => s;
	const coloringError = opts.colors && opts.colors.error ? opts.colors.error.split(".").reduce((a,b) => a[b], chalk) : s => s;

	let logFn;

	return {
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
				if (!isWhiteListed(_.isObject(actionName) ? actionName.action.name : actionName)) {
					return next(actionName, params, callingOpts);
				}

				if (logFn) {
					const msg = coloringRequest(`Calling ${actionName}` + (opts.logParams ? " with params:" : "."));
					opts.logParams ? logFn(msg, params) : logFn(msg);
				}

				if (targetFolder)
					saveToFile(`${Date.now()}-call-${actionName}${opts.extension}`, params);

				const p = next(actionName, params, callingOpts);

				const p2 = p
					.then(res => {

						if (logFn) {
							const msg = coloringResponse(`Response for ${actionName} is received` + (opts.logResponse ? ":" : "."));
							opts.logParams ? logFn(msg, params) : logFn(msg);
						}

						return res;
					})
					.catch(err => {

						if (logFn) {
							logFn(coloringError(`Error for ${actionName} is received:`), _.omit(err, ["ctx"]));
						}

						throw err;
					});

				// Context issue workaround: https://github.com/moleculerjs/moleculer/issues/413
				p2.ctx = p.ctx;

				return p2;
			};
		}
	};
};
