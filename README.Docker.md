# 🐳 Docker Deployment Guide

Bu proje Docker ile hem development hem de production ortamlarında çalıştırılabilir.

## 📋 Gereksinimler

- Docker
- Docker Compose
- `.env` dosyası (`.env.example`'dan kopyalayın)

## 🚀 Hızlı Başlangıç

### 1. Environment Dosyasını Hazırlayın
```bash
cp .env.example .env
# .env dosyasını düzenleyin ve gerekli değerleri girin
```

### 2. Development Ortamı (SQLite)
```bash
# SQLite ile development ortamında çalıştırın
pnpm run docker:run:dev

# Alternatif olarak:
docker-compose -f docker-compose.dev.yml up --build
```

### 3. Production Ortamı (PostgreSQL)
```bash
# PostgreSQL ile production ortamında çalıştırın
pnpm run docker:run:prod

# Alternatif olarak:
docker-compose up --build
```

## 🛠️ Docker Komutları

### Temel Komutlar
```bash
# Docker image'ını build et
pnpm run docker:build

# Development ortamını başlat
pnpm run docker:run:dev

# Production ortamını başlat
pnpm run docker:run:prod

# Container'ları durdur
pnpm run docker:stop

# Container'ları temizle (volumes dahil)
pnpm run docker:clean
```

### Manuel Komutlar
```bash
# Sadece image build et
docker build -t news-ai-backend .

# Container'ları başlat
docker-compose up -d

# Log'ları görüntüle
docker-compose logs -f

# Container'lara bağlan
docker-compose exec app sh
docker-compose exec postgres psql -U news_ai_user -d news_ai_db
```

## 🗄️ Database Konfigürasyonu

### SQLite (Development)
- Otomatik olarak `./data/dev.db` dosyası oluşturulur
- Volume mount ile host'ta saklanır

### PostgreSQL (Production)
- Otomatik PostgreSQL container'ı başlatılır
- Database: `news_ai_db`
- User: `news_ai_user`
- Password: `news_ai_password`
- Port: `5432`

## 🔧 Environment Variables

Gerekli environment variable'lar:

```env
# Database (otomatik ayarlanır)
DATABASE_URL=

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# JWT
JWT_SECRET=your-super-secret-jwt-key

# RSS Feeds
RSS_FEEDS=https://example.com/feed1.xml,https://example.com/feed2.xml

# Optional
FEED_CHECK_INTERVAL=15
PORT=3000
NODE_ENV=production
```

## 📁 Volume Mounts

### Development
- `./data:/app/data` - SQLite database
- `./logs:/app/logs` - Application logs

### Production
- `postgres_data:/var/lib/postgresql/data` - PostgreSQL data
- `./logs:/app/logs` - Application logs

## 🔍 Health Checks

### Application Health Check
```bash
curl http://localhost:3000/health
```

### PostgreSQL Health Check
```bash
docker-compose exec postgres pg_isready -U news_ai_user -d news_ai_db
```

## 🚨 Troubleshooting

### Container başlamıyor
```bash
# Log'ları kontrol edin
docker-compose logs app

# Container'ı yeniden başlatın
docker-compose restart app
```

### Database bağlantı sorunu
```bash
# PostgreSQL container'ının çalıştığını kontrol edin
docker-compose ps postgres

# Database'e manuel bağlanın
docker-compose exec postgres psql -U news_ai_user -d news_ai_db
```

### Prisma migration sorunları
```bash
# Container içinde migration çalıştırın
docker-compose exec app pnpm prisma migrate deploy

# Database'i sıfırlayın (dikkatli!)
docker-compose exec app pnpm prisma migrate reset
```

## 🔄 Database Schema Değişiklikleri

PostgreSQL kullanırken schema değişiklikleri için:

1. `prisma/schema.postgresql.prisma` dosyasını `prisma/schema.prisma` olarak kopyalayın
2. Migration oluşturun:
   ```bash
   docker-compose exec app pnpm prisma migrate dev --name your_migration_name
   ```
3. Production'da deploy edin:
   ```bash
   docker-compose exec app pnpm prisma migrate deploy
   ```

## 🏗️ Production Deployment

Production ortamında:

1. `.env` dosyasında güvenli değerler kullanın
2. PostgreSQL şifrelerini değiştirin
3. JWT secret'ını güçlü yapın
4. SSL sertifikası ekleyin (reverse proxy ile)
5. Log rotation ayarlayın

```bash
# Production build
docker-compose -f docker-compose.yml up -d --build

# Health check
curl http://localhost:3000/health
```
