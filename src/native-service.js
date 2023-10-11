class NativeService {
	constructor(broker) {
		this.broker = broker;
	}
}

module.exports = NativeService;

class MyService extends NativeService {
	// Service name
	static name = "my-service";
	// Service version
	static version = 1;
	// Service dependencies
	static dependencies = ["posts", "users"];
	// Service settings
	static settings = {
		foo: "bar"
	};
	// Service metadata
	static metadata = {
		a: 5
	};
	// Action Hook
	static hooks = {
		before: {
			create: ["validate"]
		},
		after: {
			create: ["afterCreate"]
		}
	};

	// --- ACTIONS ---

	// Action definition
	static actionCreateUser = {
		name: "createUser",
		visibility: "published",
		params: {
			username: "string",
			password: "string"
		},
		handler: "createUser" // The name of action handler method, can be omitted if the same as `name`
	};

	// Action handler
	async createUser(ctx) {
		await this.#myMethod(ctx.params);
		return ctx.params.user;
	}

	// --- EVENTS ---

	// Event definition
	static eventUserCreated = {
		name: "user.created",
		group: "user",
		handler: "userCreated" // The name of event handler method, can be omitted if the same as `name`
	};

	// Event handler
	userCreated(ctx) {
		this.#myMethod();
	}

	// Methods
	#myMethod(params) {
		this.broker.info("Params:", params);
	}

	// Lifecycle handlers with dedicated method names

	created() {
		this.logger.info("Service created!");
	}

	async started() {
		this.logger.info("Service started!");
	}

	async stopped() {
		this.logger.info("Service stopped!");
	}
}
