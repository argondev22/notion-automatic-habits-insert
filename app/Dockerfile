# Use Node.js 20 with Debian Bullseye
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy TypeScript configuration first
COPY tsconfig.json ./

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm install --include=dev

# Copy source code
COPY ./src ./src

# Install TypeScript globally and compile
RUN npx tsc --outDir ./dist ./src/main.ts

# Run the compiled JavaScript
CMD ["node", "./dist/main.js"]
