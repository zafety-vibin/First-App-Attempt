FROM node:20-slim

# Install better-sqlite3 native dependencies and curl for healthcheck
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Run development server with nodemon
CMD ["npm", "run", "dev"]
