import { ServiceBroker, Service, Context, ServiceSchema, ServiceSettingSchema } from "../../";
import type { MixinMethods } from "./mixin";
import myMixin from "./mixin";

const broker = new ServiceBroker({
	nodeID: "node-1",
	logger: true,
	logLevel: "info"
});

interface LocalMethods {
	capitalize(text: string): string;
}

interface LocalSettings extends ServiceSettingSchema {
	a?: number
};

type TestThis = Service<LocalSettings> & MixinMethods & LocalMethods;

interface HelloParams {
	name: string;
}

const testService: ServiceSchema<LocalSettings, TestThis> = {
	name: "test",
	mixins: [myMixin],
	settings: {
		a: 5
	},
	actions: {
		hello(this: TestThis, ctx: Context<HelloParams>) {
			return `Hello ${this.uppercase(ctx.params.name)} from ${this.capitalize(this.name)} on ${this.broker.nodeID}`;
		},

		hello2: {
			handler(this: TestThis, ctx: Context<HelloParams>) {
				return `Hello2 ${this.uppercase(ctx.params.name)} from ${this.capitalize(this.name)} on ${this.broker.nodeID}`;
			}
		}
	},

	events: {
		"test.hello": {
			handler(this: TestThis, ctx: Context<HelloParams>) {
				console.log(`Event received: Hello ${this.uppercase(ctx.params.name)} from ${this.capitalize(this.name)} on ${this.broker.nodeID}`);
			}
		}
	},

	methods: {
		capitalize(text: string): string {
			return this.uppercase(text.charAt(0)) + text.slice(1);
		}
	},

	created() {
		console.log(`Service ${this.capitalize(this.name)} created on node ${this.uppercase(this.broker.nodeID)}`, this.settings.a);
	},

	started() {
		console.log(`Service ${this.capitalize(this.name)} started on node ${this.uppercase(this.broker.nodeID)}`, this.settings.a);
	},

	stopped() {
		console.log(`Service ${this.capitalize(this.name)} stopped on node ${this.uppercase(this.broker.nodeID)}`, this.settings.a);
	}
};

broker.createService(testService);


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
