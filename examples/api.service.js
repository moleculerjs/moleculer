/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const http 				= require("http");
const https 			= require("https");
const queryString 		= require("querystring");

const _ 				= require("lodash");
const bodyParser 		= require("body-parser");
const serveStatic 		= require("serve-static");
const nanomatch  		= require("nanomatch");

const { ServiceNotFoundError, CustomError } 	= require("../src/errors");

/**
 * Official API Gateway service for Moleculer
 * 
 * Example settings:
 * 
 * 	settings: {
 * 
 * 		// Exposed port
 * 		port: process.env.PORT || 4000,
 * 
 * 		// Exposed IP
 * 		ip: process.env.IP || "0.0.0.0",
 * 
 * 		// HTTPS server with certificate
 * 		https: {
 * 			key: fs.readFileSync("examples/www/ssl/key.pem"),
 * 			cert: fs.readFileSync("examples/www/ssl/cert.pem")
 * 		},
 * 
 * 		// Exposed path prefix
 * 		path: "/api",
 * 
 * 		routes: [
 * 			{
 * 				// Path prefix to this route
 * 				path: "/admin",
 * 
 * 				// Whitelist of actions (array of string mask or regex)
 * 				whitelist: [
 * 					"users.get",
 * 					"$node.*"
 * 				],
 * 
 * 				authorization: true,
 * 
 * 				// Action aliases
 * 				aliases: {
 * 					"POST users": "users.create",
 * 					"health": "$node.health"
 * 				},
 * 
 * 				// Use bodyparser module
 * 				bodyParsers: {
 * 					json: true,
 * 					urlencoded: { extended: true }
 * 				}
 * 			},
 * 
 * 			{
 * 				// Path prefix to this route
 * 				path: "",
 * 
 * 				// Whitelist of actions (array of string mask or regex)
 * 				whitelist: [
 * 					"posts.*",
 * 					"file.*",
 * 					/^math\.\w+$/
 * 				],
 * 
 * 				authorization: false,
 * 
 * 				// Action aliases
 * 				aliases: {
 * 					"add": "math.add",
 * 					"GET sub": "math.sub",
 * 					"POST divide": "math.div",
 * 				},
 * 
 * 				// Use bodyparser module
 * 				bodyParsers: {
 * 					json: true,
 * 					urlencoded: { extended: true }
 * 				}
 * 
 * 			}
 * 		],
 * 
 * 		// Folder to server assets (static files)
 * 		assets: {
 * 			// Root folder of assets
 * 			folder: "./examples/www/assets",
 * 			// Options to `server-static` module
 * 			options: {}
 * 		}
 * 
 * 	}
 * 
 * 
 * 
 */
