# Podcast Studio API - Development Plan

## 🎯 Repository Overview

**Repository Name**: `podcast-studio-api`
**Status**: FUTURE ENHANCEMENT - Not needed for MVP
**Purpose**: Backend API for cloud features (sync, backup, collaboration, marketplace)

**Description**:
Optional backend service that extends the local-first Podcast Studio mobile app with cloud capabilities including user authentication, project backup and sync, template marketplace, collaboration features, and analytics.

**Note**: This API is NOT required for the MVP. The mobile app is fully functional in offline-first mode. This backend enables premium cloud features for Phase 2.

---

## 📦 Technology Stack

- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (user data, projects metadata)
- **File Storage**: AWS S3 / Google Cloud Storage (audio files)
- **Cache**: Redis (session management, rate limiting)
- **Real-time**: Socket.io (for collaboration features)
- **Authentication**: JWT + OAuth 2.0 (Google, Apple Sign-In)
- **Payment**: Stripe (for premium subscriptions)
- **Email**: SendGrid
- **Validation**: Zod
- **Testing**: Jest, Supertest
- **Documentation**: Swagger/OpenAPI
- **Code Quality**: ESLint, Prettier
- **Containerization**: Docker
- **Deployment**: AWS ECS / Google Cloud Run

---

## 🎨 Core Features

### Phase 2A: User & Sync Features
1. **User Authentication**
   - Email/password signup
   - OAuth (Google, Apple)
   - JWT token management
   - Password reset flow

2. **Cloud Backup**
   - Automatic project backup
   - Audio file upload to cloud storage
   - Incremental backup (only changed files)
   - Backup history

3. **Cross-Device Sync**
   - Sync projects across devices
   - Conflict resolution (last-write-wins or manual)
   - Real-time sync status
   - Selective sync (choose what to sync)

4. **Storage Management**
   - User storage quota (free tier: 5GB, premium: 100GB)
   - Storage usage tracking
   - File cleanup and archival

### Phase 2B: Marketplace Features
5. **Template Marketplace**
   - Submit custom templates
   - Browse community templates
   - Search and filter templates
   - Rate and review templates
   - Download templates
   - Featured templates
   - Template categories

6. **User Profiles**
   - Public profile
   - Template creator profiles
   - Following system
   - Activity feed

### Phase 2C: Collaboration Features
7. **Project Sharing**
   - Share projects with collaborators
   - Permission levels (view, comment, edit)
   - Invite via email or link
   - Revoke access

8. **Comments & Annotations**
   - Add timestamped comments
   - Reply to comments
   - Resolve comments
   - @mentions

9. **Remote Recording Sessions** (Advanced)
   - Multi-user recording rooms
   - WebRTC audio streaming
   - Separate audio tracks per user
   - Real-time collaboration

### Phase 2D: Analytics & Insights
10. **User Analytics**
    - Recording statistics
    - Most used templates
    - Audio quality metrics
    - Storage usage trends

11. **Template Analytics** (for creators)
    - Download count
    - Ratings
    - Usage statistics

---

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  avatar_url TEXT,
  oauth_provider VARCHAR(50), -- 'google', 'apple', null
  oauth_id VARCHAR(255),
  subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  storage_quota_bytes BIGINT DEFAULT 5368709120, -- 5GB in bytes
  storage_used_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
```

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP,
  deleted_at TIMESTAMP -- soft delete
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_public ON projects(is_public) WHERE deleted_at IS NULL;
```

### Episodes Table
```sql
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_seconds INT,
  audio_file_url TEXT, -- S3/GCS URL
  audio_file_size_bytes BIGINT,
  waveform_data JSONB,
  recorded_at TIMESTAMP,
  template_id UUID,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'processing', 'ready'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_episodes_project ON episodes(project_id);
```

