"use strict";

module.exports = {
	name: "file",
	actions: {
		html: {
			responseType: "text/html",
			handler() {
				return `
<html>
<body>
	<h1>Hello API Gateway!</h1>
	<img src="/api/file.image" />
</body>
</html>
				`;
			}
		}
	}
};
