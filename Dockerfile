FROM node:alpine

WORKDIR /

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build:client
RUN npm run build:source

# Copy your source code If only files in the src folder
# changed, this is the only step that gets executed!

ENV NEW_RELIC_NO_CONFIG_FILE=true
ENV NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true
ENV NEW_RELIC_LOG=stdout
# etc.

CMD ["npm", "run", "start:node"]
