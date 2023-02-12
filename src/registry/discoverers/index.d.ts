import BaseDiscoverer = require("./base");
import LocalDiscoverer = require("./local");
import Etcd3Discoverer = require("./etcd3");
import RedisDiscoverer = require("./redis");

export {
	BaseDiscoverer as Base,
	LocalDiscoverer as Local,
	Etcd3Discoverer as Etcd3,
	RedisDiscoverer as Redis
};
