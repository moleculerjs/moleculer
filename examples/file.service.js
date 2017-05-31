const fs = require("fs");
const path = require("path");
const { MoleculerError } = require("../src/errors");

module.exports = {
	name: "file",
	actions: {
		image: {
			responseType: "image/png",
			handler(ctx) {
				return new this.Promise((resolve, reject) => {
					fs.readFile(path.join(__dirname, "www", "assets", "images", "logo.png"), (err, content) => {
						if (err)
							return reject(err);

						resolve(content);
					});
				});
			}
		},

		html: {
			responseType: "text/html",
			handler(ctx) {
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
