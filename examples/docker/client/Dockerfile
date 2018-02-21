FROM node:6

RUN mkdir /app
WORKDIR /app

COPY package.json .

ENV NODE_ENV=production

RUN npm install --production

COPY moleculer.config.js ./

EXPOSE 9229

CMD ["npm", "start"]
