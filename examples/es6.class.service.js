const Service = require("../src/service");

class GreeterService extends Service {

	constructor(broker) {
		super(broker);

		this._processSchema({
			name: "greeter",
			version: "v2",
			meta: {
				scalable: true
			},
			// dependencies: [
			// 	"auth",
			// 	"users"
			// ],

			settings: {
				upperCase: true
			},
			actions: {
				hello: this.hello,
				welcome: {
					cache: {
						keys: ["name"]
					},
					params: {
						name: "string"
					},
					handler: this.welcome
				}
			},
			events: {
				"user.created": this.userCreated
			},
			created: this.created,
			started: this.started,
			stopped: this.stopped,
		});
	}

	// Action handler
	hello() {
		return "Hello Moleculer";
	}

	// Action handler
	welcome(ctx) {
		return this.sayWelcome(ctx.params.name);
	}

	// Private method
	sayWelcome(name) {
		this.logger.info("Say hello to", name);
		return `Welcome, ${this.settings.upperCase ? name.toUpperCase() : name}`;
	}

	// Event handler
	userCreated(user) {
		this.broker.call("mail.send", { user });
	}

	created() {
		this.logger.info("ES6 Service created.");
	}

	started() {
		this.logger.info("ES6 Service started.");
	}

	stopped() {
		this.logger.info("ES6 Service stopped.");
	}
}

module.exports = broker => new GreeterService(broker);
