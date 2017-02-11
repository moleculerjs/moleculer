const _ = require("lodash");
const http = require("http");
const Context = require("../src/context");
const Promise = require("bluebird");
const url = require("url");
const queryString = require('querystring');

module.exports = function() {
	return {
		name: "www",
		settings: {
			port: 3300
		},
		
		created() {
			this.server = http.createServer(this.httpHandler);
			this.logger.info("WWW service created!");
		},

		methods: {
			httpHandler(req, res) {
				let params = {};
				this.logger.info("URL: ", req.url);
				const { pathname, query } = url.parse(req.url);

				if (pathname == "/") {
					res.writeHead(200, { "Content-type": "text/plain"});
					res.end("Hello Servicer");
				}


				if (query) {
					params = queryString.parse(query);
				}

				const actionRe = /\/api\/([\w\.\~]+)/g;
				const match = actionRe.exec(pathname);

				if (match) {
					const actionName = match[1].replace(/~/, "$");

					this.logger.info(`Call '${actionName}' action with params:`, params);

					return this.broker.call(actionName, params).then(data => {
						res.writeHead(200, { "Content-type": "application/json"});
						res.end(JSON.stringify(data));						
					})
					.catch(err => {
						this.logger.error(err);
						res.writeHead(500, { "Content-type": "text/plain"});
						res.end(err.message);						
					});
				}

				res.writeHead(404, { "Content-type": "text/plain"});
				res.end("Path not found");

			}
		},

		started() {
			this.server.listen(this.settings.port, err => {
				if (err) 
					return this.logger.error("WW server listen error!", err);

				this.logger.info("WWW server listening on http://localhost:" + this.settings.port);
			});
		}
	};
};