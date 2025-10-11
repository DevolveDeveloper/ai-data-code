 # frontend/Dockerfile

# Use official Node 20 image (arm64 compatible for Apple Silicon)
FROM node:20-alpine

WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install dependencies (include build tools)
RUN apk add --no-cache python3 make g++ && \
    npm install --production && \
    npm install lightningcss --force

# Copy the rest of the frontend code
COPY . .

# Build the project (Next.js)
RUN npm run build || npm run build --no-lint

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start"]
