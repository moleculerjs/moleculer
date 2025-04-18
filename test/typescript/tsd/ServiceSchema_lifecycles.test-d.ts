import {expectAssignable, expectType} from "tsd";
import {
	Service, ServiceAsyncLifecycleHandler,
	ServiceBroker,
	ServiceSchema,
	ServiceSettingSchema,
	ServiceSyncLifecycleHandler
} from "../../../index";

const broker = new ServiceBroker({ logger: false, transporter: "Fake" });

class TestService1 extends Service {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: "test1",
			created() {},
			async started() {},
			async stopped() {}
		});
	}
}

class TestService2 extends Service {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: "test2",
			created() {},
			started() {},
			stopped() {}
		});
	}
}

class TestService3 extends Service {
	constructor(broker: ServiceBroker) {
		super(broker);

		this.parseServiceSchema({
			name: "test3",
			created: [() => {}, () => {}],
			started: [async () => {}, () => {}],
			stopped: [async () => {}, () => {}]
		});
	}
}

interface TestService4SettingSchema {
	testService4Setting: string;
}

const testService4Schema: ServiceSchema<TestService4SettingSchema> = {
	name: "test4",
	settings: {
		testService4Setting: "testService4"
	},
}

interface TestService5Methods {
	testService5Method: () => void;
}


interface TestService5SettingSchema {
	testService5Setting: string;
}

interface TestService5This extends Service<TestService5SettingSchema>, TestService5Methods {}

const testService5Schema: ServiceSchema<TestService5SettingSchema, TestService5This> = {
	name: "test5",
	settings: {
		testService5Setting: "testService5"
	},
	methods: {
		testsService5Method: () => {},
	}
}


const testService1 = new TestService1(broker);
expectType<ServiceSchema>(testService1.schema);

const testService2 = new TestService2(broker);
expectType<ServiceSchema>(testService2.schema);

const testService3 = new TestService3(broker);
expectType<ServiceSchema>(testService3.schema);

// Ensure that the lifecycle handlers are typed correctly when "This" type is not provided to service schema type
expectType<
	ServiceSyncLifecycleHandler<Service<TestService4SettingSchema>> |
	ServiceSyncLifecycleHandler<Service<TestService4SettingSchema>>[] |
	undefined
>(testService4Schema.created)
expectType<
	ServiceAsyncLifecycleHandler<Service<TestService4SettingSchema>> |
	ServiceAsyncLifecycleHandler<Service<TestService4SettingSchema>>[] |
	undefined
>(testService4Schema.started)
expectType<
	ServiceAsyncLifecycleHandler<Service<TestService4SettingSchema>> |
	ServiceAsyncLifecycleHandler<Service<TestService4SettingSchema>>[] |
	undefined
>(testService4Schema.stopped)

// Ensure that the lifecycle handlers are typed correctly when "This" type is provided to service schema type
expectType<
	ServiceSyncLifecycleHandler<TestService5This> |
	ServiceSyncLifecycleHandler<TestService5This>[] |
	undefined
>(testService5Schema.created)
expectType<
	ServiceAsyncLifecycleHandler<TestService5This> |
	ServiceAsyncLifecycleHandler<TestService5This>[] |
	undefined
>(testService5Schema.started)
expectType<
	ServiceAsyncLifecycleHandler<TestService5This> |
	ServiceAsyncLifecycleHandler<TestService5This>[] |
	undefined
>(testService5Schema.stopped)
