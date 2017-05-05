/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const path 				= require("path");
const http 				= require("http");

//const url 			= require("url");
const _ 				= require("lodash");
const queryString 		= require("querystring");
const bp 				= require("body-parser");
const serveStatic 		= require("serve-static");
const nanomatch  		= require("nanomatch");

const { CustomError } 	= require("../src/errors");

module.exports = {
	name: "api-gw",
	version: "1.0",

	settings: {
		// Exposed port
		port: process.env.PORT || 4000,

		// Exposed IP
		ip: process.env.IP || "0.0.0.0",

		// Exposed path prefix
		path: "/api",

		// TODO: Append version to path
		versioning: true,

		// Whitelist of actions (array of string mask or regex)
		whitelist: [
			"posts.*",
			"users.get",
			/^math\.\w+$/
		],

		// Action aliases
		aliases: {
			"POST users": "users.create",
			"add": "math.add",
			"GET sub": "math.sub",
			"POST divide": "math.div"
		},

		// Folder to server assets (static files)
		assets: {
			// Root folder of assets
			folder: "./assets",
			// Options to `server-static` module
			options: {}
		},

		// TODO: Order to get params from request
		paramsOrder: ["query", "body"],

		// TODO: Use bodyparser module
		bodyParsers: {
			json: true,
			urlencoded: { extended: true }
		}
	},

	created() {
		this.server = http.createServer(this.httpHandler);

		this.server.on("connection", socket => {
			// Disable Nagle algorithm https://nodejs.org/dist/latest-v6.x/docs/api/net.html#net_socket_setnodelay_nodelay
			socket.setNoDelay(true);
		});

		// Create static serve
		if (this.settings.assets) {
			this.serve = serveStatic(this.settings.assets.folder, _.defaultsDeep(this.settings.assets.options, {
				fallthrough: false
			}));
		}

		// Handle whitelist
		this.hasWhitelist = Array.isArray(this.settings.whitelist);

		// Handle aliases
		this.hasAliases = this.settings.aliases && Object.keys(this.settings.aliases).length > 0;

		// Handle body parsers
		if (this.settings.bodyParsers) {
			const bodyParsers = _.isObject(this.settings.bodyParsers) ? this.settings.bodyParsers : { json: true };
			const parsers = [];
			Object.keys(bodyParsers).forEach(key => {
				const opts = _.isObject(bodyParsers[key]) ? bodyParsers[key] : undefined;
				if (bodyParsers[key] !== false)
					parsers.push(bp[key](opts));
			});

			this.parsers = parsers;
		}

		// Create URL regexp
		let path = this.settings.path || "/";
		this.urlRegex = new RegExp(path.replace("/", "\\/") + "\\/([\\w\\.\\~\\/]+)", "g");


		this.logger.info("API Gateway created!");
	},

	methods: {
		send404(req, res) {
			res.writeHead(404);
			res.end("Not found");
		},

		httpHandler(req, res) {
			this.logger.debug(`${req.method} ${req.url}`);

			// Split URL & query params
			let url;
			let query;
			const questionIdx = req.url.indexOf("?", 1);
			if (questionIdx === -1) {
				url = req.url;
			} else {
				query = queryString.parse(req.url.substring(questionIdx + 1));
				url = req.url.substring(0, questionIdx);
			}

			// Trim trailing slash
			if (url.endsWith("/"))
				url = url.slice(0, -1);

			// Check the URL is an API request
			this.urlRegex.lastIndex = 0;
			const match = this.urlRegex.exec(url);
			if (match) {
				// Resolve action name
				let actionName = match[1].replace(/~/, "$").replace(/\//g, ".");

				return this.callAction(actionName, req, res, query);
			} 

			// Serve assets static files
			if (this.serve) {
				this.serve(req, res, err => {
					this.logger.debug(err);
					this.send404(req, res);
				});
				return;
			} 

			// 404
			this.send404(req, res);
		},

		callAction(actionName, req, res, query) {
			let params = {};

			return this.Promise.resolve()

			// Resolve aliases
			.then(() => {
				if (this.hasAliases) {
					const newActionName = this.resolveAlias(actionName, req.method);
					if (newActionName !== actionName) {
						this.logger.info(`Alias: ${req.method} ${actionName} -> ${newActionName}`);
						actionName = newActionName;
					}
				}
			})

			// Whitelist check
			.then(() => {
				if (this.hasWhitelist) {
					if (!this.checkWhitelist(actionName)) {
						this.logger.debug(`The '${actionName}' action is not in the whitelist!`);
						return this.Promise.reject(new CustomError("Not found", 404));
					}
				}
			})
	
			// Read params
			.then(() => {
				
				if (["POST", "PUT", "PATCH"].indexOf(req.method) !== -1 && this.parsers.length > 0) {
					return this.Promise.mapSeries(this.parsers, parser => {
						return new this.Promise((resolve, reject) => {
							parser(req, res, err => {
								if (err)
									return reject(err);

								resolve();
							});
						});
					}).then(() => {
						//this.logger.debug("Parsed body:", req.body);

						params = Object.assign({}, query);
						if (_.isObject(req.body)) 
							params = Object.assign(params, req.body);
					});
				}
			})

			// Call the action
			.then(() => {
				this.logger.info(`Call '${actionName}' action with params:`, params);

				return this.broker.call(actionName, params)
					.then(data => {
						// Return with the response
						res.writeHead(200, { "Content-type": "application/json"});
						res.end(JSON.stringify(data));						
					});
			})

			// Error handling
			.catch(err => {
				// Return with the error
				this.logger.error(err);
				res.writeHead(err.code || 500, { "Content-type": "text/plain"});
				res.end(err.message);						
			});
		},

		checkWhitelist(action) {
			return this.settings.whitelist.find(mask => {
				if (_.isString(mask))
					return nanomatch.isMatch(action, mask, { unixify: false,  });
				else if (_.isRegExp(mask))
					return mask.test(action);
			}) != null;
		},

		resolveAlias(actionName, method = "GET") {
			const match = method + " " + actionName;

			const res = this.settings.aliases[match] || this.settings.aliases[actionName];

			return res ? res : actionName;
		}

	},

	started() {
		this.server.listen(this.settings.port, this.settings.ip, err => {
			if (err) 
				return this.logger.error("API Gateway listen error!", err);

			const addr = this.server.address();
			this.logger.info(`API Gateway listening on http://${addr.address}:${addr.port}`);
		});		
	},

	stopped() {
		if (this.server.listening) {
			this.server.close(err => {
				if (err) 
					return this.logger.error("API Gateway close error!", err);

				this.logger.info("API Gateway stopped!");			
			});
		}
	}

};