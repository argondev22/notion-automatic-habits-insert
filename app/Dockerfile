# Use Node.js 20 with Debian Bullseye
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm install --include=dev

# Copy source code
COPY ./src .

# Install TypeScript globally and compile
RUN tsc --outDir ./dist .

# Run the compiled JavaScript
CMD ["node", "./dist/main.js"]
