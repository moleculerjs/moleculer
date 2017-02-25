const fs = require("fs");
const path = require("path");
const http = require("http");

const Promise = require("bluebird");
const url = require("url");
const queryString = require("querystring");
const IO = require("socket.io");

const mimetypes = {
	"html": "text/html",
	"css": "text/css",
	"js": "text/javascript",
	"png": "image/png",
	"jpg": "image/jpeg"
};

module.exports = function() {
	return {
		name: "www",
		settings: {
			port: 3300
		},
		
		created() {
			this.server = http.createServer(this.httpHandler);
			this.logger.info("WWW service created!");
			this.io = IO(this.server);

			this.io.on("connection", socket => {
				socket.onevent = packet => {
					const [event, payload] = packet.data;
					this.logger.debug("Incoming event from websocket", packet.data);
					this.broker.emit(event, payload);
				};
			});
		},

		events: {
			"**"(data, event) {
				if (this.io) {
					this.logger.debug(`Send '${event}' event to client`);
					this.io.emit("event", event, data);
				}
			}
		},

		methods: {
			httpHandler(req, res) {
				let params = {};
				this.logger.debug("URL: ", req.url);
				const { pathname, query } = url.parse(req.url);

				if (query) {
					params = queryString.parse(query);
				}

				const actionRe = /\/api\/([\w\.\~\/]+)/g;
				const match = actionRe.exec(pathname);

				if (match) {
					// Call action with broker
					const actionName = match[1].replace(/~/, "$").replace(/\//g, ".");

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

				// Serve static files from `assets` folder
				const assetsFolder = path.join(__dirname, "www", "assets");
				const fileName = path.join(assetsFolder, pathname == "/" ? "index.html" : pathname);
				if (fs.existsSync(fileName)) {
					fs.readFile(fileName, (err, data) => {
						if (err) {
							res.writeHead(500, { "Content-type": "text/plain"});
							res.end(err.message);						
							return;
						}

						res.writeHead(200, { "Content-type": mimetypes[path.parse(fileName).ext.substring(1)] || "text/plain"});
						res.write(data);
						res.end();
					});
					return;
				}

				res.writeHead(404, { "Content-type": "text/plain"});
				res.end("Path not found");

			}
		},

		started() {
			this.server.listen(this.settings.port, err => {
				if (err) 
					return this.logger.error("WW server listen error!", err);

				this.logger.info("Listening on http://localhost:" + this.settings.port);
			});
		}
	};
};