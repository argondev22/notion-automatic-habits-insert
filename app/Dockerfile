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

# Compile TypeScript using project config
RUN npx tsc -p .

# Run the compiled JavaScript
CMD ["node", "./dist/main.js"]
