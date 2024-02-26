FROM imbios/bun-node:latest-current-alpine
# Copy the lock and package file
COPY bun.lockb .
COPY package.json .
# Install dependencies
RUN bun install --frozen-lockfile
COPY . .
RUN npm run build:client
# Copy your source code If only files in the src folder 
# changed, this is the only step that gets executed!
CMD ["bun", "run", "src/index.ts"]
