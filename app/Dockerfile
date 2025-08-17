# Use official Node.js image with TypeScript support
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY ./src .

# Install TypeScript globally and compile
RUN tsc --outDir ./dist ./src/main.ts

# Run the compiled JavaScript
CMD ["node", "dist/main.js"]
