/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const http 				= require("http");
const queryString 		= require("querystring");

const _ 				= require("lodash");
const bp 				= require("body-parser");
const serveStatic 		= require("serve-static");
const nanomatch  		= require("nanomatch");

const { ServiceNotFoundError, CustomError } 	= require("../src/errors");
//const Context 			= require("../src/context");

/**
 * Official API Gateway service for Moleculer
 * 
 * TODO:
 * -----
 *  - auth service call
 *  - custom errors
 *  - SSL support
 *  - multi routes
{
	
	routes: [
		{
			prefix: "/api/admin",
			auth: true,
			whitelist: []
			aliases: {}
		},
		{
			prefix: "/api/public",
			auth: false,
			whitelist: []
			aliases: {}
		},
	]
}

 * 
 * 
 */
module.exports = {

	// Service name
	name: "api-gw",

	// Version
	version: "1.0",

	// Service settings
	settings: {

		// Exposed port
		port: process.env.PORT || 4000,

		// Exposed IP
		ip: process.env.IP || "0.0.0.0",

		// Exposed path prefix
		path: "/api",

		// Whitelist of actions (array of string mask or regex)
		whitelist: [
			"posts.*",
			"users.get",
			"$node.*",
			"file.*",
			/^math\.\w+$/
		],

		authorization: true,

		// Action aliases
		aliases: {
			"POST users": "users.create",
			"add": "math.add",
			"GET sub": "math.sub",
			"POST divide": "math.div",
			"health": "$node.health"
		},

		// Folder to server assets (static files)
		assets: {
			// Root folder of assets
			folder: "./examples/www/assets",
			// Options to `server-static` module
			options: {}
		},

		// Use bodyparser module
		bodyParsers: {
			json: true,
			urlencoded: { extended: true }
		}
	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {
		this.server = http.createServer(this.httpHandler);

		/*this.server.on("connection", socket => {
			// Disable Nagle algorithm https://nodejs.org/dist/latest-v6.x/docs/api/net.html#net_socket_setnodelay_nodelay
			socket.setNoDelay(true);
		});*/

		// Create static server middleware
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

		// Create URL prefix regexp
		let path = this.settings.path || "/";
		this.urlRegex = new RegExp(path.replace("/", "\\/") + "\\/([\\w\\.\\~\\/]+)", "g");


		this.logger.info("API Gateway created!");
	},

	methods: {
		/**
		 * Send 404 response
		 * 
		 * @param {HttpRequest} req 
		 * @param {HttpResponse} res 
		 */
		send404(req, res) {
			res.writeHead(404);
			res.end("Not found");
		},

		/**
		 * HTTP request handler
		 * 
		 * @param {HttpRequest} req 
		 * @param {HttpResponse} res 
		 * @returns 
		 */
		httpHandler(req, res) {
			this.logger.debug("");
			this.logger.debug(`${req.method} ${req.url}`);

			try {
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

			} catch(err) {
				// 500
				this.logger.error("Handler error!", err);

				res.writeHead(500);
				res.end("Server error! " + err.message);				
			}
		},

		/**
		 * Call an action with broker
		 * 
		 * @param {String} actionName 	Name of action
		 * @param {HttpRequest} req 	Request object
		 * @param {HttpResponse} res 	Response object
		 * @param {Object} query		Parsed query string
		 * @returns {Promise}
		 */
		callAction(actionName, req, res, query) {
			let params = {};
			let endpoint;

			return this.Promise.resolve()

			// Resolve aliases
			.then(() => {
				if (this.hasAliases) {
					const newActionName = this.resolveAlias(actionName, req.method);
					if (newActionName !== actionName) {
						this.logger.debug(`  Alias: ${req.method} ${actionName} -> ${newActionName}`);
						actionName = newActionName;
					}
				}
			})

			// Whitelist check
			.then(() => {
				if (this.hasWhitelist) {
					if (!this.checkWhitelist(actionName)) {
						this.logger.debug(`  The '${actionName}' action is not in the whitelist!`);
						return this.Promise.reject(new CustomError("Not found", 404));
					}
				}
			})

			// Parse body
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
					});
				}
			})

			// Merge params
			.then(() => {
				params = Object.assign({}, query);
				if (_.isObject(req.body)) 
					params = Object.assign(params, req.body);
			})

			// Resolve action by name
			.then(() => {
				endpoint = this.broker.getAction(actionName);
				if (endpoint) {
					// Validate params
					if (this.broker.validator && endpoint.action.params)
						this.broker.validator.validate(params, endpoint.action.params);					
				} else {
					// Action is not available
					return Promise.reject(new ServiceNotFoundError(`Action '${actionName}' is not available!`, actionName));
				}

				return endpoint;
			})

			// Create a new context for request
			.then(endpoint => {
				this.logger.info(`  Call '${actionName}' action with params:`, params);

				const restAction = {
					name: "api.rest"
				};

				// Create a new context to wrap the request
				const ctx = this.broker.createNewContext(restAction, null, params, {
					//timeout: 5 * 1000
				});
				ctx.requestID = ctx.id;
				ctx._metricStart(ctx.metrics);
				//ctx.endpoint = endpoint;

				return ctx;
			})

			// Authorization
			.then(ctx => {
				if (this.settings.authorization) {
					const params = {
						apiKey: (query && query.apiKey) || req.headers["apikey"]
					};
					return ctx.call("auth.resolveUser", params).then(user => {
						if (user) {
							this.logger.debug("Logged in user:", user);
							ctx.meta.user = user;
						} else {
							this.logger.warn("No logged in user!");
						}

						return ctx;
					});
				}
			})

			// Call the action
			.then(ctx => {
				return ctx.call(endpoint, params)
					.then(data => {
						let contentType = "application/json";
						if (endpoint.action.responseType)
							contentType = endpoint.action.responseType;

						// Return with the response
						res.writeHead(200, { 
							"Content-type": contentType,
							"Request-Id": ctx.id
						});
						if (contentType == "application/json")
							res.end(JSON.stringify(data));
						else {
							// Convert back Buffer (Transporter & serializer convert Buffer to JSON)
							if (_.isString(data) || _.isBuffer(data)) {
								res.end(data);
							} else if (_.isObject(data) && data.type == "Buffer") {
								const buf = Buffer.from(data);
								res.end(buf);
							} else {
								const err = new CustomError("Invalid response format: " + typeof(data) + "!");
								return this.Promise.reject(err);
							}

						}

						ctx._metricFinish(null, ctx.metrics);
					});
			})

			// Error handling
			.catch(err => {				
				this.logger.error("Calling error!", err.name, ":", err.message, "\n", err.stack, "\nData:", err.data);
				
				const headers = { 
					"Content-type": "application/json"					
				};
				if (err.ctx) {
					headers["Request-Id"] = err.ctx.id;
				}

				// Return with the error
				res.writeHead(err.code || 500, headers);
				const errObj = _.pick(err, ["name", "message", "code", "data"]);
				res.end(JSON.stringify(errObj, null, 2));

				if (err.ctx)
					err.ctx._metricFinish(null, err.ctx.metrics);
			});
		},

		/**
		 * Check the action name in whitelist
		 * 
		 * @param {String} action 
		 * @returns {Boolean}
		 */
		checkWhitelist(action) {
			return this.settings.whitelist.find(mask => {
				if (_.isString(mask))
					return nanomatch.isMatch(action, mask, { unixify: false,  });
				else if (_.isRegExp(mask))
					return mask.test(action);
			}) != null;
		},

		/**
		 * Resolve alias names
		 * 
		 * @param {String} actionName 
		 * @param {string} [method="GET"] 
		 * @returns {String} Resolved actionName
		 */
		resolveAlias(actionName, method = "GET") {
			const match = method + " " + actionName;

			const res = this.settings.aliases[match] || this.settings.aliases[actionName];

			return res ? res : actionName;
		}

	},

	/**
	 * Service started lifecycle event handler
	 */
	started() {
		this.server.listen(this.settings.port, this.settings.ip, err => {
			if (err) 
				return this.logger.error("API Gateway listen error!", err);

			const addr = this.server.address();
			this.logger.info(`API Gateway listening on http://${addr.address}:${addr.port}`);
		});		
	},

	/**
	 * Service stopped lifecycle event handler
	 */
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