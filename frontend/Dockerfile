# Stage 1: Build the React application with Node.js.
FROM node:22-alpine AS build

# Set the folder where all frontend commands will run.
WORKDIR /app

# VITE_API_URL is optional in Docker Compose because Nginx proxies /api to backend.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Copy dependency files first so Docker can cache npm install.
COPY package*.json ./
RUN npm install

# Copy the frontend source code and static assets.
COPY index.html .
COPY public ./public
COPY src ./src
COPY vite.config.js .

# Build optimized static files into /app/dist.
RUN npm run build

# Stage 2: Serve the built React app with Nginx.
FROM nginx:1.27-alpine

# Replace the default Nginx config with our app config.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the finished React build from the Node stage into Nginx's web folder.
COPY --from=build /app/dist /usr/share/nginx/html

# The frontend container listens on port 80.
EXPOSE 80

# Keep Nginx running in the foreground so Docker can manage the container.
CMD ["nginx", "-g", "daemon off;"]
