/**
 * THE TRIPATHI ARCHIVE & FRIENDSHIP CAPSULE • CLIENT APP
 * Neo-Brutalist Zine & Real-time Vault
 * Created for Shaurya Tripathi
 */

document.addEventListener('DOMContentLoaded', () => {
  // ================= STATE =================
  let currentStream = null;
  let activeCameraMode = false;
  let currentFilter = 'none';
  let activeMood = 'Bakchodi';
  let vaultToken = sessionStorage.getItem('tripathi_vault_token') || null;
  let allVaultMemories = [];
  let currentVaultMoodFilter = 'all';
  let currentVaultSearch = '';
  let activeDetailMemory = null;
  let slideshowIdx = 0;
  let lastMemoryCount = -1;

  // Audio Synthesizer via Web Audio API (100% self-contained, no external files)
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },
    playShutter() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // High click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.08);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);

      // Noise thud
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, t + 0.04);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      whiteNoise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      whiteNoise.start(t + 0.04);
    },
    playStamp() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    },
    playPop() {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }
  };

  // ================= DOM ELEMENTS =================
  const topMemoryCountBadge = document.getElementById('topMemoryCountBadge');
  const publicViewContainer = document.getElementById('publicViewContainer');
  const vaultSanctuaryView = document.getElementById('vaultSanctuaryView');

  // Nav Triggers
  const vaultKeyTrigger = document.getElementById('vaultKeyTrigger');
  const navVaultLink = document.getElementById('navVaultLink');
  const mastheadVaultBtn = document.getElementById('mastheadVaultBtn');

  // Photobooth Elements
  const photoboothDropzone = document.getElementById('photobooth-dropzone');
  const cameraVideo = document.getElementById('cameraVideo');
  const kioskImagePreview = document.getElementById('kioskImagePreview');
  const cameraFlashOverlay = document.getElementById('cameraFlashOverlay');
  const countdownBox = document.getElementById('countdownBox');
  const countdownNumber = document.getElementById('countdownNumber');
  const placedStickersLayer = document.getElementById('placedStickersLayer');
  const dropIndicator = document.getElementById('dropIndicator');
  const modeLiveBtn = document.getElementById('modeLiveBtn');
  const modeUploadBtn = document.getElementById('modeUploadBtn');
  const retakePhotoBtn = document.getElementById('retakePhotoBtn');
  const photoFileInput = document.getElementById('photoFileInput');
  const clearStickersBtn = document.getElementById('clearStickersBtn');
  const shutterBtn = document.getElementById('shutterBtn');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const stickerChips = document.querySelectorAll('.sticker-chip');
  const kioskToast = document.getElementById('kioskToast');
  const presetCandidBtns = document.querySelectorAll('.preset-candid-btn');

  // Postcard Elements
  const vaultDispatchForm = document.getElementById('vaultDispatchForm');
  const aliasInput = document.getElementById('aliasInput');
  const moodBtns = document.querySelectorAll('.mood-btn');
  const postcardMessage = document.getElementById('postcardMessage');
  const wordCounterBadge = document.getElementById('wordCounterBadge');
  const wordLimitWarning = document.getElementById('wordLimitWarning');
  const submitPostcardBtn = document.getElementById('submitPostcardBtn');
  const submissionReceipt = document.getElementById('submissionReceipt');
  const receiptMemoryId = document.getElementById('receiptMemoryId');
  const resetPostcardBtn = document.getElementById('resetPostcardBtn');

  // Friends' Capsule Public Elements
  const publicCapsuleGrid = document.getElementById('publicCapsuleGrid');
  const publicCapsuleEmptyState = document.getElementById('publicCapsuleEmptyState');
  const publicCapsuleCountBadge = document.getElementById('publicCapsuleCountBadge');

  // Quotes Lore Elements
  const quoteTickerText = document.getElementById('quoteTickerText');
  const nextQuoteBtn = document.getElementById('nextQuoteBtn');

  // Cassette Elements
  const cassettePlayBtn = document.getElementById('cassettePlayBtn');
  const playBtnText = document.getElementById('playBtnText');
  const playIcon = document.getElementById('playIcon');
  const cassetteNextBtn = document.getElementById('cassetteNextBtn');
  const currentTrackTitle = document.getElementById('currentTrackTitle');
  const spoolLeft = document.getElementById('spoolLeft');
  const spoolRight = document.getElementById('spoolRight');
  const tapeCounter = document.getElementById('tapeCounter');
  const eqBars = document.querySelectorAll('.eq-bar');
  const youtubeDock = document.getElementById('youtubeDock');
  const closeDockBtn = document.getElementById('closeDockBtn');
  const youtubeEmbedTarget = document.getElementById('youtubeEmbedTarget');

  // Modals & Auth Elements
  const vaultLoginModal = document.getElementById('vaultLoginModal');
  const closePinModalBtn = document.getElementById('closePinModalBtn');
  const vaultLoginForm = document.getElementById('vaultLoginForm');
  const vaultPasswordInput = document.getElementById('vaultPasswordInput');
  const togglePasswordVisibilityBtn = document.getElementById('togglePasswordVisibilityBtn');
  const eyeIcon = document.getElementById('eyeIcon');
  const passwordErrorMessage = document.getElementById('passwordErrorMessage');
  const openResetPasswordModalBtn = document.getElementById('openResetPasswordModalBtn');

  // Change Password Modal Elements
  const changePasswordModal = document.getElementById('changePasswordModal');
  const closeChangePasswordBtn = document.getElementById('closeChangePasswordBtn');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const currentPasswordInput = document.getElementById('currentPasswordInput');
  const newPasswordInput = document.getElementById('newPasswordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const changePassMessage = document.getElementById('changePassMessage');
  const vaultChangePasswordBtn = document.getElementById('vaultChangePasswordBtn');

  // Vault View Elements
  const corkboardGrid = document.getElementById('corkboardGrid');
  const vaultEmptyState = document.getElementById('vaultEmptyState');
  const vaultSearchInput = document.getElementById('vaultSearchInput');
  const vaultFilterPills = document.querySelectorAll('.vault-filter-pill');
  const vaultLockBtn = document.getElementById('vaultLockBtn');
  const vaultExportBtn = document.getElementById('vaultExportBtn');
  const vaultSlideshowBtn = document.getElementById('vaultSlideshowBtn');

  // Detail Modal Elements
  const detailModal = document.getElementById('detailModal');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  const detailMoodBadge = document.getElementById('detailMoodBadge');
  const detailTimestamp = document.getElementById('detailTimestamp');
  const detailPhotoImg = document.getElementById('detailPhotoImg');
  const detailStickersLayer = document.getElementById('detailStickersLayer');
  const detailFriendName = document.getElementById('detailFriendName');
  const detailWordCount = document.getElementById('detailWordCount');
  const detailNoteText = document.getElementById('detailNoteText');
  const downloadKeepsakeBtn = document.getElementById('downloadKeepsakeBtn');
  const deleteMemoryBtn = document.getElementById('deleteMemoryBtn');
  const detailTogglePublicBtn = document.getElementById('detailTogglePublicBtn');
  const detailTogglePublicText = document.getElementById('detailTogglePublicText');

  // Slideshow Elements
  const slideshowModal = document.getElementById('slideshowModal');
  const closeSlideshowBtn = document.getElementById('closeSlideshowBtn');
  const slideshowImg = document.getElementById('slideshowImg');
  const slideshowAuthor = document.getElementById('slideshowAuthor');
  const slideshowNote = document.getElementById('slideshowNote');
  const slideshowCounter = document.getElementById('slideshowCounter');
  const prevSlideBtn = document.getElementById('prevSlideBtn');
  const nextSlideBtn = document.getElementById('nextSlideBtn');

  // ================= 1. DHH CASSETTE PLAYER =================
  const dhhPlaylist = [
    { title: "11K", artist: "Seedhe Maut", id: "Q5r9-k7xYGw" },
    { title: "Namastute", artist: "Seedhe Maut", id: "YuWUJg3Kdks" },
    { title: "Hola Amigo", artist: "KR$NA ft. Seedhe Maut", id: "De9VIp37CjY" },
    { title: "Prarthana", artist: "KR$NA", id: "OKPAPX_fGVw" },
    { title: "Fateh", artist: "Karma", id: "2tr6PWlCEqs" },
    { title: "Angaar", artist: "Ikka ft. Raftaar", id: "GpjrKSyjXDE" },
    { title: "No Cap", artist: "KR$NA", id: "6bJ86T7L3Gg" },
    { title: "Nanchaku", artist: "Seedhe Maut ft. MC Stan", id: "1G-N5_bZgOQ" }
  ];

  let currentTrackIdx = -1;
  let isDhhPlaying = false;
  let tapeTimer = null;
  let tapeSeconds = 0;

  function setCassettePlaying(playing) {
    isDhhPlaying = playing;
    if (playing) {
      playBtnText.textContent = 'PAUSE TAPE';
      playIcon.textContent = 'pause';
      spoolLeft.classList.add('spin-slow');
      spoolRight.classList.add('spin-slow');
      eqBars.forEach(b => b.classList.add('active'));

      clearInterval(tapeTimer);
      tapeTimer = setInterval(() => {
        tapeSeconds++;
        const m = String(Math.floor(tapeSeconds / 60)).padStart(2, '0');
        const s = String(tapeSeconds % 60).padStart(2, '0');
        if (tapeCounter) tapeCounter.textContent = `${m}:${s}`;
      }, 1000);
    } else {
      playBtnText.textContent = 'PLAY TAPE';
      playIcon.textContent = 'play_arrow';
      spoolLeft.classList.remove('spin-slow');
      spoolRight.classList.remove('spin-slow');
      eqBars.forEach(b => b.classList.remove('active'));
      clearInterval(tapeTimer);
    }
  }

  function playDhhTrack(index) {
    if (index === undefined || index === -1) {
      let nextIdx = Math.floor(Math.random() * dhhPlaylist.length);
      if (nextIdx === currentTrackIdx && dhhPlaylist.length > 1) {
        nextIdx = (nextIdx + 1) % dhhPlaylist.length;
      }
      currentTrackIdx = nextIdx;
    } else {
      currentTrackIdx = index;
    }

    const track = dhhPlaylist[currentTrackIdx];
    currentTrackTitle.textContent = `${track.artist} - ${track.title}`;

    if (youtubeEmbedTarget) {
      youtubeEmbedTarget.innerHTML = `
        <iframe 
          src="https://www.youtube-nocookie.com/embed/${track.id}?autoplay=1&enablejsapi=1&rel=0" 
          title="${track.title} by ${track.artist}" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen 
          class="w-full h-full border-0">
        </iframe>
      `;
    }

    setCassettePlaying(true);
  }

  if (cassettePlayBtn) {
    cassettePlayBtn.addEventListener('click', () => {
      AudioEngine.init();
      if (!isDhhPlaying) {
        if (currentTrackIdx === -1) {
          playDhhTrack();
        } else {
          setCassettePlaying(true);
        }
      } else {
        setCassettePlaying(false);
      }
    });
  }

  if (cassetteNextBtn) {
    cassetteNextBtn.addEventListener('click', () => {
      AudioEngine.init();
      playDhhTrack();
    });
  }

  if (closeDockBtn && youtubeDock) {
    closeDockBtn.addEventListener('click', () => {
      youtubeDock.classList.add('hidden');
    });
  }

  // ================= 2. QUOTES LORE ROTATOR =================
  const gangQuotes = [
    { quote: '"Bhai bas 5 minute mein nikal raha hoon."', sub: '(still sleeping in bed at home)' },
    { quote: '"Chai peene chal, poori zindagi sort kar denge."', sub: '(ordered 4 cups, life still unsorted)' },
    { quote: '"Instagram pe mat daalna bc, mummy dekh lengi."', sub: '(Varanasi gang secret protocol)' },
    { quote: '"Plan fix hai: kal subah 6 baje gym."', sub: '(legend has it, they never woke up)' },
    { quote: '"Abe tu sun toh sahi, hua kya..."', sub: '(starts a 52-minute passionate rant)' },
    { quote: '"Bhai paisa toh haath ka mail hai, tu chai mangwa bas."', sub: '(never paid the chai bill)' }
  ];
  let quoteIdx = 0;

  if (nextQuoteBtn && quoteTickerText) {
    nextQuoteBtn.addEventListener('click', () => {
      AudioEngine.playPop();
      quoteIdx = (quoteIdx + 1) % gangQuotes.length;
      quoteTickerText.innerHTML = `
        ${gangQuotes[quoteIdx].quote} <br>
        <span class="text-xs font-normal text-retro-pink font-code-snippet">${gangQuotes[quoteIdx].sub}</span>
      `;
    });
  }

  // ================= 3. PHOTO KIOSK & STICKERS =================
  let toastTimer = null;
  function showKioskToast(msg, isError = false) {
    if (!kioskToast) return;
    clearTimeout(toastTimer);
    kioskToast.textContent = msg;
    if (isError) {
      kioskToast.className = 'absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-retro-pink text-white font-headline-sm text-xs font-black uppercase border-2 border-black shadow-[3px_3px_0px_#000] whitespace-nowrap text-center max-w-[90%]';
    } else {
      kioskToast.className = 'absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-canary-yellow text-black font-headline-sm text-xs font-black uppercase border-2 border-black shadow-[3px_3px_0px_#000] whitespace-nowrap text-center max-w-[90%]';
    }
    kioskToast.classList.remove('hidden');
    toastTimer = setTimeout(() => {
      kioskToast.classList.add('hidden');
    }, 2800);
  }

  // Stop webcam stream if running
  function stopCameraStream() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    cameraVideo.classList.add('hidden');
    kioskImagePreview.classList.remove('hidden');
    activeCameraMode = false;
    modeLiveBtn.classList.remove('bg-canary-yellow', 'text-black');
    modeLiveBtn.classList.add('bg-electric-blue', 'text-white');
    modeLiveBtn.textContent = '[● Live Camera]';
  }

  // Resilient multi-tier live webcam acquisition
  async function startCameraStream() {
    stopCameraStream();
    let stream = null;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showKioskToast('📷 CAMERA NOT SUPPORTED // UPLOAD PHOTO', true);
      if (photoFileInput) photoFileInput.click();
      return false;
    }

    // Tier 1: Try front/user camera with ideal resolution
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
    } catch (e1) {
      console.warn("Tier 1 camera constraint failed, falling back to generic video device...", e1);
      // Tier 2: Try any available video camera (crucial for desktops without 'user' camera tags)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (e2) {
        console.warn("Tier 2 camera failed:", e2);
      }
    }

    if (stream) {
      currentStream = stream;
      cameraVideo.srcObject = stream;
      cameraVideo.classList.remove('hidden');
      kioskImagePreview.classList.add('hidden');
      activeCameraMode = true;

      try {
        await cameraVideo.play();
      } catch (_) {}

      modeLiveBtn.classList.remove('bg-electric-blue', 'text-white');
      modeLiveBtn.classList.add('bg-canary-yellow', 'text-black');
      modeLiveBtn.textContent = '[■ Stop Camera]';
      showKioskToast('● LIVE WEBCAM ACTIVE • HIT SNAP!');
      return true;
    } else {
      showKioskToast('📷 NO WEBCAM DETECTED // PICK A PHOTO', true);
      if (photoFileInput) photoFileInput.click();
      return false;
    }
  }

  if (modeLiveBtn) {
    modeLiveBtn.addEventListener('click', () => {
      if (!activeCameraMode) {
        startCameraStream();
      } else {
        stopCameraStream();
      }
    });
  }

  if (retakePhotoBtn) {
    retakePhotoBtn.addEventListener('click', () => {
      AudioEngine.playPop();
      if (!activeCameraMode) {
        startCameraStream();
      } else {
        stopCameraStream();
      }
    });
  }

  if (modeUploadBtn && photoFileInput) {
    modeUploadBtn.addEventListener('click', () => {
      photoFileInput.click();
    });

    photoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        stopCameraStream();
        const reader = new FileReader();
        reader.onload = (event) => {
          kioskImagePreview.src = event.target.result;
          kioskImagePreview.classList.remove('hidden');
          showKioskToast('✓ PHOTO UPLOADED! SLAP STICKERS BELOW');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Quick Candid Presets
  presetCandidBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      AudioEngine.playPop();
      stopCameraStream();
      const src = this.getAttribute('data-src');
      if (src) {
        kioskImagePreview.src = src;
        kioskImagePreview.classList.remove('hidden');
        if (cameraFlashOverlay) {
          cameraFlashOverlay.classList.add('active');
          setTimeout(() => cameraFlashOverlay.classList.remove('active'), 120);
        }
        showKioskToast(`✓ LOADED: ${this.textContent.trim()}`);
      }
    });
  });

  // Shutter Flash & Snap Logic
  async function executeSnap() {
    AudioEngine.playShutter();
    if (cameraFlashOverlay) {
      cameraFlashOverlay.classList.add('active');
      setTimeout(() => {
        cameraFlashOverlay.classList.remove('active');
      }, 180);
    }

    if (activeCameraMode && currentStream) {
      // Freeze live video frame to image
      const canvas = document.createElement('canvas');
      const vWidth = cameraVideo.videoWidth || 800;
      const vHeight = cameraVideo.videoHeight || 600;
      canvas.width = vWidth;
      canvas.height = vHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(cameraVideo, 0, 0, vWidth, vHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      stopCameraStream();
      kioskImagePreview.src = dataUrl;
      kioskImagePreview.classList.remove('hidden');
      showKioskToast('✓ PHOTO SNAPPED! SLAP STICKERS BELOW');
    } else {
      // Camera is not currently active
      // Try to start live camera, or if no camera on machine, offer upload/candids
      const started = await startCameraStream();
      if (!started) {
        showKioskToast('✓ PHOTO READY! SLAP STICKERS OR SIGN POSTCARD');
      }
    }
  }

  if (shutterBtn) {
    shutterBtn.addEventListener('click', () => {
      AudioEngine.init();
      // If camera is live, run countdown
      if (activeCameraMode) {
        countdownBox.classList.remove('hidden');
        let count = 3;
        countdownNumber.textContent = count;
        const countInterval = setInterval(() => {
          count--;
          if (count > 0) {
            countdownNumber.textContent = count;
            AudioEngine.playPop();
          } else {
            clearInterval(countInterval);
            countdownBox.classList.add('hidden');
            executeSnap();
          }
        }, 550);
      } else {
        executeSnap();
      }
    });
  }

  // Filter Presets
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => {
        b.classList.remove('bg-canary-yellow');
        b.classList.add('bg-white');
      });
      this.classList.remove('bg-white');
      this.classList.add('bg-canary-yellow');
      currentFilter = this.getAttribute('data-filter') || 'none';

      const filterClass = currentFilter === 'none' ? 'contrast-110 brightness-95' : currentFilter;
      kioskImagePreview.className = `w-full h-full object-cover filter transition-all duration-300 pointer-events-none select-none ${filterClass}`;
      cameraVideo.className = `w-full h-full object-cover filter transition-all duration-300 ${filterClass}`;
    });
  });

  // Sticker Positioning & Dragging
  function makeStickerRepositionable(stickerEl) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    function onPointerDown(e) {
      if (e.target.closest('.remove-sticker-btn')) return;
      e.preventDefault();
      isDragging = true;
      stickerEl.setPointerCapture(e.pointerId);
      stickerEl.style.zIndex = '99';

      startX = e.clientX;
      startY = e.clientY;
      initialLeft = stickerEl.offsetLeft;
      initialTop = stickerEl.offsetTop;
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const rect = photoboothDropzone.getBoundingClientRect();
      const maxX = rect.width - stickerEl.offsetWidth;
      const maxY = rect.height - stickerEl.offsetHeight;

      const newX = Math.max(0, Math.min(maxX, initialLeft + dx));
      const newY = Math.max(0, Math.min(maxY, initialTop + dy));

      stickerEl.style.left = `${newX}px`;
      stickerEl.style.top = `${newY}px`;
      stickerEl.style.bottom = 'auto';
      stickerEl.style.right = 'auto';
    }

    function onPointerUp(e) {
      if (isDragging) {
        isDragging = false;
        stickerEl.style.zIndex = '25';
        try { stickerEl.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    }

    stickerEl.addEventListener('pointerdown', onPointerDown);
    stickerEl.addEventListener('pointermove', onPointerMove);
    stickerEl.addEventListener('pointerup', onPointerUp);
    stickerEl.addEventListener('pointercancel', onPointerUp);

    const closeBtn = stickerEl.querySelector('.remove-sticker-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioEngine.playPop();
        stickerEl.remove();
      });
    }
  }

  function createStickerElement(text, bg, color, leftPx, topPx, rotDeg) {
    const sticker = document.createElement('div');
    const rot = rotDeg !== undefined ? rotDeg : Math.floor(Math.random() * 16 - 8);
    sticker.className = `placed-sticker absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none group/sticker flex items-center gap-1.5 px-3 py-1 ${bg} ${color} border-3 border-black font-headline-sm text-[15px] font-black shadow-[4px_4px_0px_#000000] sticker-pop`;
    sticker.style.setProperty('--rot', `${rot}deg`);
    sticker.style.transform = `rotate(${rot}deg)`;
    sticker.style.left = `${leftPx}px`;
    sticker.style.top = `${topPx}px`;
    sticker.style.zIndex = '25';
    sticker.setAttribute('data-text', text);
    sticker.setAttribute('data-bg', bg);
    sticker.setAttribute('data-color', color);
    sticker.setAttribute('data-rot', rot);

    const span = document.createElement('span');
    span.textContent = text;
    sticker.appendChild(span);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'remove-sticker-btn opacity-0 group-hover/sticker:opacity-100 transition-opacity ml-1 w-4 h-4 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-black leading-none hover:scale-110';
    closeBtn.title = 'Remove';
    closeBtn.textContent = '×';
    sticker.appendChild(closeBtn);

    makeStickerRepositionable(sticker);
    return sticker;
  }

  // Pre-bound initial stickers
  document.querySelectorAll('#placedStickersLayer .placed-sticker').forEach(makeStickerRepositionable);

  if (clearStickersBtn && placedStickersLayer) {
    clearStickersBtn.addEventListener('click', () => {
      AudioEngine.playPop();
      placedStickersLayer.innerHTML = '';
    });
  }

  // Sticker Chip Drag & Drop
  stickerChips.forEach(chip => {
    chip.addEventListener('dragstart', function(e) {
      const text = this.getAttribute('data-text') || this.textContent.trim();
      const bg = this.getAttribute('data-bg') || 'bg-canary-yellow text-black';
      const color = this.getAttribute('data-color') || 'text-black';
      e.dataTransfer.setData('application/json', JSON.stringify({ text, bg, color }));
      e.dataTransfer.effectAllowed = 'copy';
    });

    chip.addEventListener('click', function() {
      if (!photoboothDropzone || !placedStickersLayer) return;
      AudioEngine.playPop();
      const text = this.getAttribute('data-text') || this.textContent.trim();
      const bg = this.getAttribute('data-bg') || 'bg-canary-yellow text-black';
      const color = this.getAttribute('data-color') || 'text-black';

      const rect = photoboothDropzone.getBoundingClientRect();
      const jitterX = Math.floor(Math.random() * 80 - 40);
      const jitterY = Math.floor(Math.random() * 80 - 40);
      const posX = Math.max(10, Math.min(rect.width - 120, (rect.width / 2 - 50) + jitterX));
      const posY = Math.max(10, Math.min(rect.height - 50, (rect.height / 2 - 25) + jitterY));

      const sticker = createStickerElement(text, bg, color, posX, posY);
      placedStickersLayer.appendChild(sticker);
    });
  });

  if (photoboothDropzone && placedStickersLayer) {
    photoboothDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (dropIndicator) dropIndicator.classList.remove('hidden');
      photoboothDropzone.classList.add('dropzone-active');
    });

    photoboothDropzone.addEventListener('dragleave', (e) => {
      if (e.relatedTarget && photoboothDropzone.contains(e.relatedTarget)) return;
      if (dropIndicator) dropIndicator.classList.add('hidden');
      photoboothDropzone.classList.remove('dropzone-active');
    });

    photoboothDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      if (dropIndicator) dropIndicator.classList.add('hidden');
      photoboothDropzone.classList.remove('dropzone-active');

      const raw = e.dataTransfer.getData('application/json');
      let text = '☕ भाई';
      let bg = 'bg-canary-yellow text-black';
      let color = 'text-black';

      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          text = parsed.text || text;
          bg = parsed.bg || bg;
          color = parsed.color || color;
        } catch (_) {}
      }

      const rect = photoboothDropzone.getBoundingClientRect();
      const dropX = Math.max(10, Math.min(rect.width - 110, e.clientX - rect.left - 40));
      const dropY = Math.max(10, Math.min(rect.height - 40, e.clientY - rect.top - 18));

      AudioEngine.playPop();
      const sticker = createStickerElement(text, bg, color, dropX, dropY);
      placedStickersLayer.appendChild(sticker);
    });
  }

  // ================= 4. POSTCARD & MEMORY SUBMISSION =================
  // Word counter
  if (postcardMessage && wordCounterBadge) {
    postcardMessage.addEventListener('input', function() {
      const text = this.value.trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      wordCounterBadge.textContent = `${words} / 20 WORDS`;

      if (words > 20) {
        wordCounterBadge.classList.remove('bg-pitch-black');
        wordCounterBadge.classList.add('bg-retro-pink');
        if (wordLimitWarning) wordLimitWarning.classList.remove('hidden');
      } else {
        wordCounterBadge.classList.remove('bg-retro-pink');
        wordCounterBadge.classList.add('bg-pitch-black');
        if (wordLimitWarning) wordLimitWarning.classList.add('hidden');
      }
    });
  }

  // Mood selection
  moodBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      moodBtns.forEach(b => {
        b.classList.remove('bg-pitch-black', 'text-white');
        b.classList.add('bg-white', 'text-black');
      });
      this.classList.remove('bg-white', 'text-black');
      this.classList.add('bg-pitch-black', 'text-white');
      activeMood = this.getAttribute('data-mood') || 'Bakchodi';
    });
  });

  // Canvas Compositing: Bake base image + stickers into final photo
  async function compositeFinalPhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Draw base image
    const img = new Image();
    if (kioskImagePreview.src && !kioskImagePreview.src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.src = kioskImagePreview.src;
    await new Promise((resolve) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }
    });

    try {
      // Apply CSS filter simulation on canvas
      if (currentFilter && currentFilter !== 'none') {
        ctx.filter = currentFilter;
      }
      ctx.drawImage(img, 0, 0, 800, 600);
      ctx.filter = 'none';
    } catch (_) {
      ctx.fillStyle = '#FEF9EE';
      ctx.fillRect(0, 0, 800, 600);
    }

    // Draw all placed stickers
    const stickers = document.querySelectorAll('#placedStickersLayer .placed-sticker');
    const zoneRect = photoboothDropzone.getBoundingClientRect();

    stickers.forEach(s => {
      const text = s.getAttribute('data-text') || s.innerText.replace('×', '').trim();
      const sLeft = s.offsetLeft;
      const sTop = s.offsetTop;
      const rot = parseFloat(s.getAttribute('data-rot') || '0');

      const scaleX = 800 / (zoneRect.width || 800);
      const scaleY = 600 / (zoneRect.height || 600);
      const cX = (sLeft + s.offsetWidth / 2) * scaleX;
      const cY = (sTop + s.offsetHeight / 2) * scaleY;

      ctx.save();
      ctx.translate(cX, cY);
      ctx.rotate((rot * Math.PI) / 180);

      // Sticker background pill
      ctx.font = 'bold 22px "Outfit", sans-serif';
      const textMetrics = ctx.measureText(text);
      const pWidth = textMetrics.width + 24;
      const pHeight = 36;

      ctx.fillStyle = '#000000';
      ctx.fillRect(-pWidth / 2 + 4, -pHeight / 2 + 4, pWidth, pHeight); // shadow

      ctx.fillStyle = s.classList.contains('bg-retro-pink') ? '#EC4899' :
                      s.classList.contains('bg-electric-blue') ? '#2563EB' :
                      s.classList.contains('bg-pitch-black') ? '#0A0A0E' : '#FACC15';
      ctx.fillRect(-pWidth / 2, -pHeight / 2, pWidth, pHeight);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(-pWidth / 2, -pHeight / 2, pWidth, pHeight);

      // Sticker text
      ctx.fillStyle = (s.classList.contains('text-white') || s.classList.contains('bg-electric-blue') || s.classList.contains('bg-retro-pink')) ? '#FFFFFF' : '#0A0A0E';
      if (s.classList.contains('bg-pitch-black')) ctx.fillStyle = '#FACC15';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);

      ctx.restore();
    });

    return canvas.toDataURL('image/jpeg', 0.92);
  }

  // Submit Postcard to Server
  if (vaultDispatchForm) {
    vaultDispatchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const friendName = (aliasInput.value || '').trim();
      const note = (postcardMessage.value || '').trim();
      const words = note ? note.split(/\s+/).filter(Boolean).length : 0;

      if (!friendName) {
        alert("Please enter your name or alias!");
        return;
      }

      if (words > 20) {
        alert(`Strict 20-word limit enforced! Your message has ${words} words.`);
        return;
      }

      submitPostcardBtn.disabled = true;
      submitPostcardBtn.innerHTML = `<span>TRANSMITTING TO KASHI CELL...</span>`;

      try {
        const photoBase64 = await compositeFinalPhoto();
        const res = await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            friendName,
            note,
            photoBase64,
            mood: activeMood,
            filter: currentFilter,
            stickers: Array.from(document.querySelectorAll('#placedStickersLayer .placed-sticker')).map(s => ({
              emoji: s.getAttribute('data-text') || '',
              x: Math.round(s.offsetLeft),
              y: Math.round(s.offsetTop),
              rot: parseFloat(s.getAttribute('data-rot') || '0')
            }))
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to seal memory.');

        // Success Celebration
        AudioEngine.playStamp();
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FACC15', '#EC4899', '#2563EB', '#0A0A0E']
          });
        }

        if (receiptMemoryId) receiptMemoryId.textContent = `#VAULT-${data.memory.id.slice(0, 6).toUpperCase()}`;
        if (submissionReceipt) submissionReceipt.classList.remove('hidden');

        fetchLiveStatus(); // Refresh counters
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        submitPostcardBtn.disabled = false;
        submitPostcardBtn.innerHTML = `<span>STAMP &amp; SEAL IN VAULT 📮</span>`;
      }
    });
  }

  if (resetPostcardBtn) {
    resetPostcardBtn.addEventListener('click', () => {
      if (submissionReceipt) submissionReceipt.classList.add('hidden');
      if (postcardMessage) postcardMessage.value = '';
      if (aliasInput) aliasInput.value = '';
      if (wordCounterBadge) wordCounterBadge.textContent = '0 / 20 WORDS';
    });
  }

  // ================= 5. REAL-TIME STATUS SYNCING =================
  async function fetchLiveStatus() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) return;
      const data = await res.json();

      if (topMemoryCountBadge) {
        topMemoryCountBadge.textContent = `MEMORIES: ${data.totalMemories}`;
      }

      // If count changed and vault is open, refresh memories
      if (data.totalMemories !== lastMemoryCount && vaultToken && !vaultSanctuaryView.classList.contains('hidden')) {
        lastMemoryCount = data.totalMemories;
        loadVaultMemories();
      }
    } catch (_) {}
  }

  fetchLiveStatus();
  setInterval(fetchLiveStatus, 6000); // Dynamic periodic polling

  // ================= 6. PASSWORD AUTHENTICATION & DEVICE SYNC =================
  function showVaultLoginModal() {
    if (vaultToken) {
      // Already authenticated
      openVaultSanctuary();
    } else {
      if (vaultPasswordInput) vaultPasswordInput.value = '';
      if (passwordErrorMessage) passwordErrorMessage.classList.add('hidden');
      if (vaultLoginModal) vaultLoginModal.classList.remove('hidden');
      if (vaultPasswordInput) vaultPasswordInput.focus();
    }
  }

  function hideVaultLoginModal() {
    if (vaultLoginModal) vaultLoginModal.classList.add('hidden');
  }

  [vaultKeyTrigger, navVaultLink, mastheadVaultBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      showVaultLoginModal();
    });
  });

  if (closePinModalBtn) closePinModalBtn.addEventListener('click', hideVaultLoginModal);

  // Toggle Password Visibility
  if (togglePasswordVisibilityBtn && vaultPasswordInput && eyeIcon) {
    togglePasswordVisibilityBtn.addEventListener('click', () => {
      if (vaultPasswordInput.type === 'password') {
        vaultPasswordInput.type = 'text';
        eyeIcon.textContent = 'visibility_off';
      } else {
        vaultPasswordInput.type = 'password';
        eyeIcon.textContent = 'visibility';
      }
    });
  }

  // Handle Password Submit
  if (vaultLoginForm) {
    vaultLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enteredPassword = vaultPasswordInput.value;
      if (!enteredPassword) return;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: enteredPassword })
        });
        const data = await res.json();

        if (res.ok && data.token) {
          vaultToken = data.token;
          sessionStorage.setItem('tripathi_vault_token', vaultToken);
          hideVaultLoginModal();
          AudioEngine.playStamp();
          openVaultSanctuary();
        } else {
          if (passwordErrorMessage) {
            passwordErrorMessage.classList.remove('hidden');
            passwordErrorMessage.textContent = data.error || '[INCORRECT PASSWORD // ACCESS DENIED]';
          }
          vaultPasswordInput.classList.add('border-retro-pink');
          setTimeout(() => vaultPasswordInput.classList.remove('border-retro-pink'), 1000);
        }
      } catch (err) {
        alert("Login request failed: " + err.message);
      }
    });
  }

  // Change Password Modal Open/Close
  if (openResetPasswordModalBtn) {
    openResetPasswordModalBtn.addEventListener('click', () => {
      hideVaultLoginModal();
      if (changePassMessage) changePassMessage.classList.add('hidden');
      if (changePasswordModal) changePasswordModal.classList.remove('hidden');
    });
  }

  if (vaultChangePasswordBtn) {
    vaultChangePasswordBtn.addEventListener('click', () => {
      if (changePassMessage) changePassMessage.classList.add('hidden');
      if (changePasswordModal) changePasswordModal.classList.remove('hidden');
    });
  }

  if (closeChangePasswordBtn && changePasswordModal) {
    closeChangePasswordBtn.addEventListener('click', () => {
      changePasswordModal.classList.add('hidden');
    });
  }

  // Handle Password Change Form Submission (Dynamic Device-to-Device Sync)
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curr = currentPasswordInput.value;
      const nw = newPasswordInput.value;
      const conf = confirmPasswordInput.value;

      if (nw !== conf) {
        changePassMessage.className = 'text-xs font-code-snippet font-black p-2 text-center border border-black bg-retro-pink text-white';
        changePassMessage.textContent = 'New passwords do not match!';
        changePassMessage.classList.remove('hidden');
        return;
      }

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: curr, newPassword: nw })
        });
        const data = await res.json();

        if (res.ok) {
          changePassMessage.className = 'text-xs font-code-snippet font-black p-2 text-center border border-black bg-canary-yellow text-black';
          changePassMessage.textContent = '✓ Password updated successfully across all devices!';
          changePassMessage.classList.remove('hidden');
          setTimeout(() => {
            changePasswordModal.classList.add('hidden');
            changePasswordForm.reset();
          }, 1500);
        } else {
          changePassMessage.className = 'text-xs font-code-snippet font-black p-2 text-center border border-black bg-retro-pink text-white';
          changePassMessage.textContent = data.error || 'Failed to update password.';
          changePassMessage.classList.remove('hidden');
        }
      } catch (err) {
        alert("Network error: " + err.message);
      }
    });
  }

  // ================= 7. SHAURYA'S PRIVATE VAULT SANCTUARY =================
  function openVaultSanctuary() {
    if (publicViewContainer) publicViewContainer.classList.add('hidden');
    if (vaultSanctuaryView) vaultSanctuaryView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadVaultMemories();
  }

  function closeVaultSanctuary() {
    vaultToken = null;
    sessionStorage.removeItem('tripathi_vault_token');
    if (vaultSanctuaryView) vaultSanctuaryView.classList.add('hidden');
    if (publicViewContainer) publicViewContainer.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (vaultLockBtn) {
    vaultLockBtn.addEventListener('click', closeVaultSanctuary);
  }

  // Load Memories from Backend
  async function loadVaultMemories() {
    if (!vaultToken) return;
    try {
      const res = await fetch('/api/vault/memories', {
        headers: { 'Authorization': `Bearer ${vaultToken}` }
      });
      if (res.status === 401) {
        closeVaultSanctuary();
        return;
      }
      const data = await res.json();
      allVaultMemories = data.memories || [];
      renderVaultCorkboard();
    } catch (err) {
      console.error("Failed to load vault memories:", err);
    }
  }

  // Render Polaroid Cards
  function renderVaultCorkboard() {
    if (!corkboardGrid) return;
    corkboardGrid.innerHTML = '';

    const query = currentVaultSearch.toLowerCase().trim();
    const filtered = allVaultMemories.filter(m => {
      const matchMood = (currentVaultMoodFilter === 'all' || (m.mood && m.mood.toLowerCase() === currentVaultMoodFilter.toLowerCase()));
      const matchQuery = !query ||
        (m.friendName && m.friendName.toLowerCase().includes(query)) ||
        (m.note && m.note.toLowerCase().includes(query));
      return matchMood && matchQuery;
    });

    if (filtered.length === 0) {
      if (vaultEmptyState) vaultEmptyState.classList.remove('hidden');
      return;
    }
    if (vaultEmptyState) vaultEmptyState.classList.add('hidden');

    filtered.forEach((mem, i) => {
      const rot = (i % 2 === 0 ? -1 : 1) * (1 + (i % 3));
      const card = document.createElement('div');
      card.className = 'polaroid-card p-3 relative cursor-pointer group flex flex-col justify-between';
      card.style.transform = `rotate(${rot}deg)`;

      // Washi Tape header
      const tapeColor = i % 2 === 0 ? 'bg-retro-pink' : 'bg-canary-yellow';
      const tape = document.createElement('div');
      tape.className = `washi-tape -top-3 left-1/2 -translate-x-1/2 w-24 h-5 ${tapeColor} rotate-1`;
      card.appendChild(tape);

      // Photo (uses portable base64 data URL directly)
      const photoBox = document.createElement('div');
      photoBox.className = 'relative aspect-[4/3] bg-pitch-black overflow-hidden border-2 border-black mb-2';
      photoBox.innerHTML = `
        <img src="${mem.photoUrl}" alt="${mem.friendName}" class="w-full h-full object-cover">
        <span class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-pitch-black/80 text-white font-code-snippet text-[9px] font-black uppercase">
          ${mem.mood || 'RAW'}
        </span>
      `;
      card.appendChild(photoBox);

      // Friend Alias & Note
      const infoBox = document.createElement('div');
      infoBox.className = 'flex flex-col gap-1';
      const formattedDate = new Date(mem.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const privacyBadge = mem.isPublic
        ? `<span class="px-1.5 py-0.5 bg-green-600 text-white font-code-snippet text-[9px] font-black uppercase border border-black">★ IN FRIENDS CAPSULE</span>`
        : `<span class="px-1.5 py-0.5 bg-pitch-black text-canary-yellow font-code-snippet text-[9px] font-black uppercase border border-black">🔒 PRIVATE (SHAURYA ONLY)</span>`;

      const privacyAction = mem.isPublic
        ? `<button type="button" class="toggle-public-btn text-[10px] font-black uppercase text-retro-pink hover:text-black font-code-snippet underline">🔒 Hide from Friends</button>`
        : `<button type="button" class="toggle-public-btn text-[10px] font-black uppercase text-electric-blue hover:text-black font-code-snippet underline">👁️ Show in Friends Column</button>`;

      infoBox.innerHTML = `
        <div class="flex items-center justify-between border-b border-black pb-1">
          <span class="font-headline-sm text-sm uppercase text-black font-black truncate">${mem.friendName}</span>
          <span class="font-code-snippet text-[10px] text-gray-600 font-bold">${formattedDate}</span>
        </div>
        <p class="font-code-snippet text-xs text-pitch-black font-bold mt-1 line-clamp-3">
          "${mem.note}"
        </p>
        <div class="mt-2 pt-1.5 border-t border-black/40 flex items-center justify-between gap-1">
          ${privacyBadge}
          ${privacyAction}
        </div>
      `;
      card.appendChild(infoBox);

      // Privacy toggle handler on card
      const toggleBtn = card.querySelector('.toggle-public-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          AudioEngine.playPop();
          await toggleMemoryPrivacy(mem.id);
        });
      }

      card.addEventListener('click', () => {
        openDetailModal(mem);
      });

      corkboardGrid.appendChild(card);
    });
  }

  // Toggle memory privacy on server
  async function toggleMemoryPrivacy(id) {
    if (!vaultToken) return;
    try {
      const res = await fetch(`/api/vault/memories/${id}/toggle-public`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${vaultToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        const mem = allVaultMemories.find(m => m.id === id);
        if (mem) mem.isPublic = data.isPublic;
        renderVaultCorkboard();
        loadPublicMemories();
        if (activeDetailMemory && activeDetailMemory.id === id) {
          activeDetailMemory.isPublic = data.isPublic;
          updateDetailModalPrivacyUI();
        }
      }
    } catch (err) {
      alert("Failed to update privacy: " + err.message);
    }
  }

  // Vault Filters & Search
  if (vaultSearchInput) {
    vaultSearchInput.addEventListener('input', (e) => {
      currentVaultSearch = e.target.value;
      renderVaultCorkboard();
    });
  }

  vaultFilterPills.forEach(pill => {
    pill.addEventListener('click', function() {
      vaultFilterPills.forEach(p => {
        p.classList.remove('bg-canary-yellow');
        p.classList.add('bg-white');
      });
      this.classList.remove('bg-white');
      this.classList.add('bg-canary-yellow');
      currentVaultMoodFilter = this.getAttribute('data-mood') || 'all';
      renderVaultCorkboard();
    });
  });

  // Export JSON Backup
  if (vaultExportBtn) {
    vaultExportBtn.addEventListener('click', () => {
      if (!vaultToken) return;
      window.location.href = `/api/vault/export?auth=${vaultToken}`;
    });
  }

  // Update Detail Modal Privacy UI
  function updateDetailModalPrivacyUI() {
    if (!activeDetailMemory || !detailTogglePublicBtn || !detailTogglePublicText) return;
    if (activeDetailMemory.isPublic) {
      detailTogglePublicBtn.className = 'px-3 py-2 bg-retro-pink text-white border-2 border-black font-headline-sm text-xs font-black uppercase shadow-[3px_3px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1';
      detailTogglePublicText.textContent = '🔒 HIDE FROM FRIENDS';
    } else {
      detailTogglePublicBtn.className = 'px-3 py-2 bg-electric-blue text-white border-2 border-black font-headline-sm text-xs font-black uppercase shadow-[3px_3px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1';
      detailTogglePublicText.textContent = '👁️ SHOW IN FRIENDS COLUMN';
    }
  }

  // Detail Modal Inspector
  function openDetailModal(mem) {
    activeDetailMemory = mem;
    detailPhotoImg.src = mem.photoUrl;
    detailMoodBadge.textContent = (mem.mood || 'RAW').toUpperCase();
    detailTimestamp.textContent = new Date(mem.createdAt).toLocaleString();
    detailFriendName.textContent = mem.friendName;
    detailWordCount.textContent = `${mem.wordCount || mem.note.split(/\s+/).length} WORDS`;
    detailNoteText.textContent = `"${mem.note}"`;

    // Only show host controls if authenticated as host
    if (vaultToken) {
      if (deleteMemoryBtn) deleteMemoryBtn.classList.remove('hidden');
      if (detailTogglePublicBtn) {
        detailTogglePublicBtn.classList.remove('hidden');
        updateDetailModalPrivacyUI();
      }
    } else {
      if (deleteMemoryBtn) deleteMemoryBtn.classList.add('hidden');
      if (detailTogglePublicBtn) detailTogglePublicBtn.classList.add('hidden');
    }

    detailModal.classList.remove('hidden');
  }

  if (detailTogglePublicBtn) {
    detailTogglePublicBtn.addEventListener('click', async () => {
      if (!activeDetailMemory || !vaultToken) return;
      AudioEngine.playPop();
      await toggleMemoryPrivacy(activeDetailMemory.id);
    });
  }

  // ================= 8. PUBLIC FRIENDS' CAPSULE COLUMN =================
  async function loadPublicMemories() {
    if (!publicCapsuleGrid) return;
    try {
      const res = await fetch('/api/memories/public');
      if (!res.ok) return;
      const data = await res.json();
      const memories = data.memories || [];

      if (publicCapsuleCountBadge) {
        publicCapsuleCountBadge.textContent = `APPROVED MOMENTS: ${memories.length}`;
      }

      publicCapsuleGrid.innerHTML = '';
      if (memories.length === 0) {
        if (publicCapsuleEmptyState) publicCapsuleEmptyState.classList.remove('hidden');
        return;
      }
      if (publicCapsuleEmptyState) publicCapsuleEmptyState.classList.add('hidden');

      memories.forEach((mem, i) => {
        const rot = (i % 2 === 0 ? -1 : 1) * (1 + (i % 3));
        const card = document.createElement('div');
        card.className = 'polaroid-card p-3 relative cursor-pointer group flex flex-col justify-between';
        card.style.transform = `rotate(${rot}deg)`;

        const tapeColor = i % 2 === 0 ? 'bg-canary-yellow' : 'bg-retro-pink';
        const tape = document.createElement('div');
        tape.className = `washi-tape -top-3 left-1/2 -translate-x-1/2 w-24 h-5 ${tapeColor} rotate-1`;
        card.appendChild(tape);

        const photoBox = document.createElement('div');
        photoBox.className = 'relative aspect-[4/3] bg-pitch-black overflow-hidden border-2 border-black mb-2';
        photoBox.innerHTML = `
          <img src="${mem.photoUrl}" alt="${mem.friendName}" class="w-full h-full object-cover">
          <span class="absolute bottom-1 right-1 px-1.5 py-0.5 bg-pitch-black/80 text-white font-code-snippet text-[9px] font-black uppercase">
            ${mem.mood || 'RAW'}
          </span>
        `;
        card.appendChild(photoBox);

        const infoBox = document.createElement('div');
        infoBox.className = 'flex flex-col gap-1';
        const formattedDate = new Date(mem.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
        infoBox.innerHTML = `
          <div class="flex items-center justify-between border-b border-black pb-1">
            <span class="font-headline-sm text-sm uppercase text-black font-black truncate">${mem.friendName}</span>
            <span class="font-code-snippet text-[10px] text-gray-600 font-bold">${formattedDate}</span>
          </div>
          <p class="font-code-snippet text-xs text-pitch-black font-bold mt-1 line-clamp-3">
            "${mem.note}"
          </p>
        `;
        card.appendChild(infoBox);

        card.addEventListener('click', () => {
          openDetailModal(mem);
        });

        publicCapsuleGrid.appendChild(card);
      });
    } catch (_) {}
  }

  if (closeDetailModalBtn && detailModal) {
    closeDetailModalBtn.addEventListener('click', () => {
      detailModal.classList.add('hidden');
    });
  }

  // Download Polaroid Keepsake
  if (downloadKeepsakeBtn) {
    downloadKeepsakeBtn.addEventListener('click', async () => {
      if (!activeDetailMemory) return;
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');

      // White Polaroid Frame
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 600, 760);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(0, 0, 600, 760);

      // Washi tape graphic on top
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(200, 10, 200, 36);
      ctx.strokeRect(200, 10, 200, 36);

      // Draw photo
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = activeDetailMemory.photoUrl;
      await new Promise(res => { img.onload = res; });
      ctx.drawImage(img, 40, 60, 520, 420);
      ctx.strokeRect(40, 60, 520, 420);

      // Captions
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 28px "Outfit", sans-serif';
      ctx.fillText(activeDetailMemory.friendName.toUpperCase(), 45, 525);

      ctx.font = 'bold 16px "Space Mono", monospace';
      ctx.fillStyle = '#666666';
      ctx.fillText(new Date(activeDetailMemory.createdAt).toLocaleDateString(), 45, 555);

      ctx.fillStyle = '#000000';
      ctx.font = 'italic bold 20px "Space Mono", monospace';

      // Multiline wrap for note
      const words = activeDetailMemory.note.split(' ');
      let line = '';
      let y = 600;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 500 && n > 0) {
          ctx.fillText(`"${line.trim()}"`, 45, y);
          line = words[n] + ' ';
          y += 32;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(`"${line.trim()}"`, 45, y);

      const link = document.createElement('a');
      link.download = `polaroid_${activeDetailMemory.friendName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  // Delete Memory
  if (deleteMemoryBtn) {
    deleteMemoryBtn.addEventListener('click', async () => {
      if (!activeDetailMemory || !vaultToken) return;
      if (!confirm(`Are you sure you want to permanently delete this memory from ${activeDetailMemory.friendName}?`)) return;

      try {
        const res = await fetch(`/api/vault/memories/${activeDetailMemory.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${vaultToken}` }
        });
        if (res.ok) {
          detailModal.classList.add('hidden');
          loadVaultMemories();
          fetchLiveStatus();
        }
      } catch (err) {
        alert("Failed to delete memory: " + err.message);
      }
    });
  }

  // ================= 8. SLIDESHOW MODE =================
  function showSlideshowIndex(idx) {
    if (allVaultMemories.length === 0) return;
    slideshowIdx = (idx + allVaultMemories.length) % allVaultMemories.length;
    const mem = allVaultMemories[slideshowIdx];
    slideshowImg.src = mem.photoUrl;
    slideshowAuthor.textContent = mem.friendName;
    slideshowNote.textContent = `"${mem.note}"`;
    slideshowCounter.textContent = `${slideshowIdx + 1} / ${allVaultMemories.length}`;
  }

  if (vaultSlideshowBtn) {
    vaultSlideshowBtn.addEventListener('click', () => {
      if (allVaultMemories.length === 0) {
        alert("No memories available in vault for slideshow.");
        return;
      }
      slideshowModal.classList.remove('hidden');
      showSlideshowIndex(0);
    });
  }

  if (closeSlideshowBtn) closeSlideshowBtn.addEventListener('click', () => slideshowModal.classList.add('hidden'));
  if (prevSlideBtn) prevSlideBtn.addEventListener('click', () => showSlideshowIndex(slideshowIdx - 1));
  if (nextSlideBtn) nextSlideBtn.addEventListener('click', () => showSlideshowIndex(slideshowIdx + 1));

  // Check if session token already exists on page load
  if (vaultToken) {
    fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${vaultToken}` }
    }).then(res => res.json()).then(data => {
      if (!data.authenticated) {
        sessionStorage.removeItem('tripathi_vault_token');
        vaultToken = null;
      }
    }).catch(() => {});
  }
});
