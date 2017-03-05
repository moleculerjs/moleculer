# Roadmap

## v0.7.x
* Dynamic & reduced request timeout. Reduce the original time in subcalls.
* official API gateway service
* improve remote call performance

* metricsRate: doesn't measure every request
* handleExceptions: true option
	Catch unhandled exceptions and send an event with details. Can be catch in metrics, alert or logger services
* move heart-beat handling to `Transit` class.
* pluggable serializer for transport
	- JSON parse/stringify
	- [PSON](https://github.com/dcodeIO/PSON)
	- [Avro](https://github.com/mtth/avsc)
* more [offical examples](https://github.com/ice-services/moleculer-examples)

## v0.8.x
* direct remote call to a specified node (for monitoring every node)
* multi broker.call (array params & returns with array result )
* official Zipkin tracer service
* RabbitMQ transporter
* create a multi-pages docs & generate a static site from it.
	* https://github.com/segmentio/metalsmith
* create d.ts file
* add lru features to Memory and Redis cachers

## v1.0.x
It will be the first stable release. From it we follow semver versioning.

## Others in the future

### Gobal configuration
Every service can get the config from the broker (in constructor).
The result is a merged configuration from the common & the specified service config.
```js
{
	common: {
		port: 3000,
		db: {
			uri: "mongo://localhost"
		}
	},

	services: {
		posts: {
			db: {
				uri: "couchdb://localhost"
			}
		}
	}
}
```
In this case, if `posts` service asks the config, it'll get 
```js
{
	port: 3000,
	db: {
		uri: "couchdb://localhost"
	}
}
```

### Other transporters
- websocket
- [AutobahnJS](http://autobahn.ws/js/) [server](https://github.com/Orange-OpenSource/wamp.rt) or [server in go](https://github.com/jcelliott/turnpike)
- add gzip support

### Service dependency
Wait for all dependent service will be available. After it, call the `started` event handler of service.
[example](http://www.slideshare.net/adriancockcroft/microservices-whats-missing-oreilly-software-architecture-new-york#24)

### Custom fast validator
```js
	const v = require("...");
	get: {
		params: v({
			id: { type: "number", req: true, min: 0, max: 100 },
			name: { type: "string", min: 0, max: 128 }
			settings: { type: "object", props: {
				notify: { type: ["boolean", "object" ] } // 2 accepted type: Boolean or Object
			}},
			roles: { type: "array", items: { type: "enum", enums: ["admin", "user"]),
			email: { type: "email", req: true },
			homepage: { type: "regex", pattern:/asd/gi }
		}
	}
```

	- https://github.com/aldeed/meteor-simple-schema
	- https://github.com/semisleep/simple-vue-validator/blob/master/src/rule.js

### CLI helper tool
Create a command line tool to generate Moleculer project & modules.

* `moleculer init` - create an empty Moleculer based project with sample code
	* prompts for transporter, cacher, metrics, stats options
* `moleculer add service` - create a new empty service. Ask name and version of service, action names.

* `moleculer add middleware` - create a new empty middleware.

	- https://github.com/sboudrias/Inquirer.js
	- https://github.com/tj/consolidate.js
	- https://github.com/mattallty/Caporal.js
	- https://github.com/tj/ngen 
