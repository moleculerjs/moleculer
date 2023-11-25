class NativeService {
	constructor(broker) {
		this.broker = broker;
	}
}

module.exports = NativeService;

class MyService extends NativeService {
	// Service name
	name = "my-service";
	// Service version
	version = 1;
	// Service dependencies
	dependencies = ["posts", "users"];
	// Service settings
	settings = {
		foo: "bar"
	};
	// Service metadata
	metadata = {
		a: 5
	};
	// Action Hook
	hooks = {
		before: {
			create: ["validate"]
		},
		after: {
			create: ["afterCreate"]
		}
	};

	// --- ACTIONS ---

	// Action definition
	actionCreateUser = {
		name: "createUser",
		visibility: "published",
		params: {
			username: "string",
			password: "string"
		},
		handler: "createUser", // The name of action handler method, can be omitted if the same as `name`
		asyncCtx: true // The handler method will be called with `ctx.params` as first argument. If you need the `ctx` you can get is from AsyncStorage
	};
	// Action handler
	async createUser(params) {
		await this.myMethod(params);
		return params.user;
	}

	// Minimal Action definition, the `name` and handler function name are came from property name without "action" prefix.
	actionListUsers = {};
	async listUsers(ctx) {
		return this.adapter.find();
	}

	// --- EVENTS ---

	// Event definition
	eventUserCreated = {
		name: "user.created",
		group: "user",
		handler: "userCreated" // The name of event handler method, can be omitted if the same as `name`
	};

	// Event handler
	userCreated(ctx) {
		this.myMethod();
	}

	// Methods
	myMethod(params) {
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
