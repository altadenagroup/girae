FROM node:alpine

WORKDIR /

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:source
RUN npm run build:client

# Copy your source code If only files in the src folder
# changed, this is the only step that gets executed!

CMD ["npm", "run", "start:node"]
