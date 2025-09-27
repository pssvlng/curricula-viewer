# Use Node.js Alpine image
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Angular CLI globally and all dependencies (including dev dependencies for build)
RUN npm install -g @angular/cli && npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Use Nginx to serve the application
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/dist/nif-document-analyzer-frontend /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
