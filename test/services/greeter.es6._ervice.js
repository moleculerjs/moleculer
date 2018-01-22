/**
 * IT IS NOT WORKING WITH THE LATEST JEST VERSION
 *
 */
const Service = require("../../src/service");

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
			created: this.serviceCreated,
			started: this.serviceStarted,
			stopped: this.serviceStopped,
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

	serviceCreated() {
		this.logger.info("ES6 Service created.");
	}

	serviceStarted() {
		this.logger.info("ES6 Service started.");
	}

	serviceStopped() {
		this.logger.info("ES6 Service stopped.");
	}
}

module.exports = GreeterService;
