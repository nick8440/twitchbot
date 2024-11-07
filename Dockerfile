# Use the official Deno image as the base
FROM denoland/deno:latest

# Set the working directory inside the container
WORKDIR /app

# Copy the current directory contents into the container
COPY . .

# Pre-cache the main.ts file inside the web directory
RUN cd web && deno cache main.ts

# Define the command to run when the container starts
CMD ["deno", "run", "--unstable-kv", "-A", "web/main.ts"]

# Specify the volume mount for the Deno KV database
VOLUME ["/db/denoKv"]