# Migration guide to v0.15.x

This documentation leads you how you can migrate your project to be compatible with the Moleculer v0.15.x versions.

>Please note, the communication protocol has been changed (v4 -> v5). However all schema-based serializer has been removed from the core repo. It means v0.15 Moleculer nodes will able to communicate with v0.14 nodes, if you disable version checking in broker options: 
>```js
>// moleculer.config.js
>{
>	transit: {
>		disableVersionCheck: true
>	}
>}
>```

## Legacy event handler is removed

The legacy event handler signature (`user.created(payload, sender, eventName)`) is removed. You should use the new `Context` based signature which was introduced in version 0.14.

**Legacy event handler**

```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(payload, sender, eventName) {
            // ...
        }
    }
};
```

**Supported event handler**

```js
module.exports = {
    name: "accounts",
    events: {
        "user.created"(ctx) {
            console.log("Payload:", ctx.params);
            console.log("Sender:", ctx.nodeID);
            console.log("We have also metadata:", ctx.meta);
            console.log("The called event name:", ctx.eventName);

            // ...
        }
    }
};
```

## EventLegacy tracing export is removed

The `EventLegacy` tracing exporter is removed. Use the `Event` tracing exporter instead.

## New REPL options

In order to the REPL options can be more extensible, a new `replOptions` broker option is introduces. You can use it instead of the old `replCommands` and `replDelimiter` broker options.

**Old REPL options**
```js
// moleculer.config.js
module.exports = {
    replDelimiter: "mol # ",
    replCommands: [
		{
			command: "hello <name>",			
			action(broker, args) {
				// ...
			}
		}
	]
}
```

**New REPL options**
```js
// moleculer.config.js
module.exports = {
    replOptions: {
        delimiter: "mol # ",
        customCommands: [
            {
                command: "hello <name>",			
                action(broker, args) {
                    // ...
                }
            }
        ]
    }
}
```
> Please note, you should rename the `replCommands` property to `customCommands`, as well.

## New action streaming

The built-in `Stream` sending has been rewritten. Now it accepts `params` besides the `Stream` instance.
The `Stream` parameter moved from `ctx.params` into calling options under a `stream` property.

### Old way to send a stream with extra parameters
The `ctx.params` is not available, because it contains the stream instance. For more properties you had to use `meta`.

```js
ctx.call("file.save", fs.createReadStream(), { meta: { filename: "as.txt" }});
```

### New way to send a stream with extra parameters
The stream instance is passed as a calling options, so you can use `ctx.params` as a normal action call.

```js
ctx.call("file.save", { filename: "as.txt" }, { stream: fs.createReadStream() });
```

### Old way to receive a stream

```js
// file.service.js
module.exports = {
    name: "file",
    actions: {
        save(ctx) {
            const stream = ctx.params;
            const s = fs.createWriteStream(ctx.meta.filename);
            stream.pipe(s);
        }
    }
};
```

### New way to receive a stream

```js
// file.service.js
module.exports = {
    name: "file",
    actions: {
        save(ctx) {
            // The stream is in Context directly
            const stream = ctx.stream;
            const s = fs.createWriteStream(ctx.params.filename);
            stream.pipe(s);
        }
    }
};
```
## Removed deprecated event sending method signature

In previous versions, the `emit`, `broadcast` and `broadcastLocal` methods accept a group `String` or groups as `Array<String>` as third arguments, instead of an `opts`.
This signature is removed, you should always pass an `opts` object as 3rd argument.

**Deprecated way**

```js
broker.emit("user.created", { id: 5 }, ["mail"]);
```

**Supported way**

```js
broker.emit("user.created", { id: 5 }, { groups: ["mail"] });
```

## Removed deprecated middleware as a `Function`
We removed and old and deprecated middleware signature where the middleware was `localAction` function. Now `ServiceBroker` accepts middleware as `Object` only.

**Deprecated middleware**
```js
// moleculer.config.js
module.exports = {
    middlewares: [
        function(handler) {
            // My logic
        }
    ]
}
```

**Supported middleware**
```js
// moleculer.config.js
module.exports = {
    middlewares: [
        {
            name: "MyMiddleware",
            localAction(handler) {
                // My logic
            }
        }
    ]
}
```
## Rewritten Kafka transporter (based on kafkajs)

The previous `kafka-node` based transporter has been rewritten to a `kafkajs` based transporter. It means, you should migrate your Kafka Transporter options.

```js
// moleculer.config.js
module.exports = {
    transporter: {
        type: "Kafka",
        options: {
            // KafkaClient options. More info: https://kafka.js.org/docs/configuration
            client: {
                brokers: [/*...*/]
            },

            // KafkaProducer options. More info: https://kafka.js.org/docs/producing#options
            producer: {},

            // ConsumerGroup options. More info: https://kafka.js.org/docs/consuming#a-name-options-a-options
            consumer: {},

            // Advanced options for `send`. More info: https://kafka.js.org/docs/producing#producing-messages
            publish: {},

            // Advanced message options for `send`. More info: https://kafka.js.org/docs/producing#message-structure
            publishMessage: {
                partition: 0
            }
        }
    }
}
```

About new configuration options, check this documentation: https://kafka.js.org/docs/configuration

## The Fastest Validator options changed.

In 0.15 the `useNewCustomCheckFunction` default value is changed from `false` to `true`. It means, if you have old custom checker function in your parameter validation schemas, you should rewrite it to the new custom check function form.

You can see example about migration here: https://github.com/icebob/fastest-validator/blob/master/CHANGELOG.md#new-custom-function-signature
