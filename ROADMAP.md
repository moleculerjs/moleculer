# Roadmap

## v0.9.x
- [x] multi broker.call (array & object)
- [x] namespace support
- [ ] better custom logger support
- [x] service hot-reload
------------------------------

## v0.10.x
- [ ] broker plugin system (adopt middleware feature)
- [ ] official Zipkin tracer service
- [ ] add lru features to Memory and Redis cachers
- [ ] official services
	- [ ] `moleculer-auth` for authentication
	- [ ] `moleculer-twitter` Twitter client
	- [ ] `moleculer-slack` Slack client
	- [ ] `moleculer-stripe`
	- [ ] `moleculer-agenda` Job runner
- [ ] more DB adapter
	- [ ] mongo
	- [ ] sql
- [ ] key-value store adapter
	- [ ] couchdb
	- [ ] couchbase
	- [ ] dynamodb
	- [ ] redis

------------------------------

## v1.0.x
It will be the first stable production-ready release. Afterwards the version numbers should follow semver versioning.

- [ ] more [offical examples](https://github.com/ice-services/moleculer-examples)

## Others in the future
- [ ] Docker examples
- [ ] RabbitMQ transporter
- [ ] Official monitoring solution
- [ ] compress transfer
- [ ] crypt transfer


### Other transporters
- TCP with UDP
- websocket
- [AutobahnJS](http://autobahn.ws/js/) [server](https://github.com/Orange-OpenSource/wamp.rt) or [server in go](https://github.com/jcelliott/turnpike)

