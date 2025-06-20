import { expectType } from "tsd";
import {
	Context,
	Service,
	ServiceBroker,
	ServiceSchema,
	ServiceSettingSchema
} from "../../../index";

type MixinMethods = {
	uppercase(text: string): string;
};

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
	settings: {
		a: 5
	},
	actions: {
		hello(ctx: Context<HelloParams>) {
			expectType<HelloParams>(ctx.params);
			expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(this);
			expectType<number | undefined>(this.settings.a);
			expectType<"adapter">(this.adapter);
			expectType<(text: string) => string>(this.uppercase);
			expectType<(text: string) => string>(this.capitalize);
		},

		hello2: {
			hooks: {
				before(ctx: Context<HelloParams>) {
					expectType<HelloParams>(ctx.params);
					expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(
						this
					);
				},
				after(ctx: Context<HelloParams>, res: undefined) {
					expectType<HelloParams>(ctx.params);
					expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(
						this
					);
				},
				error(ctx: Context<HelloParams>, err: Error) {
					expectType<HelloParams>(ctx.params);
					expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(
						this
					);
				}
			},
			handler(ctx: Context<HelloParams>) {
				expectType<HelloParams>(ctx.params);
				expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(this);
				expectType<number | undefined>(this.settings.a);
			}
		}
	},

	events: {
		"test.hello": {
			params: {
				name: "string|min:3"
			},
			handler(ctx: Context<HelloParams>) {
				expectType<HelloParams>(ctx.params);
				expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(this);
				expectType<number | undefined>(this.settings.a);
			}
		}
	},

	hooks: {
		before: {
			hello(ctx: Context<HelloParams>) {
				expectType<HelloParams>(ctx.params);
				expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(this);
				expectType<number | undefined>(this.settings.a);
			}
		}
	},

	methods: {
		capitalize(text: string): string {
			expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(this);
			expectType<number | undefined>(this.settings.a);

			return text.toUpperCase();
		}
	},

	created() {
		expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(this);
		expectType<number | undefined>(this.settings.a);
	},

	started() {
		expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(this);
		expectType<number | undefined>(this.settings.a);
	},

	stopped() {
		expectType<Service<LocalSettings> & LocalMethods & MixinMethods & LocalVars>(this);
		expectType<number | undefined>(this.settings.a);
	}
};

const broker = new ServiceBroker({ logger: false, transporter: "Fake" });
broker.createService(testService as ServiceSchema);
