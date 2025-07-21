/**
 * Starlight Puzzle Oyunu - Ana JavaScript Dosyası
 * Telegram WebApp SDK entegrasyonu ile coin kazanma sistemi
 * 30 saniye süre ile yap-boz oyunu - Touch/Drag optimizasyonu ile mobil uyumlu
 */

class StarlightPuzzleGame {
    constructor() {
        // Telegram WebApp SDK - test modu için güvenli başlatma
        this.tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : {
            ready: () => console.log('Test modu - Telegram hazır'),
            expand: () => console.log('Test modu - Telegram genişletildi'),
            initData: '',
            themeParams: {},
            HapticFeedback: {
                impactOccurred: (style) => console.log('Haptic feedback:', style)
            },
            MainButton: {
                show: () => {},
                hide: () => {},
                setText: () => {},
                onClick: () => {}
            }
        };
        
        this.currentLevel = 1;
        this.score = 0;
        this.totalCoins = 200; // Başlangıç coin miktarı
        this.sessionCoins = 0;
        this.timeRemaining = 60; // 60 saniye süre
        this.gameTimer = null;
        this.puzzleSize = 3; // 3x3 sliding puzzle (9 parça, 1 boş)
        this.puzzleBoard = []; // Ana tahta 
        this.solutionBoard = []; // Çözüm tahtası
        this.emptySlot = { row: 2, col: 2 }; // Boş alan başlangıçta sağ alt köşede
        this.selectedPiece = null;
        this.isGameActive = false;
        this.walletAddress = null;
        this.tronWeb = null;
        this.puzzleReward = 200; // Puzzle başına 200 TL
        this.minWithdraw = 1000; // Minimum çekim miktarı 1000 TL
        
        // Touch/Drag değişkenleri
        this.isDragging = false;
        this.dragStartPos = null;
        this.dragCurrentPos = null;
        this.dragElement = null;
        this.targetElement = null;
        
        // Sliding puzzle için prenses resmi
        this.puzzleImage = 'prenses.png';
        
        this.settings = {
            sound: true,
            vibration: true,
            difficulty: 'easy'
        };
        
        this.init();
    }
    
