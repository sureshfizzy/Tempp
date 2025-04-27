# Jellyfin User Manager

<div align="center">
  <img src="generated-icon.png" alt="Jellyfin User Manager Logo" width="200">
  <h3>Advanced User Management for Jellyfin Media Server</h3>
</div>

Jellyfin User Manager is a sophisticated web application that enhances Jellyfin's user management capabilities with features like invite systems, user account expiration, advanced role management, and activity tracking.

## Quick Start

Having trouble with database setup? Try our quickstart script:

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/yourusername/jellyfin-user-manager.git
cd jellyfin-user-manager

# Run the quickstart script
chmod +x quickstart.sh
./quickstart.sh
```

This will guide you through setting up the database and environment variables correctly.

### Troubleshooting Database Connection Issues

If you're having issues with the database connection, try these steps:

1. Fix SSL certificate issues (common when using self-signed certificates):
   ```bash
   ./fix-db-connection.sh
   ```
   This script will configure your environment to work with self-signed SSL certificates.

2. Check your database connection:
   ```bash
   ./check-db.sh
   ```
   This will verify if your database is accessible and properly configured.

3. Start with explicit environment variables:
   ```bash
   ./start-dev.sh
   ```
   This script ensures environment variables are properly loaded before starting the application.

4. If you need to quickly create a working development environment:
   ```bash
   # For full guided setup
   ./quickstart.sh
   
   # For local installation with PostgreSQL setup
   ./install-local.sh
   
   # For Docker-based installation
   ./install-docker.sh
   ```

#### Common SSL Certificate Issues

If you're seeing errors like `self-signed certificate` or `DEPTH_ZERO_SELF_SIGNED_CERT`, these are related to SSL certificate validation failures. Our `fix-db-connection.sh` script addresses these by:

1. Setting `NODE_TLS_REJECT_UNAUTHORIZED=0` in your .env file
2. Configuring the application to use custom HTTPS agents that bypass certificate validation
3. Ensuring proper protocol usage in database connection strings

For production use, we recommend:
- Using properly signed SSL certificates
- Removing the `NODE_TLS_REJECT_UNAUTHORIZED=0` setting
- Configuring trusted certificate authorities

## Features

- 🔒 **Multi-step onboarding process**: Connect to your Jellyfin server with API key and admin credentials
- 👥 **Advanced user management**: Create, edit, and manage Jellyfin users with extended capabilities
- 📧 **Invite system**: Generate invite links with custom profiles and expiration dates
- ⏱️ **Account expiration**: Set and track expiration dates for user accounts
- 👑 **Custom roles**: Create and assign custom roles with specific permissions
- 📊 **User activity tracking**: Monitor watch history and media consumption
- 🎨 **Cinematic UI**: Beautiful dark theme with film-inspired visual elements
- 🎬 **Media library access control**: Fine-grained control over which libraries users can access
- 📱 **Responsive design**: Works on mobile, tablet, and desktop devices

## Screenshots

*Coming soon*

## Requirements

- Node.js 18+ (20.x recommended)
- PostgreSQL database
- Jellyfin server with admin access
- API key from your Jellyfin server

## Installation

### One-Click Installation (Recommended)

We provide easy one-click installation scripts for both Docker and local environments.

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jellyfin-user-manager.git
   cd jellyfin-user-manager
   ```

2. Run the installation script:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. Follow the prompts to choose your installation method:
   - Option 1: Docker installation (recommended)
   - Option 2: Local installation

4. The script will handle all the setup for you and provide instructions for accessing the application.

### Manual Docker Installation

If you prefer to set up Docker manually:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jellyfin-user-manager.git
   cd jellyfin-user-manager
   ```

2. Modify the `docker-compose.yml` file if needed to adjust ports, environment variables, or volume mounts.

3. Start the application:
   ```bash
   docker-compose up -d
   ```

4. Access the application at `http://localhost:5000`

### Manual Local Installation

If you prefer to build and run the application directly:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jellyfin-user-manager.git
   cd jellyfin-user-manager
   ```

2. Set up a PostgreSQL database:
   
   Option A - Using Docker (easiest):
   ```bash
   docker run -d \
     --name jellyfin-manager-db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=jellyfin_manager \
     -p 5432:5432 \
     postgres:15-alpine
   ```

   Option B - Using an existing PostgreSQL installation:
   ```bash
   # Create a database using psql
   psql -U postgres -c "CREATE DATABASE jellyfin_manager;"
   ```

3. Create an `.env` file with your database connection:
   ```bash
   # Use this format
   echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jellyfin_manager" > .env
   echo "NODE_ENV=development" >> .env
   echo "PORT=5000" >> .env
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Build the application:
   ```bash
   npm run build
   ```

6. Start the application:
   ```bash
   # Using our helper script (recommended - ensures environment variables are loaded)
   ./start-dev.sh
   
   # Alternative method 1 (for development)
   npm run dev
   
   # Alternative method 2 (for production)
   npm start
   ```

7. Access the application at `http://localhost:5000`

> **IMPORTANT**: The most common error when running locally is the absence of a proper DATABASE_URL environment variable. Make sure your `.env` file exists and contains the correct PostgreSQL connection string.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | (required) |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Port for the server | `5000` |
| `TZ` | Timezone | `UTC` |
| `PUID` | User ID (Docker only) | `1000` |
| `PGID` | Group ID (Docker only) | `1000` |

## Docker Configuration

### User / Group Identifiers

When using Docker, you can specify the user `PUID` and group `PGID` to match the ownership of your mounted volumes:

```yaml
environment:
  - PUID=1000
  - PGID=1000
```

This ensures that permissions issues are avoided when accessing mounted volumes.

### Volumes

- `/app/config`: Application configuration files
- `/app/data`: Application data storage

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jellyfin-user-manager.git
   cd jellyfin-user-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start a PostgreSQL database (can use Docker):
   ```bash
   docker run -d \
     --name jellyfin-manager-db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=jellyfin-manager \
     -p 5432:5432 \
     postgres:15-alpine
   ```

4. Set environment variables in `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jellyfin-manager
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Access the application at `http://localhost:5000`

## Getting Started

1. After installation, navigate to the application URL
2. You'll be guided through a setup process:
   - Enter your Jellyfin server URL and API key
   - Log in with an admin account
3. Once connected, you can:
   - View and manage users
   - Create user profiles
   - Generate invite links
   - Manage roles
   - Track user activity

## Architecture

Jellyfin User Manager uses a modern web application stack:

- **Frontend**: React with TypeScript, TailwindCSS, Framer Motion
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Containerization**: Docker and Docker Compose

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, issues, or feature requests, please file an issue on the GitHub repository.

---

Jellyfin User Manager is not affiliated with or endorsed by Jellyfin or the Jellyfin Project.