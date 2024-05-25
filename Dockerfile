FROM node:21

WORKDIR /

COPY package*.json ./

RUN npm ci
RUN npm i @sentry/node @sentry/profiling-node

COPY . .

RUN npm run build:client
RUN npm run build:source

# etc.
CMD ["npm", "run", "start:node"]