    init() {
        console.log('Starlight Puzzle oyunu başlatılıyor...');
        
        // Mobile viewport fix
        this.setViewportHeight();
        
        // Telegram WebApp hazırla
        this.tg.ready();
        this.tg.expand();
        
        // Tema uygula
        this.applyTheme();
        
        // Event listener'ları kur
        this.setupEventListeners();
        
        // Guardian drag özelliğini ekle
        this.setupGuardianDrag();
        
        // Viewport resize listener
        window.addEventListener('resize', () => this.setViewportHeight());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.setViewportHeight(), 100);
        });
        
        // Oyunu başlat
        this.startGame();
    }
    
    setViewportHeight() {
        // Mobile viewport height fix - 100vh problemini çözer
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    applyTheme() {
        const themeParams = this.tg.themeParams;
        
        if (themeParams.bg_color) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
        }
        if (themeParams.text_color) {
            document.documentElement.style.setProperty('--tg-theme-text-color', themeParams.text_color);
        }
    }
    
    setupEventListeners() {
        // Modal butonları
        const dailyBonusBtn = document.getElementById('daily-bonus-btn');
        const withdrawBtn = document.getElementById('withdraw-btn');
        const walletBtn = document.getElementById('wallet-btn');
        
        if (dailyBonusBtn) dailyBonusBtn.addEventListener('click', () => this.showDailyBonusModal());
        if (withdrawBtn) withdrawBtn.addEventListener('click', () => this.showWithdrawModal());
        if (walletBtn) walletBtn.addEventListener('click', () => this.showWalletModal());
        
        // Daily bonus modal
        const claimBonusBtn = document.getElementById('claim-bonus-btn');
        const closeBonusModal = document.getElementById('close-bonus-modal');
        if (claimBonusBtn) claimBonusBtn.addEventListener('click', () => this.claimDailyBonus());
        if (closeBonusModal) closeBonusModal.addEventListener('click', () => this.hideDailyBonusModal());
        
        // Withdrawal modal
        const submitWithdrawBtn = document.getElementById('submit-withdraw-btn');
        const closeWithdrawModal = document.getElementById('close-withdraw-modal');
        if (submitWithdrawBtn) submitWithdrawBtn.addEventListener('click', () => this.submitWithdrawRequest());
        if (closeWithdrawModal) closeWithdrawModal.addEventListener('click', () => this.hideWithdrawModal());
        
        // Wallet modal
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        const closeWalletModal = document.getElementById('close-wallet-modal');
        if (connectWalletBtn) connectWalletBtn.addEventListener('click', () => this.connectTronLink());
        if (closeWalletModal) closeWalletModal.addEventListener('click', () => this.hideWalletModal());
        
        // Completion modal
        const nextLevelBtn = document.getElementById('next-level-btn');
        const playAgainBtn = document.getElementById('play-again-btn');
        if (nextLevelBtn) nextLevelBtn.addEventListener('click', () => this.nextLevel());
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.playAgain());
        
        // Rules modal
        const closeRulesModal = document.getElementById('close-rules-modal');
        if (closeRulesModal) closeRulesModal.addEventListener('click', () => this.hideRulesModal());
    }
    
    async startGame() {
        console.log('Puzzle oyunu başlatılıyor...');
        
        // Kullanıcı verilerini yükle
        await this.loadUserData();
        
        // TronLink'i kontrol et
        this.checkTronLink();
        
        // Puzzle tahtasını oluştur
        this.createPuzzleBoard();
        
        // UI'yi güncelle
        this.updateGameUI();
        
        // Yükleme ekranını gizle ve oyunu başlat
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            const gameContainer = document.getElementById('game-container');
            
            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (gameContainer) gameContainer.classList.remove('hidden');
            
            console.log('Yükleme ekranı gizlendi, oyun başlatıldı.');
            
            // İlk puzzle'ı başlat
            this.startNewPuzzle();
        }, 2000);
    }
    
    async loadUserData() {
        try {
            const initData = this.tg.initData;
            
            if (!initData) {
                console.log('Test modunda çalışıyor...');
                this.totalCoins = 200; // Yap-boz için başlangıç coin
                return;
            }
            
            const response = await fetch('/api/coins/balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: initData
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.totalCoins = data.coins || 0;
                console.log('Kullanıcı verisi yüklendi:', data);
            }
        } catch (error) {
            console.error('Kullanıcı verisi yüklenemedi:', error);
            this.totalCoins = 200; // Yap-boz için başlangıç coin
        }
    }
    
    checkTronLink() {
        if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
            this.tronWeb = window.tronWeb;
            this.walletAddress = window.tronWeb.defaultAddress.base58;
            const walletStatus = document.getElementById('wallet-status');
            const walletAddress = document.getElementById('wallet-address');
            const walletInfo = document.getElementById('wallet-info');
            
            if (walletStatus) walletStatus.textContent = 'Bağlı';
            if (walletAddress) walletAddress.textContent = this.walletAddress;
            if (walletInfo) walletInfo.classList.remove('hidden');
        }
    }
    
    createPuzzleBoard() {
        const boardElement = document.getElementById('game-board');
        if (!boardElement) return;

        // 3x3 grid olarak ayarla
        boardElement.style.display = 'grid';
        boardElement.style.gridTemplateColumns = 'repeat(3, 1fr)';
        boardElement.innerHTML = '';

        // Sliding puzzle - 8 resim parçası + 1 boş alan
        this.puzzleBoard = [0, 1, 2, 3, 4, 5, 6, 7, null];
        this.solutionBoard = [0, 1, 2, 3, 4, 5, 6, 7, null];
        
        // Karıştır
        this.shufflePuzzle();
        
        // Ana tahtayı render et
        this.renderPuzzleBoard();
        
        // Çözüm tahtasını oluştur
        this.createSolutionBoard();
        
        console.log('3x3 Prenses Resim Puzzle tahtası oluşturuldu!', this.puzzleBoard);
    }

    // Çözüm tahtasını oluştur - tam prenses fotoğrafı göster
    createSolutionBoard() {
        const solutionElement = document.getElementById('solution-board');
        if (!solutionElement) return;

        // Tam fotoğrafı göstermek için tek bir div kullan - sadece fotoğraf, yazı yok
        solutionElement.innerHTML = '';
        solutionElement.style.backgroundImage = `url('${this.puzzleImage}')`;
        solutionElement.style.backgroundSize = 'cover';
        solutionElement.style.backgroundPosition = 'center';
        solutionElement.style.backgroundRepeat = 'no-repeat';
        solutionElement.style.borderRadius = '15px';
        solutionElement.style.border = '3px solid rgba(255, 215, 0, 0.8)';
        solutionElement.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.3)';
        solutionElement.style.position = 'relative';
        solutionElement.style.overflow = 'hidden';
        
        // HEDEF yazısını kaldırdık, sadece temiz fotoğraf görünecek
    }

    // Sliding puzzle için karıştırma fonksiyonu
    shufflePuzzle() {
        // Çözülebilir bir karışım oluştur
        for (let i = 0; i < 1000; i++) {
            const emptyIndex = this.puzzleBoard.indexOf(null);
            const possibleMoves = this.getPossibleMoves(emptyIndex);
            
            if (possibleMoves.length > 0) {
                const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                this.swapTiles(emptyIndex, randomMove);
            }
        }
    }

    // Boş alana taşınabilecek parçaları bul
    getPossibleMoves(emptyIndex) {
        const moves = [];
        const row = Math.floor(emptyIndex / 3);
        const col = emptyIndex % 3;

        // Üst
        if (row > 0) moves.push((row - 1) * 3 + col);
        // Alt
        if (row < 2) moves.push((row + 1) * 3 + col);
        // Sol
        if (col > 0) moves.push(row * 3 + (col - 1));
        // Sağ
        if (col < 2) moves.push(row * 3 + (col + 1));

        return moves;
    }

    // İki kareyi değiştir
    swapTiles(index1, index2) {
        const temp = this.puzzleBoard[index1];
        this.puzzleBoard[index1] = this.puzzleBoard[index2];
        this.puzzleBoard[index2] = temp;
    }

    // Tahtayı render et - iyileştirilmiş
    renderPuzzleBoard() {
        const boardElement = document.getElementById('game-board');
        if (!boardElement) return;

        boardElement.innerHTML = '';

        for (let i = 0; i < 9; i++) {
            const tileElement = document.createElement('div');
            tileElement.className = 'puzzle-piece';
            tileElement.dataset.index = i;

            if (this.puzzleBoard[i] === null) {
                // Boş alan
                tileElement.className += ' empty-slot';
            } else {
                // Fotoğraf parçası
                const pieceIndex = this.puzzleBoard[i];
                const row = Math.floor(pieceIndex / 3);
                const col = pieceIndex % 3;
                
                // Doğru background position hesaplaması - 3x3 grid için
                // Her parça resmin 1/3'ünü göstermeli
                const bgPosX = (col * 100) / (3 - 1); // 0%, 50%, 100%
                const bgPosY = (row * 100) / (3 - 1); // 0%, 50%, 100%
                
                tileElement.style.backgroundImage = `url('${this.puzzleImage}')`;
                tileElement.style.backgroundSize = '300% 300%'; // 3x3 grid için
                tileElement.style.backgroundPosition = `${bgPosX}% ${bgPosY}%`;
                tileElement.style.backgroundRepeat = 'no-repeat';
                tileElement.className += ' clickable';

                // Tıklama event'i ekle
                tileElement.addEventListener('click', () => this.handleTileClick(i));
                
                // Touch events için mobil uyumluluk
                tileElement.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleTileClick(i);
                });
            }

            boardElement.appendChild(tileElement);
        }
    }

    // Parçaya tıklandığında
    handleTileClick(clickedIndex) {
        if (!this.isGameActive) return;

        const emptyIndex = this.puzzleBoard.indexOf(null);
        const possibleMoves = this.getPossibleMoves(emptyIndex);

        // Tıklanan parça boş alana taşınabilir mi?
        if (possibleMoves.includes(clickedIndex)) {
            this.swapTiles(emptyIndex, clickedIndex);
            this.renderPuzzleBoard();

            // Haptic feedback
            this.tg.HapticFeedback.impactOccurred('light');

            // Puzzle tamamlandı mı kontrol et
            this.checkPuzzleCompletion();
        }
    }

    // Sliding puzzle tamamlandı mı kontrol et
    checkPuzzleCompletion() {
        // Puzzle doğru sırayla dizilmiş mi kontrol et
        for (let i = 0; i < 8; i++) {
            if (this.puzzleBoard[i] !== i) {
                return false;
            }
        }
        
        // Son kare null (boş alan) olmalı
        if (this.puzzleBoard[8] !== null) {
            return false;
        }
        
        // Puzzle tamamlandı!
        this.completePuzzle();
        return true;
    }

    handleDragStart(e, pieceId) {
        if (!this.isGameActive) return;
        
        e.dataTransfer.setData('text/plain', pieceId);
        e.target.style.opacity = '0.5';
        this.selectedPiece = pieceId;
        
        // Haptic feedback
        this.tg.HapticFeedback.impactOccurred('light');
    }

    handleDragEnd(e) {
        e.target.style.opacity = '1';
        this.selectedPiece = null;
    }

    handleDrop(e, slotId) {
        e.preventDefault();
        const pieceId = parseInt(e.dataTransfer.getData('text/plain'));
        
        // Slot boş mu kontrol et
        if (this.puzzleBoard[slotId] !== null) {
            // Slot dolu - haptic feedback
            this.tg.HapticFeedback.impactOccurred('medium');
            return;
        }
        
        // Parçayı yerleştir (doğru/yanlış olsun)
        this.placePiece(pieceId, slotId);
    }

    placePiece(pieceId, slotId) {
        const piece = this.puzzlePieces.find(p => p.id === pieceId);
        const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
        
        if (!piece || !slot || piece.placed) return;
        
        // Parçayı slota yerleştir
        const pieceElement = piece.element.cloneNode(true);
        pieceElement.style.width = '100%';
        pieceElement.style.height = '100%';
        pieceElement.draggable = false;
        pieceElement.style.cursor = 'default';
        
        // Çıkarma butonu ekle
        const removeBtn = document.createElement('div');
        removeBtn.innerHTML = '❌';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '2px';
        removeBtn.style.right = '2px';
        removeBtn.style.background = 'rgba(255,0,0,0.8)';
        removeBtn.style.color = 'white';
        removeBtn.style.fontSize = '12px';
        removeBtn.style.width = '20px';
        removeBtn.style.height = '20px';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.display = 'flex';
        removeBtn.style.alignItems = 'center';
        removeBtn.style.justifyContent = 'center';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.zIndex = '10';
        
        removeBtn.addEventListener('click', () => {
            this.removePiece(pieceId, slotId);
        });
        
        slot.innerHTML = '';
        slot.appendChild(pieceElement);
        slot.appendChild(removeBtn);
        
        // Doğru yerleştirmeyse yeşil, yanlışsa kırmızı kenarlık
        if (pieceId === slotId) {
            slot.style.border = '2px solid #4CAF50';
            slot.style.background = 'rgba(76, 175, 80, 0.1)';
        } else {
            slot.style.border = '2px solid #FF5722';
            slot.style.background = 'rgba(255, 87, 34, 0.1)';
        }
        
        // Orijinal parçayı gizle
        piece.element.style.display = 'none';
        piece.placed = true;
        piece.placedSlot = slotId;
        this.puzzleBoard[slotId] = pieceId;
        
        // Haptic feedback
        this.tg.HapticFeedback.impactOccurred('light');
        
        // Puzzle tamamlandı mı?
        if (this.isPuzzleComplete()) {
            setTimeout(() => this.completePuzzle(), 500);
        }
    }

    // Touch events for mobile
    handleTouchStart(e, pieceId) {
        if (!this.isGameActive) return;
        
        e.preventDefault();
        this.selectedPiece = pieceId;
        
        const touch = e.touches[0];
        this.dragElement = e.target.cloneNode(true);
        this.dragElement.style.position = 'fixed';
        this.dragElement.style.top = touch.clientY - 35 + 'px';
        this.dragElement.style.left = touch.clientX - 35 + 'px';
        this.dragElement.style.zIndex = '1000';
        this.dragElement.style.opacity = '0.8';
        this.dragElement.style.pointerEvents = 'none';
        
        document.body.appendChild(this.dragElement);
        e.target.style.opacity = '0.3';
        
        this.tg.HapticFeedback.impactOccurred('light');
    }

    handleTouchMove(e) {
        if (!this.dragElement) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        this.dragElement.style.top = touch.clientY - 35 + 'px';
        this.dragElement.style.left = touch.clientX - 35 + 'px';
    }

    handleTouchEnd(e) {
        if (!this.dragElement || this.selectedPiece === null) return;
        
        e.preventDefault();
        const touch = e.changedTouches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Drag element'i temizle
        document.body.removeChild(this.dragElement);
        this.dragElement = null;
        
        // Orijinal element'i geri getir
        const originalElement = document.querySelector(`[data-piece-id="${this.selectedPiece}"]`);
        if (originalElement) {
            originalElement.style.opacity = '1';
        }
        
        // Drop kontrolü
        if (elementBelow && elementBelow.classList.contains('puzzle-slot')) {
            const slotId = parseInt(elementBelow.dataset.slotId);
            
            // Slot boş mu kontrol et
            if (this.puzzleBoard[slotId] === null) {
                this.placePiece(this.selectedPiece, slotId);
            } else {
                this.tg.HapticFeedback.impactOccurred('medium');
            }
        }
        
        this.selectedPiece = null;
    }

    showMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.style.position = 'fixed';
        messageElement.style.top = '50%';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translate(-50%, -50%)';
        messageElement.style.background = 'rgba(0, 0, 0, 0.8)';
        messageElement.style.color = 'white';
        messageElement.style.padding = '10px 20px';
        messageElement.style.borderRadius = '10px';
        messageElement.style.fontSize = '16px';
        messageElement.style.zIndex = '2000';
        
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 1500);
    }

    removePiece(pieceId, slotId) {
        const piece = this.puzzlePieces.find(p => p.id === pieceId);
        const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
        
        if (!piece || !slot) return;
        
        // Slotu temizle
        slot.innerHTML = '';
        slot.style.border = '2px dashed #555';
        slot.style.background = 'rgba(255,255,255,0.1)';
        
        // Parçayı geri getir
        piece.element.style.display = 'block';
        piece.placed = false;
        piece.placedSlot = null;
        this.puzzleBoard[slotId] = null;
        
        // Haptic feedback
        this.tg.HapticFeedback.impactOccurred('light');
    }

    isPuzzleComplete() {
        // Tüm parçalar yerleştirildi mi ve hepsi doğru yerde mi kontrol et
        for (let i = 0; i < this.puzzleSize * this.puzzleSize; i++) {
            if (this.puzzleBoard[i] !== i) {
                return false;
            }
        }
        return true;
    }
    
    startNewPuzzle() {
        // Zamanlayıcıyı sıfırla
        this.timeRemaining = 60;
        this.isGameActive = true;
        
        // Yap-bozu karıştır
        this.createPuzzleBoard();
        
        // Timer başlat
        this.startTimer();
        
        // UI güncellemeleri
        this.updateGameUI();
        
        console.log('Yeni puzzle başlatıldı! 60 saniye süre.');
    }
    
    startTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }
        
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            this.updateGameUI();
            
            // Süre uyarıları
            if (this.timeRemaining === 10) {
                this.tg.HapticFeedback.impactOccurred('medium');
                this.showTimeWarning("⏰ 10 saniye kaldı!");
            } else if (this.timeRemaining === 5) {
                this.tg.HapticFeedback.impactOccurred('heavy');
                this.showTimeWarning("⏰ 5 saniye kaldı!");
            }
            
            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }
    
    showTimeWarning(message) {
        const warning = document.createElement('div');
        warning.className = 'time-warning';
        warning.textContent = message;
        document.body.appendChild(warning);
        
        setTimeout(() => {
            if (warning.parentNode) {
                warning.parentNode.removeChild(warning);
            }
        }, 2000);
    }
    
    timeUp() {
        this.isGameActive = false;
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        this.tg.HapticFeedback.impactOccurred('heavy');
        
        // Süre doldu mesajı
        this.showGameOverModal();
    }
    
    completePuzzle() {
        this.isGameActive = false;
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        // Ödül ver
        const reward = this.puzzleReward;
        this.totalCoins += reward;
        this.sessionCoins += reward;
        
        // Başarı animasyonu
        this.showSuccessAnimation(reward);
        
        // Haptic feedback
        this.tg.HapticFeedback.impactOccurred('heavy');
        
        // Tamamlama modalını göster
        setTimeout(() => {
            this.showPuzzleCompleteModal(reward);
        }, 2000);
        
        // Verileri kaydet
        this.saveGameData();
        
        console.log(`Puzzle tamamlandı! +${reward} TL kazandınız!`);
    }
    
    // UI ve Modal Fonksiyonları
    updateGameUI() {
        const levelDisplay = document.getElementById('level-display');
        const scoreDisplay = document.getElementById('score-display');
        const coinsDisplay = document.getElementById('coins-display');
        const movesDisplay = document.getElementById('moves-display');
        const targetScore = document.getElementById('target-score');
        const charLevelMini = document.getElementById('char-level-mini');
        
        if (levelDisplay) levelDisplay.textContent = `Seviye ${this.currentLevel}`;
        if (scoreDisplay) scoreDisplay.textContent = `Süre: ${this.timeRemaining}s`;
        if (coinsDisplay) coinsDisplay.textContent = this.totalCoins;
        if (movesDisplay) movesDisplay.textContent = this.isGameActive ? "Aktif" : "Bekliyor";
        if (targetScore) targetScore.textContent = `${this.puzzleReward} TL`;
        if (charLevelMini) charLevelMini.textContent = this.currentLevel;
        
        // İlerleme çubuğu - süre bazlı
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            const progress = ((60 - this.timeRemaining) / 60) * 100;
            progressBar.style.width = `${Math.max(0, progress)}%`;
        }
    }
    
    showSuccessAnimation(reward) {
        const animation = document.createElement('div');
        animation.className = 'success-animation';
        animation.innerHTML = `
            <div class="success-icon">🎉</div>
            <div class="success-text">3x3 Sliding Puzzle Tamamlandı!</div>
            <div class="reward-text">+${reward} TL Kazandınız!</div>
        `;
        document.body.appendChild(animation);
        
        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 3000);
    }
    
    showPuzzleCompleteModal(reward) {
        const modal = document.getElementById('completion-modal');
        if (!modal) return;
        
        // Modal içeriğini güncelle
        const finalScore = document.getElementById('final-score');
        const earnedCoins = document.getElementById('earned-coins');
        
        if (finalScore) finalScore.textContent = `${60 - this.timeRemaining} saniyede tamamlandı`;
        if (earnedCoins) earnedCoins.textContent = `${reward} TL`;
        
        modal.classList.remove('hidden');
    }
    
    showGameOverModal() {
        // Oyun bitti modalı göster
        const gameOverHtml = `
            <div class="modal" id="game-over-modal">
                <div class="modal-content">
                    <h2>⏰ Süre Doldu!</h2>
                    <p>Puzzle'ı 60 saniyede çözemediniz.</p>
                    
                    <div class="completion-stats">
                        <div class="stat">
                            <span class="stat-label">Süre:</span>
                            <span class="stat-value">60 saniye</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Kazanılan:</span>
                            <span class="stat-value">0 TL 😢</span>
                        </div>
                    </div>

                    <button id="try-again-btn" class="action-btn primary">
                        🔄 Tekrar Dene
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', gameOverHtml);
        
        // Try again butonuna event listener ekle
        document.getElementById('try-again-btn').addEventListener('click', () => {
            document.getElementById('game-over-modal').remove();
            this.startNewPuzzle();
        });
    }
    
    // Oyun fonksiyonları
    nextLevel() {
        this.currentLevel++;
        this.hideCompletionModal();
        this.startNewPuzzle();
    }
    
    playAgain() {
        this.hideCompletionModal();
        this.startNewPuzzle();
    }
    
    resetGame() {
        this.currentLevel = 1;
        this.isGameActive = false;
        this.timeRemaining = 60;
        
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
        
        this.startNewPuzzle();
    }
    
    getEventPos(e) {
        if (e.touches && e.touches.length > 0) {
            // Touch event - mobil
            return {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            // Touch end event
            return {
                x: e.changedTouches[0].clientX,
                y: e.changedTouches[0].clientY
            };
        } else {
            // Mouse event - desktop
            return {
                x: e.clientX,
                y: e.clientY
            };
        }
    }
    
    getDirection(angle) {
        // -45 to 45: sağ, 45 to 135: aşağı, 135 to -135: sol, -135 to -45: yukarı
        if (angle >= -45 && angle <= 45) return 'right';
        if (angle > 45 && angle <= 135) return 'down';
        if (angle > 135 || angle <= -135) return 'left';
        if (angle > -135 && angle < -45) return 'up';
    }
    
    getTargetPosition(row, col, direction) {
        switch (direction) {
            case 'up': return row > 0 ? { row: row - 1, col } : null;
            case 'down': return row < this.boardSize - 1 ? { row: row + 1, col } : null;
            case 'left': return col > 0 ? { row, col: col - 1 } : null;
            case 'right': return col < this.boardSize - 1 ? { row, col: col + 1 } : null;
            default: return null;
        }
    }
    
    getCandyAt(row, col) {
        const boardElement = document.getElementById('game-board');
        if (!boardElement) return null;
        
        const index = row * this.boardSize + col;
        return boardElement.children[index];
    }
    
    resetDragState() {
        this.dragElement = null;
        this.targetElement = null;
        this.dragStartPos = null;
        this.dragCurrentPos = null;
        
        // Tüm highlight'ları temizle
        document.querySelectorAll('.candy.selected, .candy.target-highlight').forEach(candy => {
            candy.classList.remove('selected', 'target-highlight');
        });
    }
    
    removeInitialMatches() {
        let hasMatches = true;
        let iterations = 0;
        while (hasMatches && iterations < 10) {
            hasMatches = false;
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (this.checkMatch(row, col)) {
                        this.gameBoard[row][col] = Math.floor(Math.random() * this.starTypes.length);
                        hasMatches = true;
                    }
                }
            }
            iterations++;
        }
        this.refreshBoard();
    }
    
    swapCandies(candy1, candy2) {
        // Yıldızları yer değiştir
        const temp = this.gameBoard[candy1.row][candy1.col];
        this.gameBoard[candy1.row][candy1.col] = this.gameBoard[candy2.row][candy2.col];
        this.gameBoard[candy2.row][candy2.col] = temp;
        
        // Eşleşme kontrolü
        const hasMatch = this.checkMatch(candy1.row, candy1.col) || this.checkMatch(candy2.row, candy2.col);
        
        if (hasMatch) {
            this.moves--;
            this.processMatches();
            this.refreshBoard();
            this.updateUI();
            
            // Haptic feedback
            this.tg.HapticFeedback.impactOccurred('medium');
        } else {
            // Eşleşme yoksa geri al
            this.gameBoard[candy2.row][candy2.col] = this.gameBoard[candy1.row][candy1.col];
            this.gameBoard[candy1.row][candy1.col] = temp;
            
            // Hafif vibrasyon - yanlış hamle
            this.tg.HapticFeedback.impactOccurred('light');
        }
    }
    
    checkMatch(row, col) {
        const candyType = this.gameBoard[row][col];
        
        // Yatay kontrol
        let horizontalCount = 1;
        // Sol
        for (let c = col - 1; c >= 0 && this.gameBoard[row][c] === candyType; c--) {
            horizontalCount++;
        }
        // Sağ
        for (let c = col + 1; c < this.boardSize && this.gameBoard[row][c] === candyType; c++) {
            horizontalCount++;
        }
        
        // Dikey kontrol
        let verticalCount = 1;
        // Yukarı
        for (let r = row - 1; r >= 0 && this.gameBoard[r][col] === candyType; r--) {
            verticalCount++;
        }
        // Aşağı
        for (let r = row + 1; r < this.boardSize && this.gameBoard[r][col] === candyType; r++) {
            verticalCount++;
        }
        
        return horizontalCount >= 3 || verticalCount >= 3;
    }
    
    processMatches() {
        const matchedCandies = [];
        
        // Tüm eşleşmeleri bul
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.checkMatch(row, col)) {
                    matchedCandies.push({ row, col });
                }
            }
        }
        
        if (matchedCandies.length > 0) {
            // Puan hesapla
            const points = matchedCandies.length * 100;
            const coins = Math.floor(points / 100);
            
            this.score += points;
            this.sessionCoins += coins;
            this.totalCoins += coins;
            
            // Eşleşen yıldızları kaldır
            matchedCandies.forEach(candy => {
                this.gameBoard[candy.row][candy.col] = null;
            });
            
            // Animasyon göster
            this.showScoreAnimation(points, coins);
            
            // Yıldızları düşür
            this.dropCandies();
            
            // Yeni yıldızlar ekle
            this.fillEmptySpaces();
            
            // Seviye kontrolü
            this.checkLevelCompletion();
            
            // Güçlü haptic feedback - başarılı eşleşme
            this.tg.HapticFeedback.impactOccurred('heavy');
        }
    }
    
    dropCandies() {
        for (let col = 0; col < this.boardSize; col++) {
            let writeIndex = this.boardSize - 1;
            
            for (let row = this.boardSize - 1; row >= 0; row--) {
                if (this.gameBoard[row][col] !== null) {
                    this.gameBoard[writeIndex][col] = this.gameBoard[row][col];
                    if (writeIndex !== row) {
                        this.gameBoard[row][col] = null;
                    }
                    writeIndex--;
                }
            }
        }
    }
    
    fillEmptySpaces() {
        for (let col = 0; col < this.boardSize; col++) {
            for (let row = 0; row < this.boardSize; row++) {
                if (this.gameBoard[row][col] === null) {
                    this.gameBoard[row][col] = Math.floor(Math.random() * this.starTypes.length);
                }
            }
        }
    }
    
    refreshBoard() {
        const boardElement = document.getElementById('game-board');
        if (!boardElement) return;
        
        const candyElements = boardElement.querySelectorAll('.candy');
        
        candyElements.forEach((element, index) => {
            const row = Math.floor(index / this.boardSize);
            const col = index % this.boardSize;
            const candyType = this.gameBoard[row][col];
            
            element.textContent = this.starTypes[candyType];
            element.className = `candy candy-${candyType}`;
            element.dataset.row = row;
            element.dataset.col = col;
        });
    }
    
    showScoreAnimation(points, coins) {
        const animation = document.createElement('div');
        animation.className = 'score-animation';
        animation.textContent = `+${points} puan ⭐ +${coins} coin 💰`;
        document.body.appendChild(animation);
        
        setTimeout(() => {
            animation.remove();
        }, 2500);
    }
    
    updateUI() {
        const levelDisplay = document.getElementById('level-display');
        const scoreDisplay = document.getElementById('score-display');
        const coinsDisplay = document.getElementById('coins-display');
        const movesDisplay = document.getElementById('moves-display');
        const targetScore = document.getElementById('target-score');
        const progressBar = document.getElementById('progress-bar');
        const charLevelMini = document.getElementById('char-level-mini');
        
        if (levelDisplay) levelDisplay.textContent = `Seviye ${this.currentLevel}`;
        if (scoreDisplay) scoreDisplay.textContent = `Skor: ${this.score.toLocaleString()}`;
        if (coinsDisplay) coinsDisplay.textContent = this.totalCoins.toLocaleString();
        if (movesDisplay) movesDisplay.textContent = this.moves;
        if (targetScore) targetScore.textContent = this.targetScore.toLocaleString();
        if (charLevelMini) charLevelMini.textContent = this.currentLevel;
        
        // İlerleme çubuğu
        if (progressBar) {
            const progress = Math.min((this.score / this.targetScore) * 100, 100);
            progressBar.style.width = `${progress}%`;
        }
    }
    
    checkLevelCompletion() {
        if (this.score >= this.targetScore) {
            setTimeout(() => this.completeLevel(), 1000);
        } else if (this.moves <= 0) {
            setTimeout(() => this.gameOver(), 1000);
        }
    }
    
    async completeLevel() {
        console.log('Seviye tamamlandı!');
        
        // Oyun verilerini backend'e kaydet
        await this.saveGameData();
        
        // Tamamlama modalını göster
        this.showCompletionModal();
        
        // Güçlü haptic feedback
        this.tg.HapticFeedback.impactOccurred('heavy');
    }
    
    async saveGameData() {
        try {
            const initData = this.tg.initData;
            
            if (initData) {
                const response = await fetch('/api/game/finish', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        initData: initData,
                        score: this.score,
                        level: this.currentLevel,
                        matches: Math.floor(this.score / 100),
                        coinsEarned: this.sessionCoins
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Oyun verisi kaydedildi:', data);
                }
            }
        } catch (error) {
            console.error('Oyun verisi kaydedilemedi:', error);
        }
    }
    
    gameOver() {
        alert('🌟 Oyun bitti! Hamleniz kalmadı. Yeni oyun başlatılıyor...');
        this.resetGame();
    }
    
    nextLevel() {
        this.currentLevel++;
        this.targetScore = Math.floor(this.targetScore * 1.5);
        this.moves = Math.min(30 + this.currentLevel, 50);
        this.score = 0;
        this.sessionCoins = 0;
        
        this.hideCompletionModal();
        this.createBoard();
        this.updateUI();
    }
    
    playAgain() {
        this.resetGame();
        this.hideCompletionModal();
    }
    
    resetGame() {
        this.currentLevel = 1;
        this.score = 0;
        this.sessionCoins = 0;
        this.moves = 30;
        this.targetScore = 10000;
        
        this.createBoard();
        this.updateUI();
    }
    
    // Modal fonksiyonları
    showDailyBonusModal() {
        const modal = document.getElementById('daily-bonus-modal');
        if (modal) modal.classList.remove('hidden');
    }
    
    hideDailyBonusModal() {
        const modal = document.getElementById('daily-bonus-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    async claimDailyBonus() {
        try {
            const initData = this.tg.initData;
            
            const response = await fetch('/api/coins/daily-bonus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: initData || ''
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.totalCoins = data.new_balance || (this.totalCoins + 50);
                    this.updateUI();
                    alert(`🎁 ${data.bonus_amount || 50} coin bonus aldınız!`);
                    
                    // Haptic feedback
                    this.tg.HapticFeedback.impactOccurred('heavy');
                } else {
                    alert(data.message || 'Bugün bonus aldınız!');
                }
            }
        } catch (error) {
            console.error('Bonus alma hatası:', error);
            // Test modunda bonus ver
            this.totalCoins += 50;
            this.updateUI();
            alert('🎁 50 coin bonus aldınız!');
        }
        
        this.hideDailyBonusModal();
    }
    
    showWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        const currentBalance = document.getElementById('current-balance');
        if (currentBalance) currentBalance.textContent = this.totalCoins.toLocaleString();
        if (modal) modal.classList.remove('hidden');
    }
    
    hideWithdrawModal() {
        const modal = document.getElementById('withdraw-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    async submitWithdrawRequest() {
        const amountInput = document.getElementById('withdraw-amount');
        const tronAddressInput = document.getElementById('tron-address');
        
        if (!amountInput || !tronAddressInput) return;
        
        const amount = parseInt(amountInput.value);
        const tronAddress = tronAddressInput.value.trim();
        
        if (!amount || amount < 1000) {
            alert('⚠️ Minimum 1000 coin çekebilirsiniz!');
            return;
        }
        
        if (amount > this.totalCoins) {
            alert('⚠️ Yetersiz bakiye!');
            return;
        }
        
        if (!tronAddress || !tronAddress.startsWith('T') || tronAddress.length !== 34) {
            alert('⚠️ Geçerli bir TRON adresi girin!');
            return;
        }
        
        try {
            const initData = this.tg.initData;
            
            const response = await fetch('/api/withdrawal/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    initData: initData || '',
                    amount: amount,
                    tronAddress: tronAddress
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.totalCoins -= amount;
                    this.updateUI();
                    alert(`✅ ${data.message || 'Çekim talebi oluşturuldu!'}`);
                    
                    // Input'ları temizle
                    amountInput.value = '';
                    tronAddressInput.value = '';
                } else {
                    alert(`❌ ${data.message || 'Çekim talebi oluşturulamadı!'}`);
                }
            }
        } catch (error) {
            console.error('Çekim hatası:', error);
            alert('❌ Çekim talebi gönderilemedi!');
        }
        
        this.hideWithdrawModal();
    }
    
    showWalletModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) modal.classList.remove('hidden');
    }
    
    hideWalletModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    async connectTronLink() {
        if (window.tronWeb) {
            try {
                await window.tronWeb.request({ method: 'tron_requestAccounts' });
                this.checkTronLink();
                alert('✅ TronLink başarıyla bağlandı!');
            } catch (error) {
                alert('❌ TronLink bağlantısı başarısız!');
            }
        } else {
            alert('📱 TronLink uygulamasını yükleyin: https://www.tronlink.org/');
            // Telegram'da link açma
            if (this.tg.openLink) {
                this.tg.openLink('https://www.tronlink.org/');
            }
        }
        
        this.hideWalletModal();
    }
    
    showCompletionModal() {
        const modal = document.getElementById('completion-modal');
        const finalScore = document.getElementById('final-score');
        const earnedCoins = document.getElementById('earned-coins');
        
        if (finalScore) finalScore.textContent = this.score.toLocaleString();
        if (earnedCoins) earnedCoins.textContent = this.sessionCoins;
        if (modal) modal.classList.remove('hidden');
    }
    
    hideCompletionModal() {
        const modal = document.getElementById('completion-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    hideRulesModal() {
        const modal = document.getElementById('rules-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    setupGuardianDrag() {
        const guardian = document.querySelector('.character-mini');
        if (!guardian) return;
        
        let isDragging = false;
        let startX, startY;
        let offsetX, offsetY;
        
        // Mouse events
        guardian.addEventListener('mousedown', (e) => {
            isDragging = true;
            guardian.style.transition = 'none';
            
            const rect = guardian.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });
        
        // Touch events for mobile
        guardian.addEventListener('touchstart', (e) => {
            isDragging = true;
            guardian.style.transition = 'none';
            
            const rect = guardian.getBoundingClientRect();
            const touch = e.touches[0];
            offsetX = touch.clientX - rect.left;
            offsetY = touch.clientY - rect.top;
            
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
            e.preventDefault();
        });
        
        function handleMouseMove(e) {
            if (!isDragging) return;
            
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            
            // Keep within screen bounds
            const maxX = window.innerWidth - guardian.offsetWidth;
            const maxY = window.innerHeight - guardian.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            guardian.style.left = constrainedX + 'px';
            guardian.style.top = constrainedY + 'px';
            guardian.style.right = 'auto';
        }
        
        function handleMouseUp() {
            isDragging = false;
            guardian.style.transition = 'all 0.3s ease';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
        
        function handleTouchMove(e) {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const newX = touch.clientX - offsetX;
            const newY = touch.clientY - offsetY;
            
            // Keep within screen bounds
            const maxX = window.innerWidth - guardian.offsetWidth;
            const maxY = window.innerHeight - guardian.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));
            
            guardian.style.left = constrainedX + 'px';
            guardian.style.top = constrainedY + 'px';
            guardian.style.right = 'auto';
            
            e.preventDefault();
        }
        
        function handleTouchEnd() {
            isDragging = false;
            guardian.style.transition = 'all 0.3s ease';
            
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        }
    }
}

// Oyunu başlat
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM yüklendi, Starlight Puzzle başlatılıyor...');
    new StarlightPuzzleGame();
});
