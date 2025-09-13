// Standart kategori listesi
export const STANDARD_CATEGORIES = [
  'Spor',
  'Ekonomi',
  'Siyaset',
  'Teknoloji',
  'Sağlık',
  'Eğitim',
  'Kültür-Sanat',
  'Yaşam',
  'Gündem',
  'Dünya',
  'Magazin',
  'Bilim',
  'Otomobil',
  'Yerel',
  'Asayiş',
  'Çevre',
  'Turizm',
  'Gıda',
  'Emlak',
  'Hukuk',
  'Diğer'
] as const;

export type StandardCategory = typeof STANDARD_CATEGORIES[number];

// Kategori eşleştirme kuralları
export const CATEGORY_MAPPINGS: Record<string, StandardCategory> = {
  // Spor
  'spor': 'Spor',
  'futbol': 'Spor',
  'basketbol': 'Spor',
  'voleybol': 'Spor',
  'fikstur': 'Spor',
  'fikstür': 'Spor',
  'transfer': 'Spor',
  'şampiyonlar ligi': 'Spor',
  
  // Ekonomi
  'ekonomi': 'Ekonomi',
  'borsa': 'Ekonomi',
  'döviz': 'Ekonomi',
  'piyasa': 'Ekonomi',
  'finans': 'Ekonomi',
  'iş': 'Ekonomi',
  'ticaret': 'Ekonomi',
  
  // Siyaset
  'siyaset': 'Siyaset',
  'politika': 'Siyaset',
  'seçim': 'Siyaset',
  'meclis': 'Siyaset',
  
  // Teknoloji
  'teknoloji': 'Teknoloji',
  'bilim teknoloji': 'Teknoloji',
  'yazılım': 'Teknoloji',
  'donanım': 'Teknoloji',
  'internet': 'Teknoloji',
  'oyun': 'Teknoloji',
  
  // Sağlık
  'sağlık': 'Sağlık',
  'hastane': 'Sağlık',
  'doktor': 'Sağlık',
  'tıp': 'Sağlık',
  'covid': 'Sağlık',
  'pandemi': 'Sağlık',
  
  // Eğitim
  'eğitim': 'Eğitim',
  'okul': 'Eğitim',
  'üniversite': 'Eğitim',
  'öğrenci': 'Eğitim',
  'sınav': 'Eğitim',
  'yks': 'Eğitim',
  'lgs': 'Eğitim',
  
  // Kültür-Sanat
  'kültür': 'Kültür-Sanat',
  'sanat': 'Kültür-Sanat',
  'kültür sanat': 'Kültür-Sanat',
  'sinema': 'Kültür-Sanat',
  'tiyatro': 'Kültür-Sanat',
  'müzik': 'Kültür-Sanat',
  'konser': 'Kültür-Sanat',
  'sergi': 'Kültür-Sanat',
  
  // Yaşam
  'yaşam': 'Yaşam',
  'hayat': 'Yaşam',
  'lifestyle': 'Yaşam',
  'kadın': 'Yaşam',
  'erkek': 'Yaşam',
  'moda': 'Yaşam',
  'güzellik': 'Yaşam',
  
  // Gündem
  'gündem': 'Gündem',
  'güncel': 'Gündem',
  'son dakika': 'Gündem',
  'genel': 'Gündem',
  'haber': 'Gündem',
  'haberler': 'Gündem',
  
  // Yerel (Şehir haberleri)
  'gaziantep': 'Yerel',
  'gaziantep haber': 'Yerel',
  'şehitkamil': 'Yerel',
  'şahinbey': 'Yerel',
  'istanbul': 'Yerel',
  'ankara': 'Yerel',
  'izmir': 'Yerel',
  'yerel': 'Yerel',
  'kent': 'Yerel',
  
  // Asayiş
  'asayiş': 'Asayiş',
  'polis': 'Asayiş',
  'güvenlik': 'Asayiş',
  'adliye': 'Asayiş',
  'kaza': 'Asayiş',
  
  // Bilim
  'bilim': 'Bilim',
  'araştırma': 'Bilim',
  'uzay': 'Bilim',
  'keşif': 'Bilim',
  
  // Magazin
  'magazin': 'Magazin',
  'ünlü': 'Magazin',
  'dedikodu': 'Magazin',
  
  // Dünya
  'dünya': 'Dünya',
  'uluslararası': 'Dünya',
  'avrupa': 'Dünya',
  'amerika': 'Dünya',
  'asya': 'Dünya',
  
  // Otomobil
  'otomobil': 'Otomobil',
  'otomotiv': 'Otomobil',
  'araba': 'Otomobil',
  'motor': 'Otomobil',
  
  // Hayvanlar
  'hayvanlar alemi': 'Çevre',
  'hayvan': 'Çevre',
  'doğa': 'Çevre',
  'çevre': 'Çevre',
  
  // Turizm
  'turizm': 'Turizm',
  'tatil': 'Turizm',
  'gezi': 'Turizm',
  'seyahat': 'Turizm',
};

// AI prompt for category normalization
export const CATEGORY_NORMALIZATION_PROMPT = `
Sen bir haber kategori uzmanısın. Sana verilen kategori listesini aşağıdaki standart kategorilerden uygun olanlarla eşleştir.

Standart Kategoriler:
${STANDARD_CATEGORIES.join(', ')}

Kurallar:
1. Her kategoriyi sadece BİR standart kategori ile eşleştir
2. Eğer hiçbir kategori uymuyorsa "Diğer" kategorisini kullan
3. Büyük/küçük harf farkını göz ardı et
4. Benzer anlamdaki kelimeleri aynı kategoriye eşleştir (örn: "FİKSTÜR" -> "Spor")
5. Şehir isimleri "Yerel" kategorisine gider
6. Sadece JSON formatında yanıt ver

Örnek Input: ["SPOR", "Gaziantep Haber", "FİKSTÜR", "EKONOMİ"]
Örnek Output: {"SPOR": "Spor", "Gaziantep Haber": "Yerel", "FİKSTÜR": "Spor", "EKONOMİ": "Ekonomi"}
`;
