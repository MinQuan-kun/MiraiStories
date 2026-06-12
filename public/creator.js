/* ==========================================================================
   WEBTRUYEN CREATOR STUDIO APPLICATION (Vanilla ES6)
   ========================================================================== */

// --- Global Application State ---
const state = {
  currentStoryId: null,
  currentChapterId: null,
  chaptersList: [],
  lastSavedContent: '',
  autoSaveInterval: null,
  isDraftChanged: false
};

// --- Custom Toast Notification Helper ---
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-notif');
  const msgSpan = document.getElementById('toast-msg');
  const icon = toast.querySelector('.toast-icon');
  
  msgSpan.textContent = message;
  
  if (type === 'success') {
    icon.className = 'fa-solid fa-circle-check toast-icon';
    toast.style.borderLeftColor = '#10b981';
  } else if (type === 'error') {
    icon.className = 'fa-solid fa-triangle-exclamation toast-icon';
    toast.style.borderLeftColor = '#ef4444';
  } else {
    icon.className = 'fa-solid fa-circle-info toast-icon';
    toast.style.borderLeftColor = 'var(--accent-color)';
  }
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// --- Custom Premium Dialog Modal System ---
function showCustomPrompt({ title, message = '', placeholder = '', defaultValue = '', type = 'text' }) {
  return new Promise((resolve) => {
    // Create elements
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    
    const card = document.createElement('div');
    card.className = 'custom-modal-card';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    
    let messageEl = null;
    if (message) {
      messageEl = document.createElement('p');
      messageEl.textContent = message;
    }
    
    const input = document.createElement('input');
    input.type = type;
    input.placeholder = placeholder;
    input.value = defaultValue;
    input.className = 'form-control custom-modal-input';
    input.style.marginBottom = '20px';
    input.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    
    const actions = document.createElement('div');
    actions.className = 'custom-modal-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Hủy';
    
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'btn btn-primary';
    okBtn.innerHTML = '<i class="fa-solid fa-check"></i> Xác nhận';
    
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    
    card.appendChild(titleEl);
    if (messageEl) card.appendChild(messageEl);
    card.appendChild(input);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Auto-focus input
    setTimeout(() => input.focus(), 50);
    
    // Event handlers
    const cleanup = (value) => {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 300);
    };
    
    cancelBtn.onclick = () => cleanup(null);
    okBtn.onclick = () => cleanup(input.value.trim());
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        okBtn.click();
      } else if (e.key === 'Escape') {
        cancelBtn.click();
      }
    };
  });
}

function showCustomConfirm({ title, message = '', confirmText = 'Xác nhận', cancelText = 'Hủy', danger = false }) {
  return new Promise((resolve) => {
    // Create elements
    const overlay = document.createElement('div');
    overlay.className = 'custom-modal-overlay';
    
    const card = document.createElement('div');
    card.className = 'custom-modal-card';
    
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    
    const actions = document.createElement('div');
    actions.className = 'custom-modal-actions';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> ${cancelText}`;
    
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
    okBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${confirmText}`;
    
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    
    card.appendChild(titleEl);
    card.appendChild(messageEl);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Focus ok button (or cancel if danger)
    setTimeout(() => {
      if (danger) {
        cancelBtn.focus();
      } else {
        okBtn.focus();
      }
    }, 50);
    
    // Event handlers
    const cleanup = (value) => {
      overlay.classList.add('closing');
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 300);
    };
    
    cancelBtn.onclick = () => cleanup(false);
    okBtn.onclick = () => cleanup(true);
    
    overlay.onkeydown = (e) => {
      if (e.key === 'Escape') {
        cancelBtn.click();
      }
    };
  });
}

// --- Upload file base64 helper ---
async function uploadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            data: reader.result
          })
        });
        if (response.ok) {
          const result = await response.json();
          resolve(result.url);
        } else {
          const err = await response.json();
          reject(new Error(err.error || 'Lỗi tải ảnh'));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Lỗi đọc tệp'));
    reader.readAsDataURL(file);
  });
}

// --- Delete Cloudinary image by URL ---
async function deleteCloudinaryFileByUrl(url) {
  if (!url || !url.startsWith('http') || !url.includes('cloudinary.com')) return;
  try {
    const response = await fetch('/api/upload/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!response.ok) {
      console.warn('Failed to delete Cloudinary file:', url);
    }
  } catch (err) {
    console.error('Failed to connect to delete API:', err);
  }
}

// --- Dynamic View Manager ---
function showView(viewId) {
  document.querySelectorAll('.spa-view').forEach(view => {
    if (view.id === `view-${viewId}`) {
      view.classList.remove('hidden');
    } else {
      view.classList.add('hidden');
    }
  });
  
  // Update nav active states
  const navDashboard = document.getElementById('nav-dashboard');
  const navGenres = document.getElementById('nav-genres-tab');
  if (navDashboard) navDashboard.classList.remove('active');
  if (navGenres) navGenres.classList.remove('active');
  
  if (viewId === 'dashboard' && navDashboard) {
    navDashboard.classList.add('active');
  } else if (viewId === 'genres' && navGenres) {
    navGenres.classList.add('active');
  }
  
  // Clean up auto-save timers
  if (viewId !== 'chapter-editor') {
    clearInterval(state.autoSaveInterval);
    state.autoSaveInterval = null;
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================================================
// 1. CREATOR ROUTING SYSTEM (HTML5 History API)
// ==========================================================================

class Router {
  constructor(routes) {
    this.routes = routes;
    window.addEventListener('popstate', () => this.resolve());
  }
  
  navigate(url) {
    history.pushState(null, null, url);
    this.resolve();
  }
  
  resolve() {
    const path = window.location.pathname;
    let matched = false;
    
    for (const route of this.routes) {
      const matches = path.match(route.path);
      if (matches) {
        showView(route.view);
        route.handler(matches);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      this.navigate('/creator');
    }
  }
}

// Define routes matching creator studio URL schemes
const creatorRoutes = [
  { path: /^\/creator$/, view: 'dashboard', handler: renderDashboard },
  { path: /^\/creator\/genres$/, view: 'genres', handler: renderGenresManager },
  { path: /^\/creator\/story\/new$/, view: 'story-editor', handler: () => renderStoryEditor('new') },
  { path: /^\/creator\/story\/([a-f0-9]{24})$/, view: 'story-editor', handler: (matches) => renderStoryEditor(matches[1]) },
  { path: /^\/creator\/story\/([a-f0-9]{24})\/chapter\/new$/, view: 'chapter-editor', handler: (matches) => renderChapterEditor(matches[1], 'new') },
  { path: /^\/creator\/story\/([a-f0-9]{24})\/chapter\/([a-f0-9]{24})$/, view: 'chapter-editor', handler: (matches) => renderChapterEditor(matches[1], matches[2]) }
];

window.appRouter = new Router(creatorRoutes);

// Intercept clicks on local links
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.getAttribute('href') && !link.getAttribute('target')) {
    const url = new URL(link.href);
    if (url.origin === window.location.origin) {
      e.preventDefault();
      window.appRouter.navigate(url.pathname);
    }
  }
});

