# Jellyfin User Manager

A sophisticated Jellyfin user management web application that provides advanced account control and invite management capabilities with enhanced cinematic user experience design.

## Features

- **Authentication**: Secure login and user management
- **Jellyfin Integration**: Seamless connection with your Jellyfin server
- **User Management**: Create, edit, and manage Jellyfin user accounts
- **Invite System**: Generate and manage invites for new users
- **Watch History**: Track user media consumption
- **Activity Logs**: Monitor user activities and system events
- **Dashboard**: Cinematic UI with movie-themed design elements
- **Responsive Design**: Works on mobile, tablet, and desktop
- **User Roles**: Custom permission sets for different users
- **User Expiry**: Set account expiration dates for temporary access
- **Library Folders**: Control which libraries users can access
- **Favorites**: View users' favorite movies and shows
- **Custom Branding**: Configure server name and logo
- **Docker Support**: Multi-architecture containers for easy deployment

## Database Options

This application supports two database options:

1. **Embedded SQLite** (Default): No configuration required, data is stored in a local SQLite file
2. **External PostgreSQL**: Connect to an external PostgreSQL database (optional)

## Quick Start

### Using Docker (Recommended)

```bash
# Pull and run the latest image
docker run -d \
  --name jellyfin-manager \
  -p 5000:5000 \
  -v ./data:/app/data \
  -v ./config:/app/config \
  <your-dockerhub-username>/jellyfin-manager:latest
```

### Using Docker Compose

1. Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  jellyfin-manager:
    image: <your-dockerhub-username>/jellyfin-manager:latest
    container_name: jellyfin-manager
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PUID=1000
      - PGID=1000
      - TZ=UTC
    volumes:
      - ./config:/app/config
      - ./data:/app/data
```

2. Start the container:

```bash
docker-compose up -d
```

### Building from Source

```bash
# Clone the repository
git clone https://github.com/<your-username>/jellyfin-manager.git
cd jellyfin-manager

# Install dependencies
npm install

# Build the application
npm run build

# Start the server
npm start
```

## Configuration

### Environment Variables

- `NODE_ENV`: Set to `production` for production use
- `DATA_DIR`: Directory where SQLite database files are stored (default: `./data`)
- `DATABASE_URL`: PostgreSQL connection string (optional, uses SQLite if not set)
- `PUID`/`PGID`: User/Group IDs for Docker container (default: 1000/1000)
- `TZ`: Time zone (default: UTC)

## Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Building Docker Images

The repository includes scripts for building multi-architecture Docker images:

```bash
# Build for current architecture
./build.sh

# Build for multiple architectures (amd64, arm64)
./build-multi-arch.sh
```

## License

[MIT License](LICENSE)