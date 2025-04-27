# Jellyfin User Manager

<div align="center">
  <img src="generated-icon.png" alt="Jellyfin User Manager Logo" width="200">
  <h3>Advanced User Management for Jellyfin Media Server</h3>
</div>

Jellyfin User Manager is a sophisticated web application that enhances Jellyfin's user management capabilities with features like invite systems, user account expiration, advanced role management, and activity tracking.

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

### Using Docker (Recommended)

The easiest way to run Jellyfin User Manager is with Docker and Docker Compose.

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

### Building from Source

If you prefer to build and run the application directly:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/jellyfin-user-manager.git
   cd jellyfin-user-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your PostgreSQL database and update the connection string in your environment variables.

4. Build the application:
   ```bash
   npm run build
   ```

5. Start the application:
   ```bash
   npm start
   ```

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