// Init router and global dark theme toggle
window.addEventListener('DOMContentLoaded', () => {
  const authScreen = document.getElementById('creator-auth-screen');
  const appHeader = document.querySelector('.app-header');
  const mainContent = document.querySelector('.main-content');
  const authBtn = document.getElementById('creator-auth-btn');
  const dobInput = document.getElementById('creator-dob-input');
  const logoutBtn = document.getElementById('logout-creator-btn');

  // Verify access status
  const checkAccess = () => {
    const isCreator = localStorage.getItem('isCreator') === 'true';
    if (isCreator) {
      if (authScreen) authScreen.classList.add('hidden');
      if (appHeader) appHeader.style.display = '';
      if (mainContent) mainContent.style.display = '';
      window.appRouter.resolve();
    } else {
      if (authScreen) authScreen.classList.remove('hidden');
      if (appHeader) appHeader.style.display = 'none';
      if (mainContent) mainContent.style.display = 'none';
    }
  };

  // Bind Auth Submit Button
  if (authBtn && dobInput) {
    authBtn.onclick = () => {
      const dobVal = dobInput.value;
      if (!dobVal) {
        showToast('Vui lòng nhập ngày sinh!', 'error');
        return;
      }
      // Correct Creator DOB is set to 2005-09-27 (27/09/2005)
      if (dobVal === '2005-09-27') {
        localStorage.setItem('isCreator', 'true');
        showToast('Xác thực thành công! Chào mừng Creator.', 'success');
        checkAccess();
      } else {
        showToast('Xác thực thất bại! Ngày sinh không chính xác.', 'error');
      }
    };
  }

  // Bind Logout Button
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('isCreator');
      showToast('Đã đăng xuất khỏi tài khoản Creator.', 'info');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    };
  }

  // Run initial access check
  checkAccess();

  
  // Theme Toggle Button
  const themeToggle = document.getElementById('theme-toggle-btn');
  themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('theme-dark')) {
      document.body.classList.replace('theme-dark', 'theme-light');
      themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.replace('theme-light', 'theme-dark');
      themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
      localStorage.setItem('theme', 'dark');
    }
  });
  
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.replace('theme-dark', 'theme-light');
    themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
  }

  // --- Cover tabs switching ---
  const coverTabPresetBtn = document.getElementById('cover-tab-preset-btn');
  const coverTabCustomBtn = document.getElementById('cover-tab-custom-btn');
  const coverPresetContent = document.getElementById('cover-preset-content');
  const coverCustomContent = document.getElementById('cover-custom-content');

  if (coverTabPresetBtn && coverTabCustomBtn) {
    coverTabPresetBtn.onclick = () => {
      coverTabPresetBtn.classList.add('active');
      coverTabCustomBtn.classList.remove('active');
      coverPresetContent.style.display = 'block';
      coverCustomContent.style.display = 'none';
    };

    coverTabCustomBtn.onclick = () => {
      coverTabCustomBtn.classList.add('active');
      coverTabPresetBtn.classList.remove('active');
      coverPresetContent.style.display = 'none';
      coverCustomContent.style.display = 'block';
    };
  }

  // --- Story Editor Sub-Tabs (Meta vs Design) ---
  const storyTabMetaBtn = document.getElementById('story-tab-meta-btn');
  const storyTabDesignBtn = document.getElementById('story-tab-design-btn');
  const storyMetaFields = document.getElementById('story-meta-fields');
  const storyDesignFields = document.getElementById('story-design-fields');

  if (storyTabMetaBtn && storyTabDesignBtn && storyMetaFields && storyDesignFields) {
    storyTabMetaBtn.onclick = () => {
      storyTabMetaBtn.classList.add('active');
      storyTabDesignBtn.classList.remove('active');
      storyMetaFields.classList.remove('hidden');
      storyDesignFields.classList.add('hidden');
    };

    storyTabDesignBtn.onclick = () => {
      storyTabDesignBtn.classList.add('active');
      storyTabMetaBtn.classList.remove('active');
      storyMetaFields.classList.add('hidden');
      storyDesignFields.classList.remove('hidden');
    };
  }

  // --- Interface Design Fields Logic ---
  const designBgColor = document.getElementById('story-design-bgcolor');
  const designBgColorText = document.getElementById('story-design-bgcolor-text');
  
  if (designBgColor && designBgColorText) {
    designBgColor.addEventListener('input', (e) => {
      designBgColorText.value = e.target.value.toUpperCase();
    });
    designBgColorText.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        designBgColor.value = val;
      }
    });
  }

  const designBgOpacity = document.getElementById('story-design-bgopacity');
  const bgOpacityValText = document.getElementById('bgopacity-val');
  if (designBgOpacity && bgOpacityValText) {
    designBgOpacity.addEventListener('input', (e) => {
      bgOpacityValText.textContent = `${Math.round(e.target.value * 100)}%`;
    });
  }

  const designBgBlur = document.getElementById('story-design-bgblur');
  const bgBlurValText = document.getElementById('bgblur-val');
  if (designBgBlur && bgBlurValText) {
    designBgBlur.addEventListener('input', (e) => {
      bgBlurValText.textContent = `${e.target.value}px`;
    });
  }

  // --- Background Image Upload handler ---
  const bgImgUploadBtn = document.getElementById('story-design-bgimage-upload-btn');
  const bgImgFileInput = document.getElementById('story-design-bgimage-file');
  const bgImgUrlInput = document.getElementById('story-design-bgimage-url');
  const bgImgClearBtn = document.getElementById('clear-design-bgimage-btn');
  const bgImgPreviewBox = document.getElementById('story-design-bgimage-preview-box');
  const bgImgPreviewImg = document.getElementById('story-design-bgimage-preview-img');

  if (bgImgUploadBtn && bgImgFileInput) {
    bgImgUploadBtn.onclick = () => {
      bgImgFileInput.click();
    };

    bgImgFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      showToast('Đang tải ảnh nền lên...', 'info');
      try {
        const url = await uploadImageFile(file);
        const oldUrl = bgImgUrlInput.value.trim();
        if (oldUrl) {
          deleteCloudinaryFileByUrl(oldUrl);
        }
        bgImgUrlInput.value = url;
        bgImgPreviewImg.src = url;
        bgImgPreviewBox.style.display = 'block';
        bgImgClearBtn.style.display = 'inline-block';
        showToast('Tải ảnh nền thành công!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (bgImgUrlInput) {
    bgImgUrlInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        bgImgPreviewImg.src = val;
        bgImgPreviewBox.style.display = 'block';
        bgImgClearBtn.style.display = 'inline-block';
      } else {
        bgImgPreviewBox.style.display = 'none';
        bgImgClearBtn.style.display = 'none';
      }
    });
  }

  if (bgImgClearBtn) {
    bgImgClearBtn.onclick = () => {
      const oldUrl = bgImgUrlInput.value.trim();
      if (oldUrl) {
        deleteCloudinaryFileByUrl(oldUrl);
      }
      bgImgUrlInput.value = '';
      bgImgPreviewImg.src = '';
      bgImgPreviewBox.style.display = 'none';
      bgImgClearBtn.style.display = 'none';
      bgImgFileInput.value = '';
      showToast('Đã xóa ảnh nền.');
    };
  }

  // --- Custom cover file upload ---
  const coverFileInput = document.getElementById('cover-file-upload-input');
  if (coverFileInput) {
    coverFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      showToast('Đang tải ảnh bìa lên...', 'info');
      try {
        const url = await uploadImageFile(file);
        const oldUrl = document.getElementById('cover-custom-url-val').value.trim();
        if (oldUrl) {
          deleteCloudinaryFileByUrl(oldUrl);
        }
        document.getElementById('cover-custom-url-val').value = url;
        const previewBox = document.getElementById('cover-upload-preview-box');
        const previewImg = document.getElementById('cover-upload-preview-img');
        previewImg.src = url;
        previewBox.style.display = 'block';
        showToast('Tải ảnh bìa thành công!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // --- Custom icon file upload ---
  const iconUploadTrigger = document.getElementById('icon-file-upload-trigger-btn');
  const iconFileInput = document.getElementById('icon-file-upload-input');
  const iconCustomPreviewBox = document.getElementById('icon-custom-preview-box');
  const iconCustomPreviewImg = document.getElementById('icon-custom-preview-img');
  const iconCustomUrlVal = document.getElementById('icon-custom-url-val');
  const clearCustomIconBtn = document.getElementById('clear-custom-icon-btn');

  if (iconUploadTrigger && iconFileInput) {
    iconUploadTrigger.onclick = () => {
      iconFileInput.click();
    };

    iconFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      showToast('Đang tải ảnh icon lên...', 'info');
      try {
        const url = await uploadImageFile(file);
        const oldUrl = iconCustomUrlVal.value.trim();
        if (oldUrl) {
          deleteCloudinaryFileByUrl(oldUrl);
        }
        iconCustomUrlVal.value = url;
        iconCustomPreviewImg.src = url;
        iconCustomPreviewBox.style.display = 'flex';
        showToast('Tải ảnh icon thành công!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (clearCustomIconBtn) {
    clearCustomIconBtn.onclick = () => {
      const oldUrl = iconCustomUrlVal.value.trim();
      if (oldUrl) {
        deleteCloudinaryFileByUrl(oldUrl);
      }
      iconCustomUrlVal.value = '';
      iconCustomPreviewImg.src = '';
      iconCustomPreviewBox.style.display = 'none';
      iconFileInput.value = '';
      showToast('Đã xóa icon tự chọn, sử dụng lại icon mặc định.');
    };
  }

  // --- Chapter image file upload ---
  const chapterImageInput = document.getElementById('chapter-image-upload-input');
  if (chapterImageInput) {
    chapterImageInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      showToast('Đang tải hình ảnh lên...', 'info');
      try {
        const url = await uploadImageFile(file);
        const caption = await showCustomPrompt({
          title: 'Chú thích hình ảnh',
          message: 'Nhập chú thích/mô tả ảnh (không bắt buộc):',
          placeholder: 'Ví dụ: Ảnh minh họa, Miku đọc sách...'
        }) || '';
        const markdown = `\n![${caption}](${url})\n`;

        const contentField = document.getElementById('chapter-content-input');
        if (contentField) {
          const start = contentField.selectionStart;
          const end = contentField.selectionEnd;
          const text = contentField.value;

          contentField.value = text.substring(0, start) + markdown + text.substring(end);
          contentField.focus();

          contentField.selectionStart = contentField.selectionEnd = start + markdown.length;

          // Dispatch input event to trigger char counters & auto-saves
          contentField.dispatchEvent(new Event('input'));
        }
        showToast('Tải ảnh thành công và đã chèn vào nội dung!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        chapterImageInput.value = '';
      }
    });
  }

  // --- Create Genre Form Submit ---
  const createGenreForm = document.getElementById('create-genre-form');
  if (createGenreForm) {
    createGenreForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('genre-name-input');
      const name = nameInput.value.trim();
      
      if (!name) return;
      
      try {
        const res = await fetch('/api/genres', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        
        if (res.ok) {
          nameInput.value = '';
          showToast(`Đã tạo thể loại "${name}" thành công!`, 'success');
          renderGenresManager();
        } else {
          const err = await res.json();
          showToast(err.error || 'Lỗi tạo thể loại.', 'error');
        }
      } catch (err) {
        showToast('Lỗi kết nối máy chủ.', 'error');
      }
    });
  }
});

// ==========================================================================
// 2. CREATOR CONTROLLERS & DATA PERSISTENCE
// ==========================================================================

// --- VIEW 1: DASHBOARD ---
async function renderDashboard() {
  // Stats Loading
  try {
    const statsRes = await fetch('/api/stats');
    const stats = await statsRes.json();
    
    document.getElementById('stat-total-stories').textContent = stats.totalStories;
    document.getElementById('stat-total-chapters').textContent = stats.totalChapters;
    document.getElementById('stat-total-words').textContent = stats.totalWords;
    document.getElementById('stat-total-reads').textContent = stats.totalReads;
  } catch (e) {
    showToast('Lỗi tải thống kê sáng tác.', 'error');
  }

  // Author Stories List Loading
  const listDiv = document.getElementById('dashboard-stories-list');
  listDiv.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải truyện sáng tác...</div>';
  
  try {
    const storiesRes = await fetch('/api/stories');
    const stories = await storiesRes.json();
    
    if (stories.length === 0) {
      listDiv.innerHTML = `
        <div class="empty-list-notice">
          Bạn chưa viết câu chuyện nào cả. Hãy nhấn nút <strong>"Tạo truyện mới"</strong> bên trên để bắt đầu!
        </div>
      `;
      return;
    }
    
    listDiv.innerHTML = stories.map(story => {
      const coverSrc = (story.cover && (story.cover.startsWith('/') || story.cover.startsWith('http'))) 
        ? story.cover 
        : `/api/stories/${story._id}/cover.svg`;
      return `
        <div class="dashboard-story-row">
          <img src="${coverSrc}" alt="Cover" class="dashboard-story-cover">
          <div class="dashboard-story-details">
            <a href="/story/${story._id}" target="_blank" class="dashboard-story-title">${story.title} <i class="fa-solid fa-up-right-from-square" font-size="12px"></i></a>
            <div class="dashboard-story-stats">
              <span><i class="fa-solid fa-eye"></i> ${story.reads} lượt đọc</span>
              <span><i class="fa-solid fa-heart"></i> ${story.likes} lượt thích</span>
              <span><i class="fa-solid fa-bookmark"></i> Thể loại: ${story.genre}</span>
            </div>
          </div>
          <div class="dashboard-story-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.appRouter.navigate('/creator/story/${story._id}')">
              <i class="fa-solid fa-gear"></i> Cấu hình & Chương
            </button>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    listDiv.innerHTML = '<div class="empty-list-notice">Có lỗi xảy ra khi tải danh sách truyện.</div>';
  }
}

// Bind "Create new story" button
document.getElementById('create-new-story-btn').onclick = () => {
  window.appRouter.navigate('/creator/story/new');
};

// Helper to dynamically load genres into select elements
async function loadGenresToSelect(selectedGenre = '') {
  const genreInput = document.getElementById('story-genre-input');
  if (!genreInput) return;
  
  try {
    const res = await fetch('/api/genres');
    const genres = await res.json();
    
    genreInput.innerHTML = '<option value="">-- Chọn thể loại --</option>';
    genres.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.name;
      opt.textContent = g.name;
      genreInput.appendChild(opt);
    });
    
    if (selectedGenre) {
      genreInput.value = selectedGenre;
    }
  } catch (err) {
    showToast('Lỗi tải danh sách thể loại.', 'error');
  }
}

// --- VIEW 2: STORY DETAILS & CHAPTER PANEL ---
async function renderStoryEditor(storyId) {
  state.currentStoryId = storyId;
  
  const titleInput = document.getElementById('story-title-input');
  const authorInput = document.getElementById('story-author-input');
  const genreInput = document.getElementById('story-genre-input');
  const tagsInput = document.getElementById('story-tags-input');
  const statusInput = document.getElementById('story-status-input');
  const synopsisInput = document.getElementById('story-synopsis-input');
  const deleteStoryBtn = document.getElementById('delete-story-btn');
  const pageTitle = document.getElementById('story-editor-page-title');
  const chaptersListUl = document.getElementById('editor-chapters-list');
  const addChapterBtn = document.getElementById('add-new-chapter-btn');
  
  // Clear fields
  titleInput.value = '';
  authorInput.value = '';
  genreInput.value = '';
  tagsInput.value = '';
  statusInput.value = 'Đang tiến hành';
  synopsisInput.value = '';
  
  // Reset story sub-tabs to Meta tab
  const storyTabMetaBtn = document.getElementById('story-tab-meta-btn');
  if (storyTabMetaBtn) storyTabMetaBtn.click();

  // Clear design fields

  document.getElementById('story-design-bgcolor').value = '#000000';
  document.getElementById('story-design-bgcolor-text').value = '';
  document.getElementById('story-design-width').value = 'medium';
  document.getElementById('story-design-bgimage-url').value = '';
  document.getElementById('story-design-bgimage-preview-box').style.display = 'none';
  document.getElementById('story-design-bgimage-preview-img').src = '';
  document.getElementById('clear-design-bgimage-btn').style.display = 'none';
  document.getElementById('story-design-bgimage-file').value = '';
  document.getElementById('story-design-bgopacity').value = 1;
  document.getElementById('bgopacity-val').textContent = '100%';
  document.getElementById('story-design-bgblur').value = 0;
  document.getElementById('bgblur-val').textContent = '0px';
  
  // Clear custom cover and icon uploads
  document.getElementById('cover-custom-url-val').value = '';
  document.getElementById('cover-upload-preview-box').style.display = 'none';
  document.getElementById('cover-upload-preview-img').src = '';
  document.getElementById('cover-file-upload-input').value = '';
  
  document.getElementById('icon-custom-url-val').value = '';
  document.getElementById('icon-custom-preview-box').style.display = 'none';
  document.getElementById('icon-custom-preview-img').src = '';
  document.getElementById('icon-file-upload-input').value = '';

  // Reset presets
  document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector('.preset-btn.p-blue').classList.add('active');
  document.getElementById('cover-icon-input').value = '📖';
  
  // Set default active tab to Preset
  const coverTabPresetBtn = document.getElementById('cover-tab-preset-btn');
  if (coverTabPresetBtn) coverTabPresetBtn.click();

  if (storyId === 'new') {
    pageTitle.innerHTML = '<i class="fa-solid fa-plus text-primary"></i> Đăng ký truyện mới';
    deleteStoryBtn.classList.add('hidden');
    
    // Disable chapter panel until story is saved
    chaptersListUl.innerHTML = '<li class="empty-list-notice"><i class="fa-solid fa-lock"></i> Hãy tạo và lưu thông tin truyện trước để bắt đầu viết chương.</li>';
    addChapterBtn.disabled = true;
    
    authorInput.value = 'Bút danh';
    
    await loadGenresToSelect();
    
    document.getElementById('save-story-meta-btn').onclick = () => saveStoryMeta(true);
    
  } else {
    pageTitle.innerHTML = '<i class="fa-solid fa-pen text-primary"></i> Quản lý truyện';
    deleteStoryBtn.classList.remove('hidden');
    addChapterBtn.disabled = false;
    
    try {
      const res = await fetch(`/api/stories/${storyId}`);
      const { story, chapters } = await res.json();
      
      titleInput.value = story.title;
      authorInput.value = story.author || '';
      
      await loadGenresToSelect(story.genre);
      
      tagsInput.value = story.tags ? story.tags.join(', ') : '';
      statusInput.value = story.status;
      synopsisInput.value = story.synopsis;

      // Populate layout settings
      if (story.layoutSettings) {
        const ls = story.layoutSettings;

        if (ls.bgColor) {
          document.getElementById('story-design-bgcolor').value = ls.bgColor;
          document.getElementById('story-design-bgcolor-text').value = ls.bgColor;
        }
        document.getElementById('story-design-width').value = ls.marginWidth || 'medium';
        if (ls.bgImageUrl) {
          document.getElementById('story-design-bgimage-url').value = ls.bgImageUrl;
          document.getElementById('story-design-bgimage-preview-img').src = ls.bgImageUrl;
          document.getElementById('story-design-bgimage-preview-box').style.display = 'block';
          document.getElementById('clear-design-bgimage-btn').style.display = 'inline-block';
        }
        if (ls.bgImageOpacity !== undefined) {
          document.getElementById('story-design-bgopacity').value = ls.bgImageOpacity;
          document.getElementById('bgopacity-val').textContent = `${Math.round(ls.bgImageOpacity * 100)}%`;
        }
        if (ls.bgImageBlur !== undefined) {
          document.getElementById('story-design-bgblur').value = ls.bgImageBlur;
          document.getElementById('bgblur-val').textContent = `${ls.bgImageBlur}px`;
        }
      }
      
      // Parse cover details
      if (story.cover) {
        if (story.cover.startsWith('/') || story.cover.startsWith('http')) {
          // Custom Cover Image from directory
          const coverTabCustomBtn = document.getElementById('cover-tab-custom-btn');
          if (coverTabCustomBtn) coverTabCustomBtn.click();
          document.getElementById('cover-custom-url-val').value = story.cover;
          const previewBox = document.getElementById('cover-upload-preview-box');
          const previewImg = document.getElementById('cover-upload-preview-img');
          previewImg.src = story.cover;
          previewBox.style.display = 'block';
        } else {
          // Preset Cover
          const coverTabPresetBtn = document.getElementById('cover-tab-preset-btn');
          if (coverTabPresetBtn) coverTabPresetBtn.click();
          try {
            const coverObj = JSON.parse(story.cover);
            const colorsStr = coverObj.colors.join(',');
            
            document.querySelectorAll('.preset-btn').forEach(btn => {
              if (btn.dataset.colors === colorsStr) {
                btn.classList.add('active');
              } else {
                btn.classList.remove('active');
              }
            });
            
            if (coverObj.icon) {
              if (coverObj.icon.startsWith('/') || coverObj.icon.startsWith('http')) {
                // Custom Icon from directory
                document.getElementById('icon-custom-url-val').value = coverObj.icon;
                const previewImg = document.getElementById('icon-custom-preview-img');
                previewImg.src = coverObj.icon;
                document.getElementById('icon-custom-preview-box').style.display = 'flex';
              } else {
                // Predefined dropdown icon
                document.getElementById('cover-icon-input').value = coverObj.icon;
              }
            }
          } catch(e) {}
        }
      }
      
      // Render chapter list
      if (chapters.length === 0) {
        chaptersListUl.innerHTML = '<li class="empty-list-notice">Truyện này chưa có chương. Nhấn "Viết chương mới" để bắt đầu viết.</li>';
      } else {
        chaptersListUl.innerHTML = chapters.map(ch => {
          return `
            <li class="editor-chapter-item">
              <div class="chapter-item-details">
                <span class="chapter-item-title">Chương ${ch.order}: ${ch.title}</span>
                <div class="chapter-item-meta">
                  <span>${ch.wordCount} từ</span>
                  <span class="chapter-status-tag ${ch.isDraft ? 'draft' : 'published'}">
                    ${ch.isDraft ? 'Nháp' : 'Đã đăng'}
                  </span>
                </div>
              </div>
              <div class="chapter-item-actions">
                <button class="icon-btn" title="Chỉnh sửa chương" onclick="window.appRouter.navigate('/creator/story/${storyId}/chapter/${ch._id}')">
                  <i class="fa-solid fa-pencil text-primary"></i>
                </button>
                <button class="icon-btn" title="Xóa chương" onclick="deleteChapter('${ch._id}')">
                  <i class="fa-solid fa-trash text-danger"></i>
                </button>
              </div>
            </li>
          `;
        }).join('');
      }
      
      document.getElementById('save-story-meta-btn').onclick = () => saveStoryMeta(false);
      
      // Delete Story
      deleteStoryBtn.onclick = async () => {
        const confirmed = await showCustomConfirm({
          title: 'Xóa truyện vĩnh viễn',
          message: `Bạn có chắc chắn muốn xóa hoàn toàn truyện "${story.title}"? Tất cả chương và bình luận của truyện sẽ bị xóa vĩnh viễn.`,
          confirmText: 'Xóa vĩnh viễn',
          danger: true
        });
        if (confirmed) {
          try {
            const delRes = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
            if (delRes.ok) {
              showToast('Đã xóa truyện thành công.', 'success');
              window.appRouter.navigate('/creator');
            } else {
              showToast('Lỗi khi xóa truyện.', 'error');
            }
          } catch(e) {
            showToast('Lỗi kết nối.', 'error');
          }
        }
      };
      
      // Add Chapter Route Bind
      addChapterBtn.onclick = () => {
        window.appRouter.navigate(`/creator/story/${storyId}/chapter/new`);
      };
      
    } catch(err) {
      showToast('Có lỗi xảy ra khi tải thông tin truyện.', 'error');
      window.appRouter.navigate('/creator');
    }
  }
}

// Preset Picker handlers
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.preset-btn').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
  };
});

// Save Story Metadata
async function saveStoryMeta(isNew) {
  const title = document.getElementById('story-title-input').value.trim();
  const author = document.getElementById('story-author-input').value.trim() || 'Tác giả';
  const genre = document.getElementById('story-genre-input').value;
  const status = document.getElementById('story-status-input').value;
  const synopsis = document.getElementById('story-synopsis-input').value.trim();
  
  const tagsRaw = document.getElementById('story-tags-input').value;
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
  
  // Check if custom cover tab is active
  const isCustomTab = document.getElementById('cover-tab-custom-btn').classList.contains('active');
  let cover = '';
  
  if (isCustomTab) {
    const customCoverUrl = document.getElementById('cover-custom-url-val').value;
    if (!customCoverUrl) {
      showToast('Vui lòng tải ảnh bìa lên hoặc chọn tab Bìa nghệ thuật.', 'error');
      return;
    }
    cover = customCoverUrl;
  } else {
    const activePreset = document.querySelector('.preset-btn.active');
    const colors = activePreset ? activePreset.dataset.colors.split(',') : ['#6366f1', '#a855f7'];
    
    // Check if custom icon is uploaded
    const customIconUrl = document.getElementById('icon-custom-url-val').value;
    const icon = customIconUrl ? customIconUrl : document.getElementById('cover-icon-input').value;
    
    cover = JSON.stringify({ colors, icon });
  }
  
  // Collect layout settings
  const bgColor = document.getElementById('story-design-bgcolor-text').value.trim() || document.getElementById('story-design-bgcolor').value;
  const marginWidth = document.getElementById('story-design-width').value;
  const bgImageUrl = document.getElementById('story-design-bgimage-url').value.trim();
  const bgImageOpacity = parseFloat(document.getElementById('story-design-bgopacity').value);
  const bgImageBlur = parseInt(document.getElementById('story-design-bgblur').value, 10);

  const layoutSettings = {
    bgColor,
    marginWidth,
    bgImageUrl,
    bgImageOpacity,
    bgImageBlur
  };

  if (!title || !genre || !synopsis) {
    showToast('Vui lòng điền đầy đủ các thông tin bắt buộc (*)', 'error');
    return;
  }
  
  const payload = { title, author, genre, status, synopsis, tags, cover, layoutSettings };
  
  try {
    let res;
    if (isNew) {
      res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`/api/stories/${state.currentStoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    
    if (res.ok) {
      const savedStory = await res.json();
      showToast('Đã lưu thông tin truyện thành công!', 'success');
      
      if (isNew) {
        window.appRouter.navigate(`/creator/story/${savedStory._id}`);
      } else {
        renderStoryEditor(state.currentStoryId);
      }
    } else {
      const errData = await res.json();
      showToast(`Lỗi: ${errData.error}`, 'error');
    }
  } catch(e) {
    showToast('Lỗi kết nối máy chủ.', 'error');
  }
}

// Delete Chapter
async function deleteChapter(chapterId) {
  const confirmed = await showCustomConfirm({
    title: 'Xóa chương vĩnh viễn',
    message: 'Bạn có muốn xóa chương này vĩnh viễn không?',
    confirmText: 'Xóa chương',
    danger: true
  });
  if (confirmed) {
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Đã xóa chương thành công!', 'success');
        renderStoryEditor(state.currentStoryId);
      } else {
        showToast('Không thể xóa chương.', 'error');
      }
    } catch(e) {
      showToast('Lỗi kết nối.', 'error');
    }
  }
}

// --- VIEW 3: DISTRACTION-FREE CHAPTER EDITOR ---
async function renderChapterEditor(storyId, chapterId) {
  state.currentStoryId = storyId;
  state.currentChapterId = chapterId;
  state.lastSavedContent = '';
  state.isDraftChanged = false;
  
  const titleField = document.getElementById('chapter-title-input');
  const contentField = document.getElementById('chapter-content-input');
  const statusBadge = document.getElementById('chapter-status-badge');
  const saveBtn = document.getElementById('save-chapter-draft-btn');
  const publishBtn = document.getElementById('publish-chapter-btn');
  const backStoryBtn = document.getElementById('editor-back-to-story-btn');
  
  titleField.value = '';
  contentField.value = '';
  statusBadge.textContent = 'Bản nháp';
  statusBadge.style.color = '#eab308';
  
  backStoryBtn.onclick = async () => {
    if (state.isDraftChanged) {
      const confirmed = await showCustomConfirm({
        title: 'Rời khỏi trình soạn thảo?',
        message: 'Bạn có thay đổi chưa lưu trên máy chủ. Tiếp tục rời đi?',
        confirmText: 'Rời đi',
        cancelText: 'Ở lại',
        danger: true
      });
      if (!confirmed) {
        return;
      }
    }
    window.appRouter.navigate(`/creator/story/${storyId}`);
  };
  
  if (chapterId !== 'new') {
    try {
      const res = await fetch(`/api/chapters/${chapterId}`);
      if (!res.ok) throw new Error('Không tìm thấy chương');
      const chapter = await res.json();
      
      titleField.value = chapter.title;
      contentField.value = chapter.content;
      state.lastSavedContent = chapter.content;
      
      if (chapter.isDraft) {
        statusBadge.textContent = 'Bản nháp';
        statusBadge.style.color = '#eab308';
      } else {
        statusBadge.textContent = 'Đã xuất bản';
        statusBadge.style.color = '#10b981';
      }
    } catch(err) {
      showToast('Không thể tải chi tiết chương.', 'error');
      window.appRouter.navigate(`/creator/story/${storyId}`);
      return;
    }
  }
  
  // Local Resilient Backup recovery checks
  const backupKey = `backup_${storyId}_${chapterId}`;
  const localBackup = localStorage.getItem(backupKey);
  if (localBackup && localBackup !== contentField.value) {
    const confirmed = await showCustomConfirm({
      title: 'Khôi phục bản sao lưu?',
      message: 'Phát hiện bản sao lưu chưa lưu trên trình duyệt của bạn. Bạn có muốn phục hồi dữ liệu viết này không?',
      confirmText: 'Phục hồi',
      cancelText: 'Bỏ qua'
    });
    if (confirmed) {
      contentField.value = localBackup;
      state.isDraftChanged = true;
    }
  }

  const updateStats = () => {
    const title = titleField.value.trim();
    const content = contentField.value;
    
    const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
    const chars = content.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    
    document.getElementById('chapter-word-count').textContent = words;
    document.getElementById('chapter-char-count').textContent = chars;
    document.getElementById('chapter-reading-time').textContent = readTime;
    
    if (content !== state.lastSavedContent) {
      state.isDraftChanged = true;
    }
  };
  
  titleField.oninput = updateStats;
  contentField.oninput = () => {
    updateStats();
    localStorage.setItem(backupKey, contentField.value);
  };
  
  updateStats(); // Init labels

  saveBtn.onclick = () => saveChapter(true);
  publishBtn.onclick = () => saveChapter(false);
  
  // Upload image from computer directly without asking
  const uploadImgBtn = document.getElementById('upload-image-btn');
  if (uploadImgBtn) {
    uploadImgBtn.onclick = () => {
      const fileInput = document.getElementById('chapter-image-upload-input');
      if (fileInput) {
        fileInput.click();
      }
    };
  }

  // Insert image URL
  const insertImageUrlBtn = document.getElementById('insert-image-url-btn');
  if (insertImageUrlBtn) {
    insertImageUrlBtn.onclick = async () => {
      const url = await showCustomPrompt({
        title: 'Chèn ảnh từ URL',
        message: 'Nhập đường dẫn (URL) của hình ảnh:',
        placeholder: 'https://example.com/image.jpg'
      });
      if (url) {
        const caption = await showCustomPrompt({
          title: 'Chú thích hình ảnh',
          message: 'Nhập chú thích/mô tả ảnh (không bắt buộc):',
          placeholder: 'Ví dụ: Ảnh minh họa, Miku đọc sách...'
        }) || '';
        const markdown = `\n![${caption}](${url})\n`;
        
        const start = contentField.selectionStart;
        const end = contentField.selectionEnd;
        const text = contentField.value;
        
        contentField.value = text.substring(0, start) + markdown + text.substring(end);
        contentField.focus();
        
        contentField.selectionStart = contentField.selectionEnd = start + markdown.length;
        
        updateStats();
        localStorage.setItem(backupKey, contentField.value);
      }
    };
  }

  // Editor Soạn thảo vs Xem trước Mode Toggles
  const editorBtnWrite = document.getElementById('editor-btn-write');
  const editorBtnPreview = document.getElementById('editor-btn-preview');
  const contentTextareaWrapper = document.getElementById('content-textarea-wrapper');
  const chapterPreviewWrapper = document.getElementById('chapter-preview-wrapper');
  const chapterPreviewContent = document.getElementById('chapter-preview-content');

  if (editorBtnWrite && editorBtnPreview) {
    // Reset to Write mode on load
    editorBtnWrite.classList.add('active');
    editorBtnWrite.style.background = 'var(--accent-color)';
    editorBtnWrite.style.color = '#fff';
    editorBtnPreview.classList.remove('active');
    editorBtnPreview.style.background = 'transparent';
    editorBtnPreview.style.color = 'var(--text-color)';
    if (contentTextareaWrapper) contentTextareaWrapper.classList.remove('hidden');
    if (chapterPreviewWrapper) chapterPreviewWrapper.classList.add('hidden');

    editorBtnWrite.onclick = () => {
      editorBtnWrite.classList.add('active');
      editorBtnWrite.style.background = 'var(--accent-color)';
      editorBtnWrite.style.color = '#fff';
      editorBtnPreview.classList.remove('active');
      editorBtnPreview.style.background = 'transparent';
      editorBtnPreview.style.color = 'var(--text-color)';
      
      if (contentTextareaWrapper) contentTextareaWrapper.classList.remove('hidden');
      if (chapterPreviewWrapper) chapterPreviewWrapper.classList.add('hidden');
      
      if (uploadImgBtn) uploadImgBtn.disabled = false;
      if (insertImageUrlBtn) insertImageUrlBtn.disabled = false;
      
      contentField.focus();
    };

    editorBtnPreview.onclick = () => {
      editorBtnPreview.classList.add('active');
      editorBtnPreview.style.background = 'var(--accent-color)';
      editorBtnPreview.style.color = '#fff';
      editorBtnWrite.classList.remove('active');
      editorBtnWrite.style.background = 'transparent';
      editorBtnWrite.style.color = 'var(--text-color)';
      
      if (contentTextareaWrapper) contentTextareaWrapper.classList.add('hidden');
      if (chapterPreviewWrapper) chapterPreviewWrapper.classList.remove('hidden');
      
      if (uploadImgBtn) uploadImgBtn.disabled = true;
      if (insertImageUrlBtn) insertImageUrlBtn.disabled = true;
      
      if (chapterPreviewContent) {
        chapterPreviewContent.innerHTML = parseChapterContent(contentField.value);
        bindImageResizersInPreview();
      }
    };
  }
  
  // Auto-save local draft background task
  let saveTickerCount = 0;
  state.autoSaveInterval = setInterval(() => {
    if (state.isDraftChanged) {
      const indicator = document.getElementById('editor-saving-indicator');
      indicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tự động lưu nháp cục bộ...';
      indicator.classList.add('show');
      
      localStorage.setItem(backupKey, contentField.value);
      
      setTimeout(() => {
        indicator.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đã tự động lưu nháp cục bộ';
      }, 1000);
      
      saveTickerCount++;
      if (saveTickerCount >= 4) { // Sync to MongoDB Atlas every 20 seconds of continuous typing
        saveChapter(true, true);
        saveTickerCount = 0;
      }
    }
  }, 5000);
}

// Chapter Save
async function saveChapter(isDraft, isSilent = false) {
  const titleField = document.getElementById('chapter-title-input');
  const contentField = document.getElementById('chapter-content-input');
  const statusBadge = document.getElementById('chapter-status-badge');
  const indicator = document.getElementById('editor-saving-indicator');
  
  const title = titleField.value.trim();
  const content = contentField.value;
  
  if (!title || !content) {
    if (!isSilent) showToast('Tiêu đề và nội dung chương không được để trống.', 'error');
    return;
  }
  
  const payload = { title, content, isDraft };
  const isCreatingNew = state.currentChapterId === 'new';
  
  try {
    if (!isSilent) {
      indicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu lên máy chủ...';
      indicator.classList.add('show');
    }
    
    let res;
    if (isCreatingNew) {
      res = await fetch(`/api/stories/${state.currentStoryId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`/api/chapters/${state.currentChapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    
    if (res.ok) {
      const savedChapter = await res.json();
      
      state.lastSavedContent = content;
      state.isDraftChanged = false;
      
      const backupKey = `backup_${state.currentStoryId}_${state.currentChapterId}`;
      localStorage.removeItem(backupKey);
      
      if (isCreatingNew) {
        state.currentChapterId = savedChapter._id;
        history.replaceState(null, null, `/creator/story/${state.currentStoryId}/chapter/${savedChapter._id}`);
      }
      
      if (savedChapter.isDraft) {
        statusBadge.textContent = 'Bản nháp';
        statusBadge.style.color = '#eab308';
      } else {
        statusBadge.textContent = 'Đã xuất bản';
        statusBadge.style.color = '#10b981';
      }
      
      indicator.innerHTML = '<i class="fa-solid fa-cloud"></i> Đã đồng bộ với máy chủ';
      indicator.classList.add('show');
      
      if (!isSilent) {
        showToast('Đã lưu dữ liệu chương thành công!', 'success');
      }
      
      setTimeout(() => {
        if (!state.isDraftChanged) indicator.classList.remove('show');
      }, 3000);
      
    } else {
      if (!isSilent) showToast('Lỗi lưu chương lên máy chủ.', 'error');
    }
  } catch(e) {
    if (!isSilent) showToast('Lỗi kết nối máy chủ.', 'error');
  }
}

// --- HTML Escaping Helper to Prevent XSS ---
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Parse Chapter Content paragraphs & image markdowns ---
function parseChapterContent(content) {
  if (!content) return '';
  
  // Escape raw HTML characters for safety first
  const escaped = escapeHtml(content);
  
  // Split by double line breaks (paragraphs)
  const paragraphs = escaped.split(/\n\s*\n/);
  
  let imageIndex = 0;
  
  return paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    
    // Check if paragraph is purely a block image: ![alt](url)
    const imgRegex = /^!\[(.*?)\]\((.*?)\)$/;
    const imgMatch = p.match(imgRegex);
    if (imgMatch) {
      const alt = imgMatch[1];
      const src = imgMatch[2];
      
      // Extract width and align from query parameters
      let styleStr = '';
      let wrapperStyleStr = '';
      
      try {
        const urlParts = src.split('?');
        if (urlParts[1]) {
          const params = new URLSearchParams(urlParts[1]);
          const widthVal = params.get('width');
          const alignVal = params.get('align');
          
          if (widthVal) {
            styleStr += `width: ${widthVal}; max-width: 100%;`;
          }
          
          if (alignVal) {
            if (alignVal === 'center') {
              styleStr += ' display: block; margin: 0 auto;';
              wrapperStyleStr += ' text-align: center;';
            } else if (alignVal === 'left') {
              styleStr += ' display: block; margin: 0 auto 0 0;';
              wrapperStyleStr += ' text-align: left;';
            } else if (alignVal === 'right') {
              styleStr += ' display: block; margin: 0 0 0 auto;';
              wrapperStyleStr += ' text-align: right;';
            }
          } else {
            styleStr += ' display: block; margin: 0 auto;';
            wrapperStyleStr += ' text-align: center;';
          }
        } else {
          styleStr += ' display: block; margin: 0 auto;';
          wrapperStyleStr += ' text-align: center;';
        }
      } catch (e) {
        styleStr += ' display: block; margin: 0 auto;';
        wrapperStyleStr += ' text-align: center;';
      }
      
      const finalStyle = styleStr ? ` style="${styleStr}"` : '';
      const finalWrapperStyle = wrapperStyleStr ? ` style="${wrapperStyleStr}"` : '';
      
      const index = imageIndex++;
      return `<div class="reader-image-wrapper" data-index="${index}"${finalWrapperStyle}>
        <img src="${src}" alt="${alt}" class="reader-image"${finalStyle}>
        ${alt ? `<span class="reader-image-caption">${alt}</span>` : ''}
      </div>`;
    }
    
    // Check for inline images inside paragraph: ![alt](url)
    let html = p;
    const inlineImgRegex = /!\[(.*?)\]\((.*?)\)/g;
    html = html.replace(inlineImgRegex, (match, alt, src) => {
      let styleStr = '';
      try {
        const urlParts = src.split('?');
        if (urlParts[1]) {
          const params = new URLSearchParams(urlParts[1]);
          const widthVal = params.get('width');
          if (widthVal) {
            styleStr += `width: ${widthVal}; max-width: 100%;`;
          }
        }
      } catch (e) {}
      
      const finalStyle = styleStr ? ` style="${styleStr}"` : '';
      const index = imageIndex++;
      return `<span class="reader-image-wrapper" data-index="${index}" style="display: inline-block;"><img src="${src}" alt="${alt}" class="reader-image"${finalStyle}></span>`;
    });
    
    // Convert single newlines to <br> breaks inside paragraph
    html = html.replace(/\n/g, '<br>');
    
    return `<p class="reader-paragraph">${html}</p>`;
  }).join('\n');
}

// --- Helper to update image width and alignment inside Markdown string ---
function updateImageParamsInMarkdown(text, targetIndex, newWidth, newAlign) {
  let currentIndex = 0;
  const regex = /(!\[.*?\])\((.*?)\)/g;
  
  return text.replace(regex, (match, altPart, url) => {
    if (currentIndex === targetIndex) {
      currentIndex++;
      const parts = url.split('?');
      const baseUrl = parts[0];
      const params = new URLSearchParams(parts[1] || '');
      
      if (newWidth !== undefined) {
        if (newWidth === '') {
          params.delete('width');
        } else {
          params.set('width', newWidth);
        }
      }
      
      if (newAlign !== undefined) {
        if (newAlign === '') {
          params.delete('align');
        } else {
          params.set('align', newAlign);
        }
      }
      
      const paramStr = params.toString();
      const finalUrl = paramStr ? `${baseUrl}?${paramStr}` : baseUrl;
      return `${altPart}(${finalUrl})`;
    }
    currentIndex++;
    return match;
  });
}

// --- Bind visual size and alignment adjustments to previewed images ---
function bindImageResizersInPreview() {
  const wrappers = document.querySelectorAll('#chapter-preview-content .reader-image-wrapper');
  wrappers.forEach((wrapper, index) => {
    if (wrapper.querySelector('.image-resizer-toolbar')) return;
    
    const toolbar = document.createElement('div');
    toolbar.className = 'image-resizer-toolbar';
    toolbar.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(4px);
      padding: 6px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 10;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    `;
    
    // 1. Size control row
    const sizeRow = document.createElement('div');
    sizeRow.style.cssText = 'display: flex; gap: 4px; align-items: center;';
    
    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Cỡ:';
    sizeLabel.style.cssText = 'color: #94a3b8; font-size: 11px; margin-right: 4px; font-family: var(--font-sans); width: 28px; text-align: right;';
    sizeRow.appendChild(sizeLabel);
    
    const sizes = [
      { label: 'Gốc', value: '' },
      { label: '25%', value: '25%' },
      { label: '50%', value: '50%' },
      { label: '75%', value: '75%' },
      { label: '100%', value: '100%' },
      { label: '300px', value: '300px' },
      { label: '500px', value: '500px' }
    ];
    
    sizes.forEach(size => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = size.label;
      btn.style.cssText = `
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: #fff;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-sans);
      `;
      btn.onmouseover = () => btn.style.background = 'var(--accent-color)';
      btn.onmouseout = () => btn.style.background = 'rgba(255, 255, 255, 0.08)';
      
      btn.onclick = (e) => {
        e.stopPropagation();
        const contentField = document.getElementById('chapter-content-input');
        if (contentField) {
          const updatedContent = updateImageParamsInMarkdown(contentField.value, index, size.value, undefined);
          contentField.value = updatedContent;
          
          contentField.dispatchEvent(new Event('input'));
          
          const chapterPreviewContent = document.getElementById('chapter-preview-content');
          if (chapterPreviewContent) {
            chapterPreviewContent.innerHTML = parseChapterContent(contentField.value);
            bindImageResizersInPreview();
          }
          showToast(size.value ? `Đã đổi kích thước ảnh thành ${size.label}` : 'Đã khôi phục kích thước mặc định', 'success');
        }
      };
      sizeRow.appendChild(btn);
    });
    
    // 2. Alignment control row
    const alignRow = document.createElement('div');
    alignRow.style.cssText = 'display: flex; gap: 4px; align-items: center;';
    
    const alignLabel = document.createElement('span');
    alignLabel.textContent = 'Căn:';
    alignLabel.style.cssText = 'color: #94a3b8; font-size: 11px; margin-right: 4px; font-family: var(--font-sans); width: 28px; text-align: right;';
    alignRow.appendChild(alignLabel);
    
    const alignments = [
      { label: 'Trái', value: 'left' },
      { label: 'Giữa', value: 'center' },
      { label: 'Phải', value: 'right' }
    ];
    
    alignments.forEach(align => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = align.label;
      btn.style.cssText = `
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: #fff;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-sans);
      `;
      btn.onmouseover = () => btn.style.background = 'var(--accent-color)';
      btn.onmouseout = () => btn.style.background = 'rgba(255, 255, 255, 0.08)';
      
      btn.onclick = (e) => {
        e.stopPropagation();
        const contentField = document.getElementById('chapter-content-input');
        if (contentField) {
          const updatedContent = updateImageParamsInMarkdown(contentField.value, index, undefined, align.value);
          contentField.value = updatedContent;
          
          contentField.dispatchEvent(new Event('input'));
          
          const chapterPreviewContent = document.getElementById('chapter-preview-content');
          if (chapterPreviewContent) {
            chapterPreviewContent.innerHTML = parseChapterContent(contentField.value);
            bindImageResizersInPreview();
          }
          showToast(`Đã căn lề hình ảnh sang ${align.label}`, 'success');
        }
      };
      alignRow.appendChild(btn);
    });
    
    toolbar.appendChild(sizeRow);
    toolbar.appendChild(alignRow);
    
    wrapper.style.position = 'relative';
    wrapper.appendChild(toolbar);
  });
}

// --- VIEW 4: GENRES MANAGER ---
async function renderGenresManager() {
  const genresList = document.getElementById('genres-list');
  if (!genresList) return;
  
  genresList.innerHTML = `
    <div class="loading-spinner">
      <i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải danh sách thể loại...
    </div>
  `;
  
  try {
    const res = await fetch('/api/genres');
    const genres = await res.json();
    
    if (genres.length === 0) {
      genresList.innerHTML = '<li class="empty-list-notice">Không có thể loại nào. Hãy tạo thể loại mới!</li>';
      return;
    }
    
    genresList.innerHTML = genres.map(g => {
      return `
        <li class="editor-chapter-item">
          <div class="chapter-item-details">
            <span class="chapter-item-title" style="font-size: 16px; font-weight: 500;"><i class="fa-solid fa-tag text-primary" style="margin-right: 8px;"></i> ${escapeHtml(g.name)}</span>
          </div>
          <div class="chapter-item-actions">
            <button class="icon-btn" title="Xóa thể loại" onclick="deleteGenre('${g._id}', '${escapeHtml(g.name)}')">
              <i class="fa-solid fa-trash text-danger"></i>
            </button>
          </div>
        </li>
      `;
    }).join('');
    
  } catch (err) {
    genresList.innerHTML = '<li class="empty-list-notice">Có lỗi xảy ra khi tải danh sách thể loại.</li>';
  }
}

// Delete Genre Handler
async function deleteGenre(genreId, name) {
  const confirmed = await showCustomConfirm({
    title: 'Xóa thể loại',
    message: `Bạn có chắc chắn muốn xóa thể loại "${name}"? Thể loại này sẽ bị loại bỏ khỏi danh sách lựa chọn.`,
    confirmText: 'Xóa thể loại',
    danger: true
  });
  if (confirmed) {
    try {
      const res = await fetch(`/api/genres/${genreId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Đã xóa thể loại "${name}" thành công!`, 'success');
        renderGenresManager();
      } else {
        const err = await res.json();
        showToast(err.error || 'Không thể xóa thể loại.', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ.', 'error');
    }
  }
}

// Bind to window to allow inline onclick attribute
window.deleteGenre = deleteGenre;
