# Docmost

Open-source collaborative documentation and knowledge management platform with AI integration capabilities.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 15+ (if not using Docker)
- Redis (if not using Docker)

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/docmost/docmost.git
cd docmost

# Run the setup script
./scripts/setup.sh
```

This will:
1. Check prerequisites
2. Create configuration files
3. Start all services with Docker
4. Run database migrations
5. Launch Docmost at http://localhost:3000

### Manual Setup

1. **Copy environment configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Generate secure APP_SECRET**
   ```bash
   openssl rand -hex 32
   # Add to .env file
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Run migrations**
   ```bash
   docker-compose exec docmost pnpm migration:latest
   ```

5. **Access Docmost**
   - Open http://localhost:3000
   - Create admin account at `/auth/setup`

## 🏗️ Architecture

Docmost is built with:
- **Frontend**: React, TypeScript, Mantine UI
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time**: Socket.io
- **AI Integration**: Model Context Protocol (MCP)

## 🤖 AI Integration

Docmost supports AI tool integration through the Model Context Protocol (MCP):

### For AI Tools (Cursor, etc.)
```
URL: http://localhost:3000/api/mcp-standard
API Key: Create in Settings > Workspace > API Keys
```

### Available AI Operations
- Create and manage spaces
- Create, edit, and organize pages
- Add comments and collaborate
- Search and navigate content

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test
```

### Project Structure
```
docmost/
├── apps/
│   ├── client/        # React frontend
│   └── server/        # NestJS backend
├── packages/          # Shared packages
├── scripts/           # Utility scripts
└── docker-compose.yml # Docker configuration
```

## 📚 Documentation

- [Installation Guide](docs/installation.md)
- [Configuration](docs/configuration.md)
- [API Documentation](docs/api.md)
- [Contributing](CONTRIBUTING.md)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| APP_URL | Application URL | Yes | http://localhost:3000 |
| APP_SECRET | Secret key (min 32 chars) | Yes | - |
| DATABASE_URL | PostgreSQL connection | Yes | - |
| REDIS_URL | Redis connection | Yes | - |
| STORAGE_DRIVER | Storage type (local/s3) | No | local |

See `.env.example` for all options.

### Production Deployment

For production deployment:

1. Use `.env.production.example` as template
2. Set up SSL/TLS with reverse proxy
3. Configure backups for database and files
4. Set up monitoring and logging
5. Review security settings

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

[License information here]

## 🆘 Support

- **Documentation**: https://docmost.com/docs
- **Issues**: https://github.com/docmost/docmost/issues
- **Discussions**: https://github.com/docmost/docmost/discussions

## 🚦 Status

- ✅ Core documentation features
- ✅ Real-time collaboration
- ✅ AI tool integration
- 🚧 Advanced permissions
- 🚧 Plugin system

---

Made with ❤️ by the Docmost team