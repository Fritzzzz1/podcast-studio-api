# Podcast Studio API

Backend API for cloud features including user authentication, project backup and sync, template marketplace, collaboration features, and analytics.

## 🚀 Features

- **User Authentication**: JWT + OAuth (Google, Apple)
- **Cloud Backup**: Automatic project backup with audio file storage
- **Cross-Device Sync**: Sync projects across multiple devices
- **Template Marketplace**: Browse, rate, and share custom templates
- **Collaboration**: Share projects with real-time collaboration
- **Subscriptions**: Stripe integration for premium features
- **Analytics**: User and template usage statistics

## 📦 Technology Stack

- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **File Storage**: AWS S3
- **Real-time**: Socket.io
- **Authentication**: JWT + OAuth 2.0
- **Payment**: Stripe
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ LTS
- Docker and Docker Compose (recommended)
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd podcast-studio-api
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration.

### Running with Docker (Recommended)

1. Start all services:
```bash
docker-compose up -d
```

2. Run database migrations:
```bash
docker-compose exec api npm run migrate
```

3. View logs:
```bash
docker-compose logs -f api
```

4. Stop services:
```bash
docker-compose down
```

### Running Locally

1. Start PostgreSQL and Redis (ensure they're running)

2. Run database migrations:
```bash
npm run migrate
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## 📚 API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:3000/api/v1/docs`
- Health Check: `http://localhost:3000/health`

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📝 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run migrate` - Run database migrations

## 🗄️ Database Schema

The database includes the following tables:
- **users** - User accounts and authentication
- **projects** - Podcast projects
- **episodes** - Individual podcast episodes
- **templates** - Audio processing templates
- **template_ratings** - User ratings for templates
- **project_collaborators** - Project sharing and permissions
- **comments** - Episode comments and annotations
- **subscriptions** - Stripe subscription management

## 🔒 Security

- JWT tokens with refresh token rotation
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Helmet.js security headers
- CORS configuration
- Input validation with Zod
- SQL injection prevention with parameterized queries

## 🚢 Deployment

The API can be deployed to:
- AWS ECS
- Google Cloud Run
- Any Docker-compatible hosting platform

Environment variables must be configured for production use.

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
