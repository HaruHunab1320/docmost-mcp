# Raven Docs

A second-brain documentation and project management platform with AI integration capabilities.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for development)
- PostgreSQL 15+ (if not using Docker)
- Redis (if not using Docker)

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/raven-docs/raven-docs.git
cd raven-docs

# Run the setup script
./scripts/setup.sh
```

This will:
1. Check prerequisites
2. Create configuration files
3. Start all services with Docker
4. Run database migrations
5. Launch Raven Docs at http://localhost:3000

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
   docker-compose exec raven-docs pnpm migration:latest
   ```

5. **Access Raven Docs**
   - Open http://localhost:3000
   - Create admin account at `/auth/setup`

## 🏗️ Architecture

Raven Docs is built with:
- **Frontend**: React, TypeScript, Mantine UI
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time**: Socket.io
- **AI Integration**: Model Context Protocol (MCP)

## 🤖 AI Integration

Raven Docs supports AI tool integration through the Model Context Protocol (MCP):

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
raven-docs/
├── apps/
│   ├── client/        # React frontend
│   └── server/        # NestJS backend
├── packages/          # Shared packages
├── scripts/           # Utility scripts
└── docker-compose.yml # Docker configuration
```

## 📚 Documentation

- [Architecture Overview](docs/ArchitectureOverview.md)
- [System Status Audit](docs/SystemStatus.md)
- [MCP (Canonical)](docs/MCP.md)
- [Engineering Standards](docs/EngineeringStandards.md)
- [Workflows + Use Cases](docs/Workflows.md)
- [Autonomy Quickstart](docs/AutonomyQuickstart.md)
- [System Risks + Remediation](docs/SystemRisks.md)
- [UI Audit Route Checks](docs/UIAudit_RouteChecks.md)
- [Testing Matrix](docs/TestingMatrix.md)
- [Manual Test Runbook](docs/ManualTest_Runbook.md)
- [GTD + Second Brain UI](docs/GTD_SecondBrain_UI.md)
- [GTD Agent Automations](docs/GTD_Agent_Automations.md)
- [Project Management](docs/ProjectManagement.md)
- [Product Vision + Methodology](docs/ProductVision.md)

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

- **Documentation**: See `docs/Documentation.md` for a full index.

## 🚦 Status

- ✅ Core documentation features
- ✅ Real-time collaboration
- ✅ AI tool integration
- 🚧 Advanced permissions
- 🚧 Plugin system

---

Made with ❤️ by the Raven Docs team (with deep appreciation for Raven Docs)
