# Architecture Guide

## System Overview

SocratesOS is built on a modern, scalable architecture using serverless and cloud-native technologies.

```
┌─────────────────────────────────────────────────────────────┐
│                    FlutterFlow Frontend                      │
│              (Web & Mobile Cross-Platform UI)                │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API / WebSocket
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway                              │
│              (Firebase Cloud Functions)                      │
└──────────┬───────────┬──────────────┬────────────────────────┘
           │           │              │
           ↓           ↓              ↓
    ┌──────────┐ ┌──────────┐ ┌──────────────┐
    │   DQS    │ │ Auth &   │ │  Payments    │
    │  Engine  │ │ User Mgmt│ │  (Stripe)    │
    └────┬─────┘ └────┬─────┘ └──────┬───────┘
         │            │              │
         └────────────┼──────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ↓                         ↓
    ┌─────────┐           ┌──────────────┐
    │ Firestore│           │  Realtime DB │
    │ Database │           │  (Analytics) │
    └──────────┘           └──────────────┘
         │                         │
         └─────────────┬───────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
         ↓                            ↓
    ┌──────────┐              ┌──────────────┐
    │  Gemini  │              │  SendGrid    │
    │   API    │              │  (Email)     │
    └──────────┘              └──────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Mobile**: FlutterFlow (No-code rapid development)
- **State Management**: Redux or Context API
- **UI Components**: Material-UI or custom components
- **Real-time**: WebSocket for live discourse updates

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Firebase Cloud Functions (Serverless)
- **Language**: JavaScript/TypeScript
- **Database**: Firestore (NoSQL)
- **Cache**: Firebase Realtime Database or Redis
- **Auth**: Firebase Authentication

### AI & ML
- **Gemini API**: For discourse quality evaluation
- **Sentiment Analysis**: VADER or similar
- **NLP**: Text processing and analysis
- **DQS Algorithm**: Custom scoring engine

### Payments
- **Stripe API**: Payment processing
- **Webhook Handlers**: Real-time payment updates
- **Subscription Management**: Firebase + Stripe

### Infrastructure
- **Hosting**: Firebase Hosting
- **Functions**: Google Cloud Functions
- **Storage**: Cloud Storage for media
- **Monitoring**: Sentry, Firebase Console
- **CI/CD**: GitHub Actions

## Key Components

### 1. DQS Engine (Discourse Quality Score)
Located in: `/src/services/dqs/`

Responsibilities:
- Analyze discourse quality in real-time
- Calculate sentiment scores
- Evaluate argument coherence
- Generate recommendations
- Store scoring history

```typescript
interface DiscourseQualityScore {
  score: number;           // 0-100
  sentiment: number;       // -1 to 1
  coherence: number;       // 0-100
  engagement: number;      // 0-100
  toxicity: number;        // 0-100
  recommendations: string[];
  timestamp: Date;
}
```

### 2. Authentication Service
Located in: `/src/services/auth/`

Features:
- Email/password authentication
- Social login (Google, GitHub)
- JWT token management
- Role-based access control (RBAC)
- Two-factor authentication (2FA)

### 3. Payment Service
Located in: `/src/services/payments/`

Responsibilities:
- Process Stripe payments
- Manage subscriptions
- Handle webhooks
- Track billing events
- Generate invoices

### 4. Analytics Service
Located in: `/src/services/analytics/`

Tracks:
- User engagement metrics
- DQS trends over time
- Payment analytics
- Error tracking
- Performance metrics

## Data Flow

### Discourse Quality Evaluation Flow
```
User Input (Discourse)
    ↓
Validation & Sanitization
    ↓
Send to DQS Engine
    ↓
Gemini API Analysis
    ↓
Calculate Composite Score
    ↓
Store in Firestore
    ↓
Return to Frontend
    ↓
Display Results & Recommendations
```

### Payment Flow
```
User Selects Plan
    ↓
Frontend: Create Checkout Session
    ↓
Backend: Call Stripe API
    ↓
Stripe: Return Checkout URL
    ↓
User: Complete Payment on Stripe
    ↓
Stripe: Send Webhook to Backend
    ↓
Backend: Verify & Process Payment
    ↓
Update User Subscription Status
    ↓
Frontend: Show Success Message
```

## Database Schema

### Firestore Collections

**users/**
```
{
  uid: string
  email: string
  displayName: string
  subscription: {
    plan: "free" | "pro" | "enterprise"
    status: "active" | "cancelled"
    startDate: Timestamp
    renewalDate: Timestamp
  }
  settings: {}
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**discourses/**
```
{
  id: string
  userId: string
  content: string
  dqsScore: DiscourseQualityScore
  metadata: {
    context: string
    category: string
    tags: string[]
  }
  createdAt: Timestamp
}
```

**analytics/**
```
{
  userId: string
  date: string (YYYY-MM-DD)
  metrics: {
    discourseCount: number
    avgDQSScore: number
    topicDistribution: {}
  }
}
```

## Scalability Considerations

### Horizontal Scaling
- **Cloud Functions**: Auto-scales based on load
- **Firestore**: Sharding strategy for high-volume collections
- **CDN**: Firebase Hosting for static assets

### Caching Strategy
- Frontend: Service Workers for offline support
- Backend: Redis for frequently accessed data
- Database: Composite indexes for common queries

### Performance Optimization
- API response compression
- Image optimization
- Database query optimization
- Lazy loading on frontend

## Security Architecture

### Authentication
- JWT tokens with expiration
- Refresh token rotation
- Secure token storage (httpOnly cookies)

### Authorization
- Firestore Security Rules enforce access control
- Role-based permissions
- Resource-level access checks

### Data Protection
- Encryption at rest (Firebase default)
- Encryption in transit (HTTPS/TLS)
- Sensitive data masked in logs
- PII handling compliance

### API Security
- Rate limiting per user/IP
- Input validation and sanitization
- CORS configuration
- API key rotation

## Error Handling

### Global Error Handler
- Catch all exceptions
- Log to Sentry
- Return appropriate HTTP status
- Sanitize error messages

### Retry Strategy
- Exponential backoff for transient failures
- Circuit breaker pattern for external APIs
- Graceful degradation of features

## Monitoring & Logging

### Key Metrics
- API response time (p50, p95, p99)
- Error rate by endpoint
- DQS calculation performance
- Payment success rate
- User engagement metrics

### Log Aggregation
- Application logs: Sentry + Cloud Logging
- Access logs: Cloud Logging
- Database queries: Firestore monitoring
- Errors: Real-time alerts

---

**Last Updated**: July 3, 2026
