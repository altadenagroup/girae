FROM node:alpine

WORKDIR /

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build:client
RUN npm run build:source

# Copy your source code If only files in the src folder
# changed, this is the only step that gets executed!

CMD ["npm", "run", "start:node"]