### Templates Table
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  category VARCHAR(100),
  config JSONB NOT NULL, -- audio settings, effects, etc.
  is_default BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  download_count INT DEFAULT 0,
  average_rating DECIMAL(2,1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_public ON templates(is_public) WHERE is_public = true;
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_creator ON templates(creator_id);
```

### Template Ratings Table
```sql
CREATE TABLE template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

CREATE INDEX idx_ratings_template ON template_ratings(template_id);
```

### Project Collaborators Table
```sql
CREATE TABLE project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level VARCHAR(50) DEFAULT 'view', -- 'view', 'comment', 'edit'
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_collaborators_project ON project_collaborators(project_id);
CREATE INDEX idx_collaborators_user ON project_collaborators(user_id);
```

### Comments Table
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp_seconds DECIMAL(10,2), -- timestamp in episode
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_episode ON comments(episode_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan_id VARCHAR(100), -- 'pro_monthly', 'pro_yearly'
  status VARCHAR(50), -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
```

---

## 🚀 API Endpoints

### Authentication Endpoints

**POST /api/v1/auth/signup**
- Create new user account
- Request: `{ email, password, fullName }`
- Response: `{ user, token }`

**POST /api/v1/auth/login**
- Login with email/password
- Request: `{ email, password }`
- Response: `{ user, token }`

**POST /api/v1/auth/oauth/google**
- Login with Google OAuth
- Request: `{ idToken }`
- Response: `{ user, token }`

**POST /api/v1/auth/oauth/apple**
- Login with Apple Sign-In
- Request: `{ identityToken, authorizationCode }`
- Response: `{ user, token }`

**POST /api/v1/auth/refresh**
- Refresh JWT token
- Request: `{ refreshToken }`
- Response: `{ token }`

**POST /api/v1/auth/logout**
- Logout user
- Response: `{ success: true }`

**POST /api/v1/auth/forgot-password**
- Request password reset
- Request: `{ email }`
- Response: `{ success: true }`

**POST /api/v1/auth/reset-password**
- Reset password with token
- Request: `{ token, newPassword }`
- Response: `{ success: true }`

---

### User Endpoints

**GET /api/v1/users/me**
- Get current user profile
- Response: `{ user }`

**PUT /api/v1/users/me**
- Update user profile
- Request: `{ fullName, avatarUrl }`
- Response: `{ user }`

**GET /api/v1/users/:id**
- Get public user profile
- Response: `{ user, templates }`

**GET /api/v1/users/me/storage**
- Get storage usage
- Response: `{ used, quota, usageByProject }`

---

### Project Endpoints

**GET /api/v1/projects**
- List user's projects
- Query: `?page=1&limit=20&sortBy=updatedAt&order=desc`
- Response: `{ projects[], total, page, pages }`

**POST /api/v1/projects**
- Create new project
- Request: `{ name, description, coverImageUrl, category }`
- Response: `{ project }`

**GET /api/v1/projects/:id**
- Get project details
- Response: `{ project, episodes[], collaborators[] }`

**PUT /api/v1/projects/:id**
- Update project
- Request: `{ name, description, coverImageUrl }`
- Response: `{ project }`

**DELETE /api/v1/projects/:id**
- Delete project (soft delete)
- Response: `{ success: true }`

**POST /api/v1/projects/:id/sync**
- Sync project from mobile app
- Request: `{ project, episodes[], files[] }`
- Response: `{ syncedProject, uploadUrls[] }`

**GET /api/v1/projects/:id/sync-status**
- Get sync status
- Response: `{ lastSyncedAt, pendingChanges }`

---

### Episode Endpoints

**POST /api/v1/projects/:projectId/episodes**
- Create new episode
- Request: `{ title, description, audioFile }`
- Response: `{ episode, uploadUrl }`

**GET /api/v1/episodes/:id**
- Get episode details
- Response: `{ episode }`

**PUT /api/v1/episodes/:id**
- Update episode
- Request: `{ title, description }`
- Response: `{ episode }`

**DELETE /api/v1/episodes/:id**
- Delete episode
- Response: `{ success: true }`

**POST /api/v1/episodes/:id/upload-complete**
- Notify that audio file upload is complete
- Response: `{ episode }`

---

### Template Endpoints

**GET /api/v1/templates**
- Browse templates
- Query: `?category=interview&page=1&limit=20&sortBy=downloads&featured=true`
- Response: `{ templates[], total, page, pages }`

**GET /api/v1/templates/:id**
- Get template details
- Response: `{ template, creator, ratings[] }`

**POST /api/v1/templates**
- Create new template
- Request: `{ name, description, icon, category, config, isPublic }`
- Response: `{ template }`

**PUT /api/v1/templates/:id**
- Update template
- Request: `{ name, description, config }`
- Response: `{ template }`

**DELETE /api/v1/templates/:id**
- Delete template
- Response: `{ success: true }`

**POST /api/v1/templates/:id/rate**
- Rate a template
- Request: `{ rating, review }`
- Response: `{ rating }`

**GET /api/v1/templates/:id/ratings**
- Get template ratings
- Response: `{ ratings[], averageRating, totalRatings }`

---

### Collaboration Endpoints

**POST /api/v1/projects/:id/collaborators**
- Invite collaborator
- Request: `{ email, permissionLevel }`
- Response: `{ collaborator }`

**PUT /api/v1/projects/:id/collaborators/:userId**
- Update collaborator permission
- Request: `{ permissionLevel }`
- Response: `{ collaborator }`

**DELETE /api/v1/projects/:id/collaborators/:userId**
- Remove collaborator
- Response: `{ success: true }`

**GET /api/v1/collaborations**
- Get projects I'm collaborating on
- Response: `{ projects[] }`

---

### Comment Endpoints

**GET /api/v1/episodes/:id/comments**
- Get episode comments
- Response: `{ comments[] }`

**POST /api/v1/episodes/:id/comments**
- Add comment
- Request: `{ content, timestampSeconds }`
- Response: `{ comment }`

**POST /api/v1/comments/:id/reply**
- Reply to comment
- Request: `{ content }`
- Response: `{ comment }`

**PUT /api/v1/comments/:id**
- Update comment
- Request: `{ content }`
- Response: `{ comment }`

**DELETE /api/v1/comments/:id**
- Delete comment
- Response: `{ success: true }`

**POST /api/v1/comments/:id/resolve**
- Mark comment as resolved
- Response: `{ comment }`

---

### Subscription Endpoints

**GET /api/v1/subscriptions/plans**
- Get available subscription plans
- Response: `{ plans[] }`

**POST /api/v1/subscriptions/checkout**
- Create checkout session
- Request: `{ planId }`
- Response: `{ checkoutUrl }`

**GET /api/v1/subscriptions/me**
- Get current subscription
- Response: `{ subscription }`

**POST /api/v1/subscriptions/cancel**
- Cancel subscription
- Response: `{ subscription }`

**POST /api/v1/webhooks/stripe**
- Stripe webhook handler
- Handles: payment success, subscription updates, cancellations

---

### Analytics Endpoints

**GET /api/v1/analytics/me**
- Get user analytics
- Query: `?period=30d`
- Response: `{ totalRecordings, totalDuration, storageUsed, topTemplates[] }`

**GET /api/v1/analytics/templates/:id**
- Get template analytics (for creators)
- Response: `{ downloads, ratings, usageStats }`

---

## 🏗️ Architecture Components

### File Upload Flow
1. Client requests upload URL: `POST /api/v1/episodes/:id/upload-url`
2. Server generates pre-signed S3 URL (valid for 15 minutes)
3. Client uploads directly to S3 using pre-signed URL
4. Client notifies server: `POST /api/v1/episodes/:id/upload-complete`
5. Server validates file, updates database

### Sync Strategy
- **Push Sync**: Mobile app pushes changes to server
- **Pull Sync**: Mobile app pulls changes from server
- **Conflict Resolution**: Last-write-wins (for MVP), manual resolution later
- **Incremental Sync**: Only sync changed files, not entire projects

### Real-time Collaboration (Socket.io)
```javascript
// Client joins project room
socket.emit('join-project', { projectId });

// Server broadcasts comment added
socket.to(projectId).emit('comment-added', { comment });

// Server broadcasts collaborator joined
socket.to(projectId).emit('collaborator-joined', { user });
```

---

## 🔒 Security Features

### Authentication
- JWT tokens (15-minute expiry for access token, 7-day refresh token)
- Refresh token rotation
- OAuth 2.0 for Google/Apple Sign-In
- Password hashing with bcrypt (10 rounds)

### Authorization
- Role-based access control (RBAC)
- Project-level permissions (owner, collaborator)
- Resource ownership validation on all endpoints

### Rate Limiting
- Auth endpoints: 5 requests/minute
- Upload endpoints: 10 requests/hour
- API endpoints: 100 requests/minute per user

### Data Validation
- Zod schemas for all inputs
- File upload size limits (max 500MB per file)
- File type validation (audio files only)

### Security Headers
- Helmet.js for security headers
- CORS configured for mobile app domains only
- HTTPS enforced in production

---

## 📊 Success Metrics

### Performance Targets
- ✅ API response time <200ms (95th percentile)
- ✅ File upload speed >10MB/s
- ✅ Sync operation <5 seconds for typical project
- ✅ 99.9% uptime

### Scalability Targets
- ✅ Support 100,000+ users
- ✅ Handle 1000+ concurrent connections (WebSocket)
- ✅ Store 100TB+ of audio files

### Cost Targets
- ✅ <$1/user/month infrastructure cost (at scale)
- ✅ Storage cost offset by premium subscriptions

---

## 🚀 Deployment Strategy

### Infrastructure
- **Hosting**: AWS ECS or Google Cloud Run
- **Database**: AWS RDS PostgreSQL (Multi-AZ)
- **Cache**: AWS ElastiCache Redis
- **Storage**: AWS S3 with CloudFront CDN
- **Monitoring**: CloudWatch + Sentry
- **CI/CD**: GitHub Actions

### Environments
- **Development**: Local Docker Compose
- **Staging**: Separate AWS account
- **Production**: Production AWS account with auto-scaling

### Scaling
- Horizontal scaling with load balancer
- Database read replicas for read-heavy operations
- CDN for audio file delivery
- Redis cache for session management

---

## 📝 Development Phases

### PHASE 1: Foundation (Week 1-2)
- Setup Express + TypeScript project
- Database schema design and migrations
- Authentication (JWT + OAuth)
- Basic user CRUD
- Error handling and logging

### PHASE 2: Projects & Sync (Week 3-4)
- Projects API
- Episodes API
- File upload to S3
- Sync endpoints
- Conflict resolution

### PHASE 3: Template Marketplace (Week 5-6)
- Templates API
- Ratings and reviews
- Search and filtering
- Featured templates
- Creator profiles

### PHASE 4: Collaboration (Week 7-8)
- Project sharing
- Collaborator management
- Comments system
- Real-time updates (Socket.io)

### PHASE 5: Subscriptions (Week 9)
- Stripe integration
- Subscription plans
- Storage quota enforcement
- Webhook handling

### PHASE 6: Analytics (Week 10)
- User analytics
- Template analytics
- Usage tracking
- Dashboard

### PHASE 7: Testing & Deployment (Week 11-12)
- Comprehensive testing
- Load testing
- Security audit
- Production deployment
- Mobile app integration

---

## 🎯 Pricing Strategy (Suggested)

### Free Tier
- 5GB cloud storage
- Max 3 projects
- Basic templates
- No collaboration

### Pro Tier ($9.99/month or $99/year)
- 100GB cloud storage
- Unlimited projects
- Premium templates
- Collaboration (up to 5 collaborators)
- Priority support

### Enterprise Tier (Custom pricing)
- Unlimited storage
- Unlimited projects
- Unlimited collaborators
- Custom templates
- Dedicated support
- SLA guarantee

---

## 🚨 Critical Reminders

1. **API NOT REQUIRED FOR MVP** - Mobile app works fully offline
2. **SECURITY FIRST** - User data and audio files are sensitive
3. **SCALABILITY** - Design for 100k+ users from day one
4. **COST OPTIMIZATION** - Storage costs can be high, optimize early
5. **RATE LIMITING** - Prevent abuse and control costs
6. **MONITORING** - Track errors, performance, and usage
7. **DOCUMENTATION** - Swagger docs for all endpoints
8. **TESTING** - >80% coverage, integration tests
9. **DATA PRIVACY** - GDPR compliance, user data export/delete
10. **BACKWARD COMPATIBILITY** - API versioning from day one

---

**Remember**: This API exists to enhance the mobile app experience, not replace it. The mobile app should remain fully functional offline. Cloud features are premium add-ons that provide additional value!
