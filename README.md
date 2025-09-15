# News AI Backend

Haber toplama, özetleme ve arama sistemi. RSS feed'lerden haberleri toplar, Google Gemini AI ile özetler ve web araması yapar.

## 🚀 Özellikler

- **RSS Feed Entegrasyonu**: Birden fazla haber kaynağından otomatik haber toplama
- **Otomatik Güncelleme**: Belirli aralıklarla yeni haberleri kontrol etme
- **AI Özetleme**: Google Gemini ile tarih aralığındaki haberleri özetleme
- **Web Arama**: Gemini AI ile güncel haber arama
- **Kategori Yönetimi**: Haberleri kategorilere göre filtreleme
- **RESTful API**: Frontend için hazır endpoint'ler

## 📋 Gereksinimler

- Node.js 18+
- pnpm
- Google Gemini API Key

## 🛠️ Kurulum

1. Projeyi klonlayın:
```bash
git clone <repo-url>
cd news_aii_be
```

2. Bağımlılıkları yükleyin:
```bash
pnpm install
```

3. `.env` dosyasını düzenleyin:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
RSS_FEEDS=https://www.hurriyet.com.tr/rss/anasayfa,https://www.milliyet.com.tr/rss/rssnew/gundemrss.xml
FEED_CHECK_INTERVAL=15
```

4. Veritabanını oluşturun:
```bash
pnpm prisma migrate dev
```

5. Kimlik doğrulama sistemini kurun:
```bash
pnpm setup:auth
```

6. Uygulamayı başlatın:
```bash
pnpm dev
```

## API Endpoints

> **Not:** Tüm API endpoint'leri (auth hariç) kimlik doğrulama gerektirir. Authorization header'ında `Bearer {token}` formatında JWT token göndermelisiniz.

### User
- Kullanıcı bilgileri ve kimlik doğrulama
- Kullanıcı adı, şifre (hash'li), rol

### Kimlik Doğrulama (Authentication)

#### POST /api/auth/register
Yeni kullanıcı kaydı

**Body:**
```json
{
  "username": "kullanici_adi",
  "password": "sifre123",
  "role": "viewer" // admin, editor, viewer
}
```

#### POST /api/auth/login
Kullanıcı girişi

**Body:**
```json
{
  "username": "kullanici_adi",
  "password": "sifre123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "username": "kullanici_adi",
      "role": "viewer"
    }
  }
}
```

#### GET /api/auth/profile
Kullanıcı profili ve rol bazlı izinleri getirir

**Headers:**
```
Authorization: Bearer {jwt_token}
```

#### GET /api/auth/verify
Token doğrulama

**Headers:**
```
Authorization: Bearer {jwt_token}
```

#### PUT /api/auth/users/:userId/role
Kullanıcı rolü güncelleme (sadece admin)

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Body:**
```json
{
  "role": "editor"
}
```

### Haberler (Articles)

#### GET /api/articles
Tüm haberleri listeler (sayfalama ve filtreleme destekler)

**Query Parametreleri:**
- `page` (number): Sayfa numarası (varsayılan: 1)
- `limit` (number): Sayfa başına kayıt (varsayılan: 20)
- `sourceId` (string): Kaynak ID'sine göre filtrele
- `categoryId` (string): Kategori ID'sine göre filtrele
- `startDate` (string): Başlangıç tarihi (ISO format)
- `endDate` (string): Bitiş tarihi (ISO format)
- `search` (string): Arama terimi

#### GET /api/articles/latest
En son haberleri getirir

**Query Parametreleri:**
- `limit` (number): Kayıt sayısı (varsayılan: 10)

#### GET /api/articles/trending
Trend haberleri getirir (son 24 saat)

**Query Parametreleri:**
- `limit` (number): Kayıt sayısı (varsayılan: 10)

#### GET /api/articles/search
Haberlerde arama yapar

**Query Parametreleri:**
- `q` (string): Arama sorgusu (zorunlu)
- `limit` (number): Kayıt sayısı (varsayılan: 20)

#### GET /api/articles/statistics
İstatistikleri getirir

#### GET /api/articles/:id
Tek bir haberi getirir

### RSS Feed Kaynakları (Feeds)

#### GET /api/feeds
Tüm feed kaynaklarını listeler

#### POST /api/feeds
Yeni feed kaynağı ekler

**Body:**
```json
{
  "name": "Haber Sitesi",
  "url": "https://site.com/rss"
}
```

#### PUT /api/feeds/:id
Feed kaynağını günceller

**Body:**
```json
{
  "name": "Yeni İsim",
  "url": "https://yeni-url.com/rss",
  "isActive": true
}
```

#### DELETE /api/feeds/:id
Feed kaynağını siler

#### POST /api/feeds/check
Tüm feed'leri manuel olarak kontrol eder

#### POST /api/feeds/:id/check
Tek bir feed'i manuel olarak kontrol eder

### Gemini AI İşlemleri

#### POST /api/gemini/summarize
Belirtilen tarih aralığındaki haberleri özetler

**Body:**
```json
{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-07T23:59:59Z",
  "prompt": "İsteğe bağlı özel prompt"
}
```

#### POST /api/gemini/search
Gemini ile web araması yapar

**Body:**
```json
{
  "query": "Son dakika haberleri",
  "maxDaysOld": 2
}
```

#### GET /api/gemini/summaries
Geçmiş özetlemeleri listeler

**Query Parametreleri:**
- `page` (number): Sayfa numarası (varsayılan: 1)
- `limit` (number): Sayfa başına kayıt (varsayılan: 10)

#### GET /api/gemini/search-history
Arama geçmişini listeler

**Query Parametreleri:**
- `page` (number): Sayfa numarası (varsayılan: 1)
- `limit` (number): Sayfa başına kayıt (varsayılan: 20)

## 🗄️ Veritabanı Şeması

### FeedSource
- RSS feed kaynaklarını saklar
- URL, isim, aktiflik durumu

### Article
- Haber içeriklerini saklar
- Başlık, açıklama, içerik, resim URL'i, yazar, yayın tarihi

### Category
- Haber kategorileri
- Many-to-many ilişki ile haberlerle bağlantılı

### Summary
- AI tarafından oluşturulan özetler
- Tarih aralığı ve ilişkili haberler

### SearchHistory
- Web arama geçmişi
- Sorgu ve sonuçlar

### SystemLog
- Sistem logları
- Hata, bilgi ve uyarı mesajları

## 🔧 Geliştirme

### Komutlar

```bash
# Geliştirme modunda çalıştır
pnpm dev

# Production build
pnpm build

# Production'da çalıştır
pnpm start

# Prisma Studio (veritabanı görüntüleme)
pnpm prisma:studio

# Yeni migration oluştur
pnpm prisma:migrate
```

### Proje Yapısı

```
src/
├── config/         # Yapılandırma dosyaları
├── controllers/    # Route controller'ları
├── middlewares/    # Express middleware'leri
├── routes/         # API route tanımlamaları
├── services/       # İş mantığı servisleri
├── types/          # TypeScript tip tanımlamaları
└── app.ts          # Ana uygulama dosyası
```

## 📝 Notlar

- Gemini API key'i olmadan özetleme ve web arama özellikleri çalışmaz
- RSS feed'ler varsayılan olarak 15 dakikada bir kontrol edilir
- SQLite veritabanı `prisma/dev.db` konumunda oluşturulur
- Loglar hem konsola hem de veritabanına kaydedilir

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some amazing feature'`)
4. Branch'e push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT

## 👨‍💻 Geliştirici

Muhammed Bayındır
