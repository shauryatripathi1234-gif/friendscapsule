/**
 * THE FRIENDSHIP CAPSULE • CLIENT APP
 * HackMIT-inspired Storybook UI & Vault
 */

document.addEventListener('DOMContentLoaded', () => {
  // ---------------- STATE ----------------
  let currentStream = null;
  let currentFacingMode = 'user';
  let capturedPhotoBase64 = null;
  let currentFilter = 'normal';
  let placedStickers = []; // { emoji, x, y, rot }
  let vaultToken = sessionStorage.getItem('vault_token') || null;
  let allMemories = [];
  let currentMoodFilter = 'all';
  let currentSearchQuery = '';
  let activeDetailMemory = null;
  let slideshowIndex = 0;

  // ---------------- DOM ELEMENTS ----------------
  // Nav & Header
  const publicCountBadge = document.getElementById('publicCountBadge');
  const statsLabel = document.getElementById('statsLabel');
  const vaultKeyTrigger = document.getElementById('vaultKeyTrigger');

  // Containers
  const publicContainer = document.getElementById('publicContainer');
  const vaultSanctuary = document.getElementById('vaultSanctuary');

  // Form Elements
  const memoryForm = document.getElementById('memoryForm');
  const friendNameInput = document.getElementById('friendNameInput');
  const noteInput = document.getElementById('noteInput');
  const currentWordCount = document.getElementById('currentWordCount');
  const wordCountBadge = document.getElementById('wordCountBadge');
  const wordLimitWarning = document.getElementById('wordLimitWarning');
  const submitMemoryBtn = document.getElementById('submitMemoryBtn');

  // Booth Studio Elements
  const tabLiveCamera = document.getElementById('tabLiveCamera');
  const tabFileUpload = document.getElementById('tabFileUpload');
  const cameraStreamBox = document.getElementById('cameraStreamBox');
  const videoElement = document.getElementById('videoElement');
  const fileDropzone = document.getElementById('fileDropzone');
  const photoFileInput = document.getElementById('photoFileInput');
  const capturedPreviewBox = document.getElementById('capturedPreviewBox');
  const capturedImgPreview = document.getElementById('capturedImgPreview');
  const stickerCanvasLayer = document.getElementById('stickerCanvasLayer');
  const retakeBtn = document.getElementById('retakeBtn');
  const cameraControlsBar = document.getElementById('cameraControlsBar');
  const snapShutterBtn = document.getElementById('snapShutterBtn');
  const flipCameraBtn = document.getElementById('flipCameraBtn');
  const toggleFlashGridBtn = document.getElementById('toggleFlashGridBtn');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownNumber = document.getElementById('countdownNumber');
  const shutterFlash = document.getElementById('shutterFlash');
  const filterPills = document.querySelectorAll('.filter-pill');
  const stickerButtons = document.querySelectorAll('.sticker-btn');
  const clearStickersBtn = document.getElementById('clearStickersBtn');

  // Modals
  const celebrationModal = document.getElementById('celebrationModal');
  const successFriendName = document.getElementById('successFriendName');
  const submitAnotherBtn = document.getElementById('submitAnotherBtn');

  // Vault Login Modal
  const vaultLoginModal = document.getElementById('vaultLoginModal');
  const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
  const loginModalBackdrop = document.getElementById('loginModalBackdrop');
  const vaultPinInput = document.getElementById('vaultPinInput');
  const pinErrorMsg = document.getElementById('pinErrorMsg');
  const pinKeypad = document.getElementById('pinKeypad');
  const keypadClear = document.getElementById('keypadClear');
  const keypadSubmit = document.getElementById('keypadSubmit');

  // Vault Sanctuary Elements
  const corkboardCanvas = document.getElementById('corkboardCanvas');
  const vaultEmptyState = document.getElementById('vaultEmptyState');
  const vaultSearchInput = document.getElementById('vaultSearchInput');
  const vaultMoodFilters = document.getElementById('vaultMoodFilters');
  const countAll = document.getElementById('countAll');
  const vaultLockBtn = document.getElementById('vaultLockBtn');
  const vaultExportBtn = document.getElementById('vaultExportBtn');
  const vaultSettingsBtn = document.getElementById('vaultSettingsBtn');
  const vaultSlideshowBtn = document.getElementById('vaultSlideshowBtn');

  // Cloud Sync Elements
  const vaultCloudBtn = document.getElementById('vaultCloudBtn');
  const cloudModal = document.getElementById('cloudModal');
  const closeCloudBtn = document.getElementById('closeCloudBtn');
  const cloudBackdrop = document.getElementById('cloudBackdrop');
  const cloudStatusIndicator = document.getElementById('cloudStatusIndicator');
  const firebaseConfigInput = document.getElementById('firebaseConfigInput');
  const saveCloudConfigBtn = document.getElementById('saveCloudConfigBtn');
  const clearCloudConfigBtn = document.getElementById('clearCloudConfigBtn');
  let vaultPin = localStorage.getItem('fc_vault_pin') || '0007';

  // Memory Detail Modal
  const detailModal = document.getElementById('detailModal');
  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  const detailModalBackdrop = document.getElementById('detailModalBackdrop');
  const detailPhotoImg = document.getElementById('detailPhotoImg');
  const detailStickersLayer = document.getElementById('detailStickersLayer');
  const detailMoodTag = document.getElementById('detailMoodTag');
  const detailTimestamp = document.getElementById('detailTimestamp');
  const detailFriendName = document.getElementById('detailFriendName');
  const detailNoteText = document.getElementById('detailNoteText');
  const detailWordStat = document.getElementById('detailWordStat');
  const downloadPolaroidBtn = document.getElementById('downloadPolaroidBtn');
  const deleteMemoryBtn = document.getElementById('deleteMemoryBtn');

  // Settings Modal
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  const newPinInput = document.getElementById('newPinInput');
  const savePinBtn = document.getElementById('savePinBtn');

  // Slideshow Elements
  const slideshowContainer = document.getElementById('slideshowContainer');
  const closeSlideshowBtn = document.getElementById('closeSlideshowBtn');
  const slideshowStage = document.getElementById('slideshowStage');
  const ssPrevBtn = document.getElementById('ssPrevBtn');
  const ssNextBtn = document.getElementById('ssNextBtn');
  const ssCounter = document.getElementById('ssCounter');

  // ---------------- INITIALIZATION ----------------
  initCloudSync();
  initCamera();

  // If already authenticated in current session, check token
  if (vaultToken) {
    verifyExistingToken();
  }

  // ---------------- PUBLIC STATUS & CLOUD SYNC ----------------
  function initCloudSync() {
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      console.log('🔥 Initializing Firestore Real-time Sync...');
      db.collection('memories')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
          allMemories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          if (statsLabel) {
            statsLabel.textContent = `SEALED MEMORIES: ${allMemories.length}`;
          }
          if (countAll) {
            countAll.textContent = allMemories.length;
          }
          if (publicCountBadge) {
            publicCountBadge.textContent = `${allMemories.length} SEALED`;
          }
          if (vaultSanctuary && !vaultSanctuary.classList.contains('hidden')) {
            renderCorkboard();
          }
        }, (err) => {
          console.warn('Firestore snapshot error:', err);
        });

      // Fetch cloud pin if stored
      db.collection('settings').doc('vault').get().then(doc => {
        if (doc.exists && doc.data().pin) {
          vaultPin = doc.data().pin;
          localStorage.setItem('fc_vault_pin', vaultPin);
        }
      }).catch(() => {});
    } else {
      fetchStatus();
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        statsLabel.textContent = `SEALED MEMORIES: ${data.totalMemories}`;
      } else {
        const localMems = JSON.parse(localStorage.getItem('fc_offline_memories') || '[]');
        statsLabel.textContent = `SEALED MEMORIES: ${localMems.length}`;
      }
    } catch (e) {
      const localMems = JSON.parse(localStorage.getItem('fc_offline_memories') || '[]');
      statsLabel.textContent = `SEALED MEMORIES: ${localMems.length}`;
    }
  }

  // ---------------- CAMERA & BOOTH ----------------
  async function initCamera() {
    stopCurrentStream();
    try {
      const constraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1080 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = currentStream;
      videoElement.play();
    } catch (err) {
      console.warn('Camera access unavailable or declined:', err);
      // Fallback smoothly to file upload tab
      switchTab('upload');
    }
  }

  function stopCurrentStream() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
  }

  function switchTab(mode) {
    if (mode === 'camera') {
      tabLiveCamera.classList.add('active');
      tabFileUpload.classList.remove('active');
      cameraStreamBox.classList.remove('hidden');
      fileDropzone.classList.add('hidden');
      cameraControlsBar.classList.remove('hidden');
      if (!currentStream) initCamera();
    } else {
      tabLiveCamera.classList.remove('active');
      tabFileUpload.classList.add('active');
      cameraStreamBox.classList.add('hidden');
      fileDropzone.classList.remove('hidden');
      cameraControlsBar.classList.add('hidden');
      stopCurrentStream();
    }
  }

  tabLiveCamera.addEventListener('click', () => switchTab('camera'));
  tabFileUpload.addEventListener('click', () => switchTab('upload'));

  // Camera flip
  flipCameraBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    initCamera();
  });

  // Viewfinder Grid Toggle
  let gridVisible = true;
  toggleFlashGridBtn.addEventListener('click', () => {
    const vfGrid = document.querySelector('.viewfinder-grid');
    gridVisible = !gridVisible;
    if (vfGrid) vfGrid.style.opacity = gridVisible ? '1' : '0';
  });

  // Snap with Countdown & Flash
  snapShutterBtn.addEventListener('click', () => {
    startShutterCountdown();
  });

  function startShutterCountdown() {
    countdownOverlay.style.display = 'flex';
    let count = 3;
    countdownNumber.textContent = count;

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownNumber.textContent = count;
      } else {
        clearInterval(timer);
        countdownOverlay.style.display = 'none';
        triggerShutterCapture();
      }
    }, 700);
  }

  function triggerShutterCapture() {
    // Flash effect
    shutterFlash.classList.add('flashing');
    setTimeout(() => shutterFlash.classList.remove('flashing'), 200);

    // Audio cue
    playBeepSound();

    // Capture video frame to canvas
    const canvas = document.createElement('canvas');
    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 640;
    const size = Math.min(width, height);
    const targetSize = Math.min(size, 720);
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');

    // Handle mirror for front camera
    if (currentFacingMode === 'user') {
      ctx.translate(targetSize, 0);
      ctx.scale(-1, 1);
    }

    const startX = (width - size) / 2;
    const startY = (height - size) / 2;
    ctx.drawImage(videoElement, startX, startY, size, size, 0, 0, targetSize, targetSize);

    capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.82);
    displayCapturedPhoto(capturedPhotoBase64);
  }

  function displayCapturedPhoto(dataUrl) {
    capturedImgPreview.src = dataUrl;
    applyCurrentFilterToPreview();
    cameraStreamBox.classList.add('hidden');
    fileDropzone.classList.add('hidden');
    cameraControlsBar.classList.add('hidden');
    capturedPreviewBox.classList.remove('hidden');
    stopCurrentStream();
  }

  retakeBtn.addEventListener('click', () => {
    capturedPhotoBase64 = null;
    placedStickers = [];
    renderStickerCanvas();
    capturedPreviewBox.classList.add('hidden');
    if (tabLiveCamera.classList.contains('active')) {
      switchTab('camera');
    } else {
      switchTab('upload');
    }
  });

  // File Upload Handlers
  fileDropzone.addEventListener('click', () => photoFileInput.click());

  photoFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  });

  fileDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropzone.classList.add('drag-over');
  });

  fileDropzone.addEventListener('dragleave', () => {
    fileDropzone.classList.remove('drag-over');
  });

  fileDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropzone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      // Resize to compact polaroid size for lightning fast sync
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 720;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.82);
        displayCapturedPhoto(capturedPhotoBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------------- FILM FILTERS ----------------
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      applyCurrentFilterToPreview();
    });
  });

  function applyCurrentFilterToPreview() {
    const filterClass = `filter-${currentFilter}`;
    videoElement.className = filterClass;
    capturedImgPreview.className = filterClass;
  }

  // ---------------- STICKERS & STAMPS ----------------
  stickerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!capturedPhotoBase64) {
        alert('Please snap or upload a photo first to place stickers on it!');
        return;
      }
      const sticker = btn.dataset.sticker;
      // Random coordinates within photo bounds
      const x = Math.floor(15 + Math.random() * 70);
      const y = Math.floor(15 + Math.random() * 70);
      const rot = Math.floor(-25 + Math.random() * 50);

      placedStickers.push({ emoji: sticker, x, y, rot });
      renderStickerCanvas();
    });
  });

  clearStickersBtn.addEventListener('click', () => {
    placedStickers = [];
    renderStickerCanvas();
  });

  function renderStickerCanvas() {
    stickerCanvasLayer.innerHTML = '';
    placedStickers.forEach((st, idx) => {
      const el = document.createElement('span');
      el.className = 'placed-sticker';
      el.textContent = st.emoji;
      el.style.left = `${st.x}%`;
      el.style.top = `${st.y}%`;
      el.style.transform = `translate(-50%, -50%) rotate(${st.rot}deg)`;
      el.title = 'Click to remove sticker';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        placedStickers.splice(idx, 1);
        renderStickerCanvas();
      });
      stickerCanvasLayer.appendChild(el);
    });
  }

  // ---------------- 20-WORD WHISPER VALIDATION ----------------
  function getWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  noteInput.addEventListener('input', () => {
    const text = noteInput.value;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const count = words.length;

    currentWordCount.textContent = count;

    if (count > 20) {
      wordCountBadge.classList.add('limit-warning');
      wordLimitWarning.classList.remove('hidden');
      // Trim to first 20 words
      const allowedText = words.slice(0, 20).join(' ');
      noteInput.value = allowedText;
      currentWordCount.textContent = 20;
    } else if (count === 20) {
      wordCountBadge.classList.add('limit-warning');
      wordLimitWarning.classList.remove('hidden');
    } else {
      wordCountBadge.classList.remove('limit-warning');
      wordLimitWarning.classList.add('hidden');
    }
  });

  // ---------------- SEAL & SUBMIT MEMORY ----------------
  submitMemoryBtn.addEventListener('click', async () => {
    const friendName = friendNameInput.value.trim();
    const note = noteInput.value.trim();

    if (!friendName) {
      alert('Please enter your name or nickname!');
      friendNameInput.focus();
      return;
    }

    if (!capturedPhotoBase64) {
      alert('Please snap a photo in the photobooth or upload one!');
      return;
    }

    const wordCount = getWordCount(note);
    if (wordCount === 0) {
      alert('Please write a short note for the capsule!');
      noteInput.focus();
      return;
    }

    if (wordCount > 20) {
      alert('Your note exceeds the 20-word limit. Please trim it down.');
      noteInput.focus();
      return;
    }

    // Selected Mood
    const moodEl = document.querySelector('input[name="mood"]:checked');
    const mood = moodEl ? moodEl.value : 'Wholesome';

    submitMemoryBtn.disabled = true;
    submitMemoryBtn.style.opacity = '0.7';

    try {
      const memoryPayload = {
        friendName,
        note,
        wordCount,
        photoUrl: capturedPhotoBase64,
        mood,
        filter: currentFilter,
        stickers: placedStickers,
        createdAt: new Date().toISOString()
      };

      if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
        // Direct save to Cloud Firestore!
        await db.collection('memories').add(memoryPayload);
      } else {
        // Fallback: try server endpoint if available
        let serverSaved = false;
        try {
          const response = await fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              friendName,
              note,
              photoBase64: capturedPhotoBase64,
              mood,
              filter: currentFilter,
              stickers: placedStickers
            })
          });
          if (response.ok) serverSaved = true;
        } catch (e) {
          // offline/serverless
        }

        // Also save to offline localStorage
        const localMems = JSON.parse(localStorage.getItem('fc_offline_memories') || '[]');
        localMems.unshift({
          id: 'local_' + Date.now(),
          ...memoryPayload
        });
        localStorage.setItem('fc_offline_memories', JSON.stringify(localMems));
      }

      // Success! Play celebration and reveal envelope
      playConfetti();
      successFriendName.textContent = friendName;
      celebrationModal.classList.remove('hidden');

      // Update badge
      fetchStatus();

    } catch (err) {
      alert(err.message || 'An error occurred while sealing your memory.');
    } finally {
      submitMemoryBtn.disabled = false;
      submitMemoryBtn.style.opacity = '1';
    }
  });

  submitAnotherBtn.addEventListener('click', () => {
    celebrationModal.classList.add('hidden');
    // Reset form
    friendNameInput.value = '';
    noteInput.value = '';
    currentWordCount.textContent = '0';
    capturedPhotoBase64 = null;
    placedStickers = [];
    renderStickerCanvas();
    capturedPreviewBox.classList.add('hidden');
    switchTab('camera');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---------------- KEEPER'S SECRET KEY TRIGGER & PIN ----------------
  vaultKeyTrigger.addEventListener('click', () => {
    if (vaultToken) {
      // If already logged in, go straight to vault
      showVaultSanctuary();
    } else {
      openVaultLogin();
    }
  });

  function openVaultLogin() {
    vaultPinInput.value = '';
    pinErrorMsg.classList.add('hidden');
    vaultLoginModal.classList.remove('hidden');
    vaultPinInput.focus();
  }

  function closeVaultLogin() {
    vaultLoginModal.classList.add('hidden');
  }

  closeLoginModalBtn.addEventListener('click', closeVaultLogin);
  loginModalBackdrop.addEventListener('click', closeVaultLogin);

  // Keypad click handlers
  pinKeypad.addEventListener('click', (e) => {
    const digitBtn = e.target.closest('.key-digit');
    if (!digitBtn) return;

    if (digitBtn.classList.contains('key-clear')) {
      vaultPinInput.value = '';
    } else if (digitBtn.classList.contains('key-enter')) {
      handleVaultLogin();
    } else if (digitBtn.dataset.val) {
      if (vaultPinInput.value.length < 10) {
        vaultPinInput.value += digitBtn.dataset.val;
      }
    }
  });

  vaultPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleVaultLogin();
  });

  async function handleVaultLogin() {
    const pin = vaultPinInput.value.trim();
    if (!pin) return;

    // Check PIN against configured vaultPin, 0007, or 2026
    const allowedPins = [vaultPin, '0007', '2026'];
    if (allowedPins.includes(pin)) {
      vaultToken = 'vt_' + Date.now();
      sessionStorage.setItem('vault_token', vaultToken);
      closeVaultLogin();
      showVaultSanctuary();
      return;
    }

    // Try server endpoint if running local express
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        vaultToken = data.token;
        sessionStorage.setItem('vault_token', vaultToken);
        closeVaultLogin();
        showVaultSanctuary();
        return;
      }
    } catch (e) {
      // Offline / Vercel static
    }

    pinErrorMsg.textContent = 'Incorrect PIN. Only Shaurya Tripathi may enter.';
    pinErrorMsg.classList.remove('hidden');
    vaultPinInput.value = '';
    vaultPinInput.focus();
  }

  async function verifyExistingToken() {
    if (!vaultToken) return;
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${vaultToken}` }
      });
      const data = await res.json();
      if (data && data.authenticated === false && !vaultToken.startsWith('vt_')) {
        vaultToken = null;
        sessionStorage.removeItem('vault_token');
      }
    } catch (e) {
      // Keep token if client session active
    }
  }

  // ---------------- VAULT SANCTUARY VIEW ----------------
  function showVaultSanctuary() {
    publicContainer.classList.add('hidden');
    vaultSanctuary.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadVaultMemories();
  }

  function hideVaultSanctuary() {
    vaultSanctuary.classList.add('hidden');
    publicContainer.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  vaultLockBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${vaultToken}` }
      });
    } catch (e) { /* ignore */ }
    vaultToken = null;
    sessionStorage.removeItem('vault_token');
    hideVaultSanctuary();
  });

  async function loadVaultMemories() {
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      try {
        const snap = await db.collection('memories').orderBy('createdAt', 'desc').get();
        allMemories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        countAll.textContent = allMemories.length;
        renderCorkboard();
      } catch (e) {
        console.error('Failed to load from Firestore:', e);
      }
      return;
    }

    // Fallback: try server endpoint
    try {
      const res = await fetch('/api/vault/memories', {
        headers: { 'Authorization': `Bearer ${vaultToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        allMemories = data.memories || [];
      } else {
        allMemories = JSON.parse(localStorage.getItem('fc_offline_memories') || '[]');
      }
    } catch (e) {
      allMemories = JSON.parse(localStorage.getItem('fc_offline_memories') || '[]');
    }

    countAll.textContent = allMemories.length;
    renderCorkboard();
  }

  // Render Memories on Corkboard
  function renderCorkboard() {
    corkboardCanvas.innerHTML = '';

    const filtered = allMemories.filter(m => {
      const matchesMood = currentMoodFilter === 'all' || m.mood === currentMoodFilter;
      const q = currentSearchQuery.toLowerCase();
      const matchesSearch = !q || m.friendName.toLowerCase().includes(q) || (m.note && m.note.toLowerCase().includes(q));
      return matchesMood && matchesSearch;
    });

    if (filtered.length === 0) {
      vaultEmptyState.classList.remove('hidden');
      corkboardCanvas.appendChild(vaultEmptyState);
      return;
    }

    vaultEmptyState.classList.add('hidden');

    filtered.forEach((m, idx) => {
      // Deterministic slight tilt (-3deg to +3deg)
      const tilt = ((idx * 7) % 7) - 3;

      const card = document.createElement('article');
      card.className = 'corkboard-card';
      card.style.transform = `rotate(${tilt}deg)`;

      // Washi tape
      const tape = document.createElement('div');
      tape.className = 'card-washi-tape';
      card.appendChild(tape);

      // Photo wrapper
      const photoWrap = document.createElement('div');
      photoWrap.className = 'card-photo-wrap';

      const img = document.createElement('img');
      img.className = `card-photo-img filter-${m.filter || 'normal'}`;
      img.src = m.photoUrl;
      img.alt = `${m.friendName}'s snapshot`;
      img.loading = 'lazy';
      photoWrap.appendChild(img);

      // Stickers
      if (m.stickers && m.stickers.length > 0) {
        const stickersLayer = document.createElement('div');
        stickersLayer.className = 'card-stickers-layer';
        m.stickers.forEach(st => {
          const s = document.createElement('span');
          s.className = 'placed-sticker';
          s.textContent = st.emoji;
          s.style.left = `${st.x}%`;
          s.style.top = `${st.y}%`;
          s.style.transform = `translate(-50%, -50%) rotate(${st.rot}deg)`;
          s.style.fontSize = '1.3rem';
          stickersLayer.appendChild(s);
        });
        photoWrap.appendChild(stickersLayer);
      }
      card.appendChild(photoWrap);

      // Metadata tray
      const meta = document.createElement('div');
      meta.className = 'card-meta-tray';

      const friendRow = document.createElement('div');
      friendRow.className = 'card-friend-row';

      const name = document.createElement('span');
      name.className = 'card-friend-name';
      name.textContent = m.friendName;

      const moodBadge = document.createElement('span');
      moodBadge.className = 'card-mood-badge';
      moodBadge.textContent = m.mood;

      friendRow.appendChild(name);
      friendRow.appendChild(moodBadge);
      meta.appendChild(friendRow);

      // Note
      const noteP = document.createElement('p');
      noteP.className = 'card-handwritten-note';
      noteP.textContent = `“${m.note}”`;
      meta.appendChild(noteP);

      // Date Footer
      const footer = document.createElement('div');
      footer.className = 'card-date-footer';
      const dateStr = new Date(m.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      footer.innerHTML = `<span>${dateStr} • ${m.wordCount || 0}/20 words</span><span class="card-tripathi-stamp">DELIVERED TO त्रिपाठी ★</span>`;
      meta.appendChild(footer);

      card.appendChild(meta);

      // Click to inspect
      card.addEventListener('click', () => openDetailModal(m));

      corkboardCanvas.appendChild(card);
    });
  }

  // Filters & Search in Vault
  vaultSearchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    renderCorkboard();
  });

  vaultMoodFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.vault-filter-pill');
    if (!btn) return;
    document.querySelectorAll('.vault-filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMoodFilter = btn.dataset.vfilter;
    renderCorkboard();
  });

  // ---------------- DETAIL INSPECTOR MODAL ----------------
  function openDetailModal(memory) {
    activeDetailMemory = memory;
    detailPhotoImg.src = memory.photoUrl;
    detailPhotoImg.className = `filter-${memory.filter || 'normal'}`;
    detailFriendName.textContent = memory.friendName;
    detailNoteText.textContent = memory.note;
    detailMoodTag.textContent = memory.mood.toUpperCase();
    detailWordStat.textContent = `Word count: ${memory.wordCount || getWordCount(memory.note)} / 20`;
    detailTimestamp.textContent = new Date(memory.createdAt).toLocaleString();

    // Stickers overlay
    detailStickersLayer.innerHTML = '';
    if (memory.stickers) {
      memory.stickers.forEach(st => {
        const s = document.createElement('span');
        s.className = 'placed-sticker';
        s.textContent = st.emoji;
        s.style.left = `${st.x}%`;
        s.style.top = `${st.y}%`;
        s.style.transform = `translate(-50%, -50%) rotate(${st.rot}deg)`;
        s.style.fontSize = '2.2rem';
        detailStickersLayer.appendChild(s);
      });
    }

    detailModal.classList.remove('hidden');
  }

  function closeDetailModal() {
    detailModal.classList.add('hidden');
    activeDetailMemory = null;
  }

  closeDetailModalBtn.addEventListener('click', closeDetailModal);
  detailModalBackdrop.addEventListener('click', closeDetailModal);

  // Delete Memory from Vault
  deleteMemoryBtn.addEventListener('click', async () => {
    if (!activeDetailMemory) return;
    const confirmDelete = confirm(`Are you sure you want to remove ${activeDetailMemory.friendName}'s memory from the vault?`);
    if (!confirmDelete) return;

    try {
      if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
        await db.collection('memories').doc(activeDetailMemory.id).delete();
      } else {
        try {
          await fetch(`/api/vault/memories/${activeDetailMemory.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${vaultToken}` }
          });
        } catch (e) { /* offline */ }
      }

      // Remove from local memory list
      allMemories = allMemories.filter(m => m.id !== activeDetailMemory.id);
      localStorage.setItem('fc_offline_memories', JSON.stringify(allMemories));
      countAll.textContent = allMemories.length;
      if (statsLabel) statsLabel.textContent = `SEALED MEMORIES: ${allMemories.length}`;
      if (publicCountBadge) publicCountBadge.textContent = `${allMemories.length} SEALED`;

      closeDetailModal();
      renderCorkboard();
    } catch (e) {
      alert('Error removing memory: ' + (e.message || 'Please check connection.'));
    }
  });

  // Download Polaroid as Image
  downloadPolaroidBtn.addEventListener('click', () => {
    if (!activeDetailMemory) return;
    generateAndDownloadPolaroid(activeDetailMemory);
  });

  function generateAndDownloadPolaroid(mem) {
    const canvas = document.getElementById('exportCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 700;
    canvas.height = 900;

    // Draw polaroid background
    ctx.fillStyle = '#fefcf7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle polaroid border line
    ctx.strokeStyle = '#e6e0d2';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Draw photo
      const photoSize = 620;
      const photoX = 40;
      const photoY = 40;
      ctx.drawImage(img, photoX, photoY, photoSize, photoSize);

      // Draw stickers if any
      if (mem.stickers) {
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        mem.stickers.forEach(st => {
          const sx = photoX + (st.x / 100) * photoSize;
          const sy = photoY + (st.y / 100) * photoSize;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate((st.rot * Math.PI) / 180);
          ctx.fillText(st.emoji, 0, 0);
          ctx.restore();
        });
      }

      // Draw friend name
      ctx.fillStyle = '#1e2238';
      ctx.font = 'bold 36px serif';
      ctx.textAlign = 'left';
      ctx.fillText(mem.friendName.toUpperCase(), 44, 710);

      // Draw date
      ctx.fillStyle = '#7b819c';
      ctx.font = '18px monospace';
      const dateText = new Date(mem.createdAt).toLocaleDateString();
      ctx.fillText(dateText + ' • ' + mem.mood.toUpperCase() + ' • FOR TRIPATHI (त्रिपाठी)', 44, 745);

      // Draw note
      ctx.fillStyle = '#2b314a';
      ctx.font = 'italic 30px cursive, serif';
      wrapCanvasText(ctx, `“${mem.note}”`, 44, 790, 610, 36);

      // Download
      const link = document.createElement('a');
      link.download = `polaroid_${mem.friendName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = mem.photoUrl;
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  // ---------------- VAULT SETTINGS & PIN CHANGE ----------------
  vaultSettingsBtn.addEventListener('click', () => {
    newPinInput.value = '';
    settingsModal.classList.remove('hidden');
    newPinInput.focus();
  });

  function closeSettings() {
    settingsModal.classList.add('hidden');
  }

  closeSettingsBtn.addEventListener('click', closeSettings);
  settingsBackdrop.addEventListener('click', closeSettings);

  savePinBtn.addEventListener('click', async () => {
    const newPin = newPinInput.value.trim();
    if (!newPin || newPin.length < 4) {
      alert('PIN must be at least 4 digits/characters long.');
      return;
    }

    vaultPin = newPin;
    localStorage.setItem('fc_vault_pin', newPin);

    // Save to Firestore if available
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      try {
        await db.collection('settings').doc('vault').set({ pin: newPin }, { merge: true });
      } catch (e) {
        console.warn('Could not sync PIN to cloud:', e);
      }
    }

    // Also sync to local backend if running
    try {
      await fetch('/api/vault/update-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${vaultToken}`
        },
        body: JSON.stringify({ newPin })
      });
    } catch (e) { /* offline/serverless */ }

    alert(`Keeper PIN updated successfully to: ${newPin}`);
    closeSettings();
  });

  // Export All Memories (Direct browser JSON backup)
  vaultExportBtn.addEventListener('click', () => {
    if (!allMemories || allMemories.length === 0) {
      alert('The vault is empty. No memories to export yet.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allMemories, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `tripathi_vault_backup_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  });

  // ---------------- CLOUD SYNC MODAL HANDLERS ----------------
  if (vaultCloudBtn) {
    vaultCloudBtn.addEventListener('click', () => {
      updateCloudModalUI();
      cloudModal.classList.remove('hidden');
    });
  }

  function closeCloudModal() {
    if (cloudModal) cloudModal.classList.add('hidden');
  }

  if (closeCloudBtn) closeCloudBtn.addEventListener('click', closeCloudModal);
  if (cloudBackdrop) cloudBackdrop.addEventListener('click', closeCloudModal);

  function updateCloudModalUI() {
    if (!cloudStatusIndicator) return;
    if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
      const proj = (typeof activeFirebaseConfig !== 'undefined' && activeFirebaseConfig.projectId) ? activeFirebaseConfig.projectId : 'Active';
      cloudStatusIndicator.innerHTML = `🟢 <span style="color:#6ee7b7;">CONNECTED TO FIREBASE CLOUD</span><br><small style="color:#ddd;">Project: <strong>${proj}</strong> &bull; Live multi-device sync is ACTIVE!</small>`;
    } else {
      cloudStatusIndicator.innerHTML = `🟡 <span style="color:#fcd34d;">AWAITING FIREBASE CLOUD KEYS</span><br><small style="color:#ddd;">Memories currently saving locally. Paste your Firebase config below to sync across all phones &amp; devices live.</small>`;
    }
  }

  if (saveCloudConfigBtn) {
    saveCloudConfigBtn.addEventListener('click', () => {
      const raw = firebaseConfigInput.value.trim();
      if (!raw) {
        alert('Please paste your Firebase configuration object or JSON.');
        return;
      }
      try {
        let parsed = null;
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const looseJson = jsonMatch[0]
            .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":')
            .replace(/,\s*\}/g, '}');
          try {
            parsed = JSON.parse(looseJson);
          } catch (e) {
            parsed = (new Function(`return ${jsonMatch[0]}`))();
          }
        }
        if (!parsed || !parsed.apiKey || !parsed.projectId) {
          throw new Error('Config must contain apiKey and projectId.');
        }

        localStorage.setItem('fc_firebase_config', JSON.stringify(parsed));
        alert('🎉 Firebase Cloud Configuration saved! Reloading to connect live...');
        window.location.reload();
      } catch (err) {
        alert('Could not parse configuration: ' + err.message + '\nMake sure you copied the entire firebaseConfig object from Firebase Console.');
      }
    });
  }

  if (clearCloudConfigBtn) {
    clearCloudConfigBtn.addEventListener('click', () => {
      if (confirm('Reset custom cloud configuration?')) {
        localStorage.removeItem('fc_firebase_config');
        window.location.reload();
      }
    });
  }

  // ---------------- SLIDESHOW MODE ----------------
  vaultSlideshowBtn.addEventListener('click', () => {
    if (allMemories.length === 0) {
      alert('The vault is empty. No memories to present yet!');
      return;
    }
    slideshowIndex = 0;
    renderSlideshowSlide();
    slideshowContainer.classList.remove('hidden');
  });

  closeSlideshowBtn.addEventListener('click', () => {
    slideshowContainer.classList.add('hidden');
  });

  ssPrevBtn.addEventListener('click', () => {
    slideshowIndex = (slideshowIndex - 1 + allMemories.length) % allMemories.length;
    renderSlideshowSlide();
  });

  ssNextBtn.addEventListener('click', () => {
    slideshowIndex = (slideshowIndex + 1) % allMemories.length;
    renderSlideshowSlide();
  });

  function renderSlideshowSlide() {
    const m = allMemories[slideshowIndex];
    if (!m) return;
    ssCounter.textContent = `${slideshowIndex + 1} / ${allMemories.length}`;

    slideshowStage.innerHTML = `
      <div class="corkboard-card" style="max-width: 460px; width:100%; transform: rotate(-1deg); cursor:default;">
        <div class="card-washi-tape"></div>
        <div class="card-photo-wrap" style="aspect-ratio: 1/1;">
          <img class="card-photo-img filter-${m.filter || 'normal'}" src="${m.photoUrl}" alt="${m.friendName}" />
        </div>
        <div class="card-meta-tray" style="margin-top: 18px;">
          <div class="card-friend-row">
            <span class="card-friend-name" style="font-size: 1.5rem;">${m.friendName}</span>
            <span class="card-mood-badge">${m.mood}</span>
          </div>
          <p class="card-handwritten-note" style="font-size: 1.6rem; margin-top: 6px;">“${m.note}”</p>
        </div>
      </div>
    `;
  }

  // ---------------- CONFETTI ANIMATION ----------------
  function playConfetti() {
    const colors = ['#f3da8e', '#ea616f', '#6bc6dc', '#fcbc72', '#ffffff'];
    for (let i = 0; i < 45; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.left = `${Math.random() * 100}vw`;
      p.style.top = `${-20 - Math.random() * 50}px`;
      p.style.width = `${Math.floor(8 + Math.random() * 12)}px`;
      p.style.height = `${Math.floor(8 + Math.random() * 16)}px`;
      p.style.animationDelay = `${Math.random() * 0.4}s`;
      p.style.animationDuration = `${1.8 + Math.random() * 1.2}s`;
      document.body.appendChild(p);

      setTimeout(() => p.remove(), 3200);
    }
  }

  function playBeepSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) { /* ignore */ }
  }

  // ==========================================================================
  // TRIPATHI'S DHH CASSETTE & AIRPODS PLAYER (YOUTUBE EMBED • NO LOGIN)
  // ==========================================================================
  const dhhPlaylist = [
    { title: "11K", artist: "Seedhe Maut", id: "Q5r9-k7xYGw" },
    { title: "Namastute", artist: "Seedhe Maut", id: "YuWUJg3Kdks" },
    { title: "Hola Amigo", artist: "KR$NA ft. Seedhe Maut", id: "De9VIp37CjY" },
    { title: "Prarthana", artist: "KR$NA", id: "OKPAPX_fGVw" },
    { title: "Fateh", artist: "Karma", id: "2tr6PWlCEqs" },
    { title: "Angaar", artist: "Ikka ft. Raftaar", id: "GpjrKSyjXDE" },
    { title: "No Cap", artist: "KR$NA", id: "6bJ86T7L3Gg" },
    { title: "D-faulter", artist: "WhySoKai", id: "7W8-X9Z8Y0U" },
    { title: "Nanchaku", artist: "Seedhe Maut ft. MC Stan", id: "1G-N5_bZgOQ" }
  ];

  let currentTrackIdx = -1;
  let isDhhPlaying = false;
  let tapeTimer = null;
  let tapeSeconds = 0;

  const btnModeCassette = document.getElementById('btnModeCassette');
  const btnModeAirpods = document.getElementById('btnModeAirpods');
  const cassetteStage = document.getElementById('cassetteStage');
  const airpodsStage = document.getElementById('airpodsStage');
  const cassetteBody = document.getElementById('cassetteBody');
  const airpodsCase = document.getElementById('airpodsCase');
  const airpodsLid = document.getElementById('airpodsLid');
  const caseLed = document.getElementById('caseLed');
  const tapeReelLeft = document.getElementById('tapeReelLeft');
  const tapeReelRight = document.getElementById('tapeReelRight');
  const tapeCounter = document.getElementById('tapeCounter');
  const lcdStatusText = document.getElementById('lcdStatusText');
  const lcdTrackTitle = document.getElementById('lcdTrackTitle');
  const lcdArtistName = document.getElementById('lcdArtistName');
  const equalizerBars = document.querySelectorAll('.eq-bar');
  const btnShufflePlay = document.getElementById('btnShufflePlay');
  const btnShuffleText = document.getElementById('btnShuffleText');
  const btnNextTrack = document.getElementById('btnNextTrack');
  const btnToggleVideo = document.getElementById('btnToggleVideo');
  const youtubeDock = document.getElementById('youtubeDock');
  const closeDockBtn = document.getElementById('closeDockBtn');
  const youtubeEmbedTarget = document.getElementById('youtubeEmbedTarget');

  // Device Switcher
  if (btnModeCassette && btnModeAirpods) {
    btnModeCassette.addEventListener('click', () => {
      btnModeCassette.classList.add('active');
      btnModeAirpods.classList.remove('active');
      cassetteStage.classList.remove('hidden');
      airpodsStage.classList.add('hidden');
    });

    btnModeAirpods.addEventListener('click', () => {
      btnModeAirpods.classList.add('active');
      btnModeCassette.classList.remove('active');
      airpodsStage.classList.remove('hidden');
      cassetteStage.classList.add('hidden');
    });
  }

  // Interactive Cassette Click
  if (cassetteBody) {
    cassetteBody.addEventListener('click', () => {
      playRandomTrack();
    });
  }

  // Interactive AirPods Click
  if (airpodsCase) {
    airpodsCase.addEventListener('click', () => {
      airpodsCase.classList.toggle('is-open');
      if (caseLed) caseLed.classList.add('loading');
      setTimeout(() => {
        if (caseLed) caseLed.classList.remove('loading');
      }, 500);
      playRandomTrack();
    });
  }

  // Primary Buttons
  if (btnShufflePlay) {
    btnShufflePlay.addEventListener('click', () => {
      playRandomTrack();
    });
  }

  if (btnNextTrack) {
    btnNextTrack.addEventListener('click', () => {
      playRandomTrack();
    });
  }

  // Toggle Video Dock
  if (btnToggleVideo && youtubeDock) {
    btnToggleVideo.addEventListener('click', () => {
      youtubeDock.classList.toggle('hidden');
      btnToggleVideo.textContent = youtubeDock.classList.contains('hidden') ? '📺 SHOW VIDEO' : '✕ HIDE VIDEO';
    });
  }

  if (closeDockBtn && youtubeDock) {
    closeDockBtn.addEventListener('click', () => {
      youtubeDock.classList.add('hidden');
      if (btnToggleVideo) btnToggleVideo.textContent = '📺 SHOW VIDEO';
    });
  }

  function playRandomTrack() {
    // Pick next random track that is not the same as current
    let nextIdx = Math.floor(Math.random() * dhhPlaylist.length);
    if (nextIdx === currentTrackIdx && dhhPlaylist.length > 1) {
      nextIdx = (nextIdx + 1) % dhhPlaylist.length;
    }
    currentTrackIdx = nextIdx;
    const track = dhhPlaylist[currentTrackIdx];

    isDhhPlaying = true;

    // Visual State Updates
    if (btnShuffleText) btnShuffleText.textContent = 'SHUFFLE NEXT TRACK 🔀';
    if (lcdStatusText) lcdStatusText.textContent = 'NOW BLASTING DHH • NO LOGIN';
    if (lcdTrackTitle) lcdTrackTitle.textContent = `“${track.title}”`;
    if (lcdArtistName) lcdArtistName.textContent = track.artist.toUpperCase();

    // Reels Spin
    if (tapeReelLeft) tapeReelLeft.classList.add('spinning');
    if (tapeReelRight) tapeReelRight.classList.add('spinning');

    // Equalizer bars dance
    equalizerBars.forEach(b => b.classList.add('active'));

    // Start tape counter
    clearInterval(tapeTimer);
    tapeSeconds = 0;
    tapeTimer = setInterval(() => {
      tapeSeconds++;
      const mins = String(Math.floor(tapeSeconds / 60)).padStart(2, '0');
      const secs = String(tapeSeconds % 60).padStart(2, '0');
      if (tapeCounter) tapeCounter.textContent = `${mins}:${secs}`;
    }, 1000);

    // Embed YouTube with autoplay & no cookies
    if (youtubeEmbedTarget) {
      youtubeEmbedTarget.innerHTML = `
        <iframe 
          src="https://www.youtube-nocookie.com/embed/${track.id}?autoplay=1&enablejsapi=1&rel=0" 
          title="${track.title} by ${track.artist}" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
    }
  }

});
