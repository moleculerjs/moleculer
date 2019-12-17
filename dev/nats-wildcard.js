const ServiceBroker = require("../src/service-broker");

const broker = new ServiceBroker({
    nodeID: "broker-1",
    transporter: {
        type: "NATS"
    },
    metrics: true,
    logLevel: "debug",
    disableBalancer: true
});

broker.createService({
    name: "test",

    events: {
        "config.site.**.changed": (payload) => {broker.logger.info(payload)},
        "config.mail.**.changed": () => {},
        "config.accounts.**.changed": () => {},
    }
});

async function start() {
    await broker.start();

    broker.repl();

    setInterval(async () => {
        await broker.emit('config.site.test.changed', {data: 123})
    }, 1000)
}

start();