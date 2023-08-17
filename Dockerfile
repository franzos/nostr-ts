# Stage 1: Build
FROM node:16 AS build

WORKDIR /app

RUN npm install -g pnpm

COPY . .

RUN pnpm install --force

# Build packages
RUN pnpm run build

# Build client-web
RUN sh -c 'cd client-web && pnpm run build'

# Stage 2: Serve
FROM nginx:alpine

# Copy built app from the 'build' stage to the nginx HTML directory
COPY --from=build /app/client-web/dist /usr/share/nginx/html

# Expose port 80 (default port for nginx)
EXPOSE 80

# The command to run when the container starts
CMD ["nginx", "-g", "daemon off;"]
