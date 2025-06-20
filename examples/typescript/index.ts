import { ServiceBroker, Service, Context, ServiceSchema, ServiceSettingSchema } from "../../";
import type { MixinMethods } from "./mixin";
import myMixin from "./mixin";

const broker = new ServiceBroker({
	nodeID: "node-1",
	logger: true,
	logLevel: "info",
	middlewares: [
		{
			localAction(next, action) {
				return ctx => {
					this.logger.info("Local action middleware", action.name);
					return next(ctx);
				};
			}
		}
	]
});

interface LocalMethods {
	capitalize(text: string): string;
}

interface LocalSettings extends ServiceSettingSchema {
	a?: number;
}

interface HelloParams {
	name: string;
}

interface LocalVars {
	adapter: "adapter";
}

const testService: ServiceSchema<LocalSettings, MixinMethods & LocalMethods, LocalVars> = {
	name: "test",
	mixins: [myMixin],
	settings: {
		a: 5
	},
	actions: {
		hello(ctx: Context<HelloParams>) {
			return `Hello ${this.uppercase(ctx.params.name)} from ${this.capitalize(this.name)} on ${this.broker.nodeID}`;
		},

		hello2: {
			hooks: {
				before(ctx: Context<HelloParams>) {
					console.log(
						`Before action hook for action 'hello2' with name ${this.uppercase(ctx.params.name)}`
					);
				},
				after(ctx: Context<HelloParams>, res: undefined) {
					console.log(
						`After action hook for action 'hello2' with name ${this.uppercase(ctx.params.name)}`
					);
					return true;
				}
			},
			handler(ctx: Context<HelloParams>) {
				return `Hello2 ${this.uppercase(ctx.params.name)} from ${this.capitalize(this.name)} on ${this.broker.nodeID}`;
			}
		}
	},

	events: {
		"test.hello": {
			params: {
				name: "string|min:3"
			},
			handler(ctx: Context<HelloParams>) {
				console.log(
					`Event received: Hello ${this.uppercase(ctx.params.name)} from ${this.capitalize(this.name)} on ${this.broker.nodeID}`
				);
				console.log("Adapter:", this.adapter);
			}
		}
	},

	hooks: {
		before: {
			hello(ctx: Context<HelloParams>) {
				console.log(
					`Before service hook for action 'hello' with name ${this.uppercase(ctx.params.name)}`
				);
			}
		}
	},

	methods: {
		capitalize(text: string): string {
			return this.uppercase(text.charAt(0)) + text.slice(1);
		}
	},

	created() {
		console.log(
			`Service ${this.capitalize(this.name)} created on node ${this.uppercase(this.broker.nodeID)}`,
			this.settings.a
		);
	},

	started() {
		console.log(
			`Service ${this.capitalize(this.name)} started on node ${this.uppercase(this.broker.nodeID)}`,
			this.settings.a
		);
		this.adapter = "adapter"; // Example of setting a local variable
	},

	stopped() {
		console.log(
			`Service ${this.capitalize(this.name)} stopped on node ${this.uppercase(this.broker.nodeID)}`,
			this.settings.a
		);
	}
};

broker.createService(testService as ServiceSchema);

broker
	.start()
	.then(async () => {
		const res = await broker.call<string, HelloParams>("test.hello", { name: "John" });
		console.log(res);
		await broker.stop();
	})
	.catch(err => {
		console.error("Error starting broker:", err);
	});
