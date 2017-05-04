let _ = require("lodash");
let express = require("express");
let Context = require("../src/context");
const Promise = require("bluebird");

module.exports = function() {
	return {
		name: "rest",
		settings: {
			port: 3030
		},
		
		events: {
			"register.action"(service, action, nodeID) {
				//this.logger("Action registered!");
			}
		},

		created() {
			this.app = express();
			this.logger.info("REST service created!");
		},

		started() {
			this.logger.debug("");
			this.logger.debug("--------------------------------------------------");
			this.broker.serviceRegistry.actions.forEach((actionItem, name) => {
				let path = "/" + name.replace(/\./g, "/").replace(/\$/, "~");
				console.log("Action API:", path);
				this.app.get(path, (req, res) => {
					//let ctx = new Context();
					let params = _.defaults({}, req.query, req.params, req.body);
					this.broker.call(name, params).then(data => {
						res.json(data);
					})
					.catch(err => {
						this.logger.error(err);
						res.status(500).send("Error: " + err.message);
					});
				});

				this.logger.debug("-> Registered REST path: " + path);
			});
			this.logger.debug("--------------------------------------------------\n");

			this.app.listen(this.settings.port, () => {
				this.logger.info("REST server listening on http://localhost:" + this.settings.port);
			});
		}
	};
};