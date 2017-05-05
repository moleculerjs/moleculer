/*
 * moleculer
 * Copyright (c) 2017 Ice Services (https://github.com/ice-services/moleculer)
 * MIT Licensed
 */

"use strict";

const path = require("path");
const http = require("http");

//const url = require("url");
const _ = require("lodash");
const queryString = require("querystring");
const bodyParser = require("body-parser");
const mimeTypes = require("mime-types");
const serveStatic = require("serve-static");

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

		// TODO: Whitelist of actions
		whitelist: [
			"posts.*",
			"users.get"
		],

		// TODO: Action aliases
		aliases: {
			"POST users": "users.create"
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
		bodyParser: true
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


		// Create URL regexp
		let path = this.settings.path || "/";
		this.urlRegex = new RegExp(path.replace("/", "\\/") + "\\/([\\w\\.\\~\\/]+)", "g");


		this.logger.info("API Gateway created!");
	},

	methods: {

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
			const match = this.urlRegex.exec(url);
			if (match) {
				this.logger.info("URL path is a valid action call! Match:", match[1]);
				this.logger.info("Query:", query);

				const actionName = match[1].replace(/~/, "$").replace(/\//g, ".");

				let params = Object.assign({}, query);

				this.logger.info(`Call '${actionName}' action with params:`, params);

				return this.broker.call(actionName, params)
					.then(data => {
						res.writeHead(200, { "Content-type": "application/json"});
						res.end(JSON.stringify(data));						
					})
					.catch(err => {
						this.logger.error(err);
						res.writeHead(err.code || 500, { "Content-type": "text/plain"});
						res.end(err.message);						
					});
			} 

			if (this.serve) {
				this.serve(req, res, err => {
					this.logger.info(err);
					res.writeHead(404);
					res.end("File not found");					

				});
				return;
			} 

			// 404
			res.writeHead(404);
			res.end("Path not found");
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