import {expectType} from "tsd";
import {
	Service,
	ServiceBroker,
	ServiceSchema
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

const testService5Schema: ServiceSchema<TestService5SettingSchema, TestService5Methods> = {
	name: "test5",
	settings: {
		testService5Setting: "testService5"
	},
	methods: {
		testsService5Method() {
			expectType<Service<TestService5SettingSchema> & TestService5Methods & Record<string, any>>(this);
			expectType<TestService5SettingSchema>(this.settings);
			expectType<string>(this.settings.testService5Setting);
		}
	}
}


const testService1 = new TestService1(broker);
expectType<ServiceSchema>(testService1.schema);

const testService2 = new TestService2(broker);
expectType<ServiceSchema>(testService2.schema);

const testService3 = new TestService3(broker);
expectType<ServiceSchema>(testService3.schema);

