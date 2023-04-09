FROM node:slim

COPY . /action
WORKDIR /action

RUN npm install --omit=dev

ENTRYPOINT ["node", "/action/main.js"]