module.exports = {

	// Service name
	name: "api-gw",

	// Version
	version: "1.0",

	// Default settings
	settings: {

		// Exposed port
		port: process.env.PORT || 3000,

		// Exposed IP
		ip: process.env.IP || "0.0.0.0",

		routes: [
			{
				// Path prefix to this route
				path: "/"
			}			
		]

	},

	/**
	 * Service created lifecycle event handler
	 */
	created() {

		// Create HTTP or HTTPS server
		if (this.settings.https && this.settings.https.key && this.settings.https.cert) {
			this.server = https.createServer(this.settings.https, this.httpHandler);
			this.isHTTPS = true;
		} else
			this.server = http.createServer(this.httpHandler);

		/*this.server.on("connection", socket => {
			// Disable Nagle algorithm https://nodejs.org/dist/latest-v6.x/docs/api/net.html#net_socket_setnodelay_nodelay
			socket.setNoDelay(true);
		});*/

		// Create static server middleware
		if (this.settings.assets) {
			const opts = this.settings.assets.options || {};
			opts.fallthrough = false;
			this.serve = serveStatic(this.settings.assets.folder, opts);
		}

		// Process routes
		if (Array.isArray(this.settings.routes)) {
			this.routes = this.settings.routes.map(route => this.createRoute(route));
		}

		console.log(this.settings.routes);

		this.logger.info("API Gateway created!");
	},

	methods: {

		/**
		 * Create route object from options
		 * 
		 * @param {Object} opts 
		 * @returns {Object}
		 */
		createRoute(opts) {
			let route = {
				opts,
				authorization: opts.authorization
			};
			// Handle whitelist
			route.whitelist = opts.whitelist;
			route.hasWhitelist = Array.isArray(route.whitelist);

			// Handle aliases
			route.aliases = opts.aliases;
			route.hasAliases = route.aliases && Object.keys(route.aliases).length > 0;

			// Create body parsers
			if (opts.bodyParsers) {
				const bps = opts.bodyParsers;
				const parsers = [];
				Object.keys(bps).forEach(key => {
					const opts = _.isObject(bps[key]) ? bps[key] : undefined;
					if (bps[key] !== false)
						parsers.push(bodyParser[key](opts));
				});

				route.parsers = parsers;
			}

			// Create URL prefix regexp
			route.path = (this.settings.path || "") + (opts.path || "");
			route.path = route.path || "/";

			//route.urlRegex = new RegExp(route.path.replace("/", "\\/") + "\\/([\\w\\.\\~\\/]+)", "g");

			return route;
		},

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
				if (this.routes && this.routes.length > 0) {
					for(let i = 0; i < this.routes.length; i++) {
						const route = this.routes[i];
						/*
						this.urlRegex.lastIndex = 0;
						const match = this.urlRegex.exec(url);
						if (match) {
						*/
						if (url.startsWith(route.path)) {
							// Resolve action name
							//let actionName = match[1].replace(/~/, "$").replace(/\//g, ".");
							let actionName = url.slice(route.path.length);
							if (actionName.startsWith("/"))
								actionName = actionName.slice(1);

							actionName = actionName.replace(/~/, "$").replace(/\//g, ".");

							return this.callAction(route, actionName, req, res, query);
						} 
					}
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
		 * @param {Object} route 		Route options
		 * @param {String} actionName 	Name of action
		 * @param {HttpRequest} req 	Request object
		 * @param {HttpResponse} res 	Response object
		 * @param {Object} query		Parsed query string
		 * @returns {Promise}
		 */
		callAction(route, actionName, req, res, query) {
			let params = {};
			let endpoint;

			return this.Promise.resolve()

			// Resolve aliases
			.then(() => {
				if (route.hasAliases) {
					const newActionName = this.resolveAlias(route, actionName, req.method);
					if (newActionName !== actionName) {
						this.logger.debug(`  Alias: ${req.method} ${actionName} -> ${newActionName}`);
						actionName = newActionName;
					}
				}
			})

			// Whitelist check
			.then(() => {
				if (route.hasWhitelist) {
					if (!this.checkWhitelist(route, actionName)) {
						this.logger.debug(`  The '${actionName}' action is not in the whitelist!`);
						return this.Promise.reject(new CustomError("Not found", 404));
					}
				}
			})

			// Parse body
			.then(() => {
				
				if (["POST", "PUT", "PATCH"].indexOf(req.method) !== -1 && route.parsers.length > 0) {
					return this.Promise.mapSeries(route.parsers, parser => {
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
				if (route.authorization) {
					const params = {
						apiKey: (query && query.apiKey) || req.headers["apikey"]
					};
					return ctx.call("auth.resolveUser", params).then(user => {
						if (user) {
							this.logger.debug("Logged in user:", user);
							ctx.meta.user = user;
						} else {
							this.logger.warn("No logged in user!");
							return Promise.reject(new CustomError("Forbidden", 403));
						}

						return ctx;
					});
				}
				return ctx;
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
		 * @param {Object} route 
		 * @param {String} action 
		 * @returns {Boolean}
		 */
		checkWhitelist(route, action) {
			return route.whitelist.find(mask => {
				if (_.isString(mask))
					return nanomatch.isMatch(action, mask, { unixify: false,  });
				else if (_.isRegExp(mask))
					return mask.test(action);
			}) != null;
		},

		/**
		 * Resolve alias names
		 * 
		 * @param {Object} route 
		 * @param {String} actionName 
		 * @param {string} [method="GET"] 
		 * @returns {String} Resolved actionName
		 */
		resolveAlias(route, actionName, method = "GET") {
			const match = method + " " + actionName;

			const res = route.aliases[match] || route.aliases[actionName];

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
			this.logger.info(`API Gateway listening on ${this.isHTTPS ? "https" : "http"}://${addr.address}:${addr.port}`);
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