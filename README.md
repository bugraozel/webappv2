# Telegram Puzzle Game - Frontend

Bu klasör GitHub Pages'te host edilen frontend dosyalarını içerir.

## 🎮 Özellikler

- **Sabit Puzzle Resmi**: Her oyunda aynı güzel gradient resim kullanılır
- **30 Saniye Challenge**: Süre sınırı ile heyecanlı oyun deneyimi
- **Parça Seçip Yerleştirme**: Kolay ve sezgisel oyun kontrolü
- **Telegram Web App**: Telegram içinde çalışır
- **TRON Ödülleri**: Kazanılan paralar TRC20 olarak çekilebilir

## 🎯 Oyun Mantığı

### Parça Seçip Yerleştirme Sistemi
- 4x4 grid'de 15 puzzle parçası
- Parçaları tıklayarak seçin
- Boş alanlara tıklayarak yerleştirin
- Doğru yere yerleştirilen parçalar yeşil kenarlık alır
- Seçilen parça sarı kenarlık ile vurgulanır
- Boş alanlar animasyonlu olarak yanıp söner

### Sabit Resim Kullanımı
- Her oyunda aynı güzel renkli gradient resim kullanılır
- Basit ve anlaşılır oyun deneyimi
- Mobil cihazlarda kolay kullanım

## 🚀 Deployment

1. Bu klasördeki dosyaları GitHub repository'nize yükleyin
2. GitHub Pages'i etkinleştirin
3. `index.html` içindeki `API_BASE_URL` değişkenini sunucu adresinizle güncelleyin

## 📱 Kullanım

- Telegram'da bot ile konuşun
- "🎮 Oyunu Başlat" butonuna tıklayın
- Web app açılır
- Otomatik olarak sabit puzzle resmi yüklenir
- 30 saniye içinde puzzle'ı tamamlayın
- 200 TL kazanın!
- 500 TL biriktirip TRON çekin

## 🔧 Güncelleme

Frontend'i güncelledikten sonra:
1. Dosyaları GitHub'a push edin
2. GitHub Pages otomatik olarak güncelleyecektir
3. Değişikliklerin yansıması 5-10 dakika sürebilir

## 🎯 API Endpoints

- Backend URL: `https://your-server-url.com/api`
- Authentication: JWT token
- Game endpoints: `/game/start`, `/game/move`, `/game/complete`
- User endpoints: `/user/balance`, `/user/history`
- Withdrawal: `/withdrawal/request`
