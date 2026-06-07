# Use the official Node.js image as the base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the application dependencies
RUN npm ci

# Copy prisma directory to generate the client
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Build the app
RUN npm run build

# Command to start the application (runs migrations then starts the app)
CMD ["sh", "-c", "npm run db:deploy && npm run start:prod"]