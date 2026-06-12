/* ==========================================================================
   MIRAI BOOKS READER PORTAL APPLICATION (Vanilla ES6)
   ========================================================================== */

// --- Global Application State ---
const state = {
  currentStoryId: null,
  currentChapterId: null,
  chaptersList: [] // Cache of chapters for the current story
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

// --- Dynamic View Manager ---
function showView(viewId) {
  document.querySelectorAll('.spa-view').forEach(view => {
    if (view.id === `view-${viewId}`) {
      view.classList.remove('hidden');
    } else {
      view.classList.add('hidden');
    }
  });

  // Clean active navigation classes
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  const homeNav = document.getElementById('nav-home');
  if (homeNav) homeNav.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Format Date Helper ---
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('vi-VN', options);
}

// ==========================================================================
// 1. READER ROUTING SYSTEM (HTML5 History API)
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
      this.navigate('/');
    }
  }
}

// Define reader routes
const appRoutes = [
  { path: /^\/$/, view: 'home', handler: renderHome },
  { path: /^\/story\/([a-f0-9]{24})$/, view: 'story-detail', handler: (matches) => renderStoryDetail(matches[1]) },
  { path: /^\/story\/([a-f0-9]{24})\/chapter\/([a-f0-9]{24})$/, view: 'reader-mode', handler: (matches) => renderReaderMode(matches[1], matches[2]) }
];

window.appRouter = new Router(appRoutes);

// Intercept clicks on relative links for SPA routing
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

window.addEventListener('DOMContentLoaded', () => {
  window.appRouter.resolve();
  initThemeAndSettings();
  initLayoutCustomizer();
});

// --- Custom Creator Theme Applicator ---
function applyLayoutSettings(story, chapter = null) {
  const ls = story.layoutSettings;
  const overlay = document.getElementById('custom-bg-overlay');


  // 2. Tên tab trình duyệt
  if (chapter) {
    document.title = `${chapter.title} - ${story.title}`;
  } else {
    document.title = `${story.title} - WebTruyen`;
  }

  if (!ls) {
    if (overlay) {
      overlay.style.backgroundImage = 'none';
      overlay.style.opacity = 0;
      overlay.style.filter = 'none';
      overlay.style.display = 'none';
    }
    document.body.style.backgroundColor = '';
    return;
  }

  // 3. Màu nền trang
  if (ls.bgColor) {
    document.body.style.backgroundColor = ls.bgColor;
  } else {
    document.body.style.backgroundColor = '';
  }

  // 4. Lề hai bên (Reader margins)
  const textViewport = document.getElementById('reader-text-content');
  if (textViewport) {
    const margin = ls.marginWidth || 'medium';
    textViewport.className = `reader-text font-${localStorage.getItem('reader-font') || 'serif'} width-${margin}`;

    // Update active state in reader settings panel if present
    document.querySelectorAll('.width-select').forEach(b => {
      if (b.dataset.width === margin) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    const widths = { 'narrow': 'Hẹp', 'medium': 'Vừa', 'wide': 'Rộng' };
    const widthValLabel = document.getElementById('line-width-val');
    if (widthValLabel) widthValLabel.textContent = widths[margin];
  }

  // 5. Ảnh nền trang + 6. Độ mờ/rõ
  if (overlay) {
    if (ls.bgImageUrl) {
      overlay.style.backgroundImage = `url(${ls.bgImageUrl})`;
      overlay.style.opacity = ls.bgImageOpacity !== undefined ? ls.bgImageOpacity : 1;
      overlay.style.filter = `blur(${ls.bgImageBlur || 0}px)`;
      overlay.style.display = 'block';
    } else {
      overlay.style.backgroundImage = 'none';
      overlay.style.opacity = 0;
      overlay.style.filter = 'none';
      overlay.style.display = 'none';
    }
  }
}

function resetLayoutSettings() {
  const overlay = document.getElementById('custom-bg-overlay');
  if (overlay) {
    overlay.style.backgroundImage = 'none';
    overlay.style.opacity = 0;
    overlay.style.filter = 'none';
    overlay.style.display = 'none';
  }

  document.body.style.backgroundColor = '';


  // Restore document title based on route/view
  const viewStoryDetail = document.getElementById('view-story-detail');
  const viewReaderMode = document.getElementById('view-reader-mode');

  if (viewStoryDetail && !viewStoryDetail.classList.contains('hidden')) {
    const title = document.getElementById('detail-title').textContent;
    document.title = title ? `${title} - WebTruyen` : 'WebTruyen';
  } else if (viewReaderMode && !viewReaderMode.classList.contains('hidden')) {
    const chTitle = document.getElementById('reader-chapter-title').textContent;
    const storyTitle = document.getElementById('reader-story-title-nav').textContent;
    document.title = `${chTitle} - ${storyTitle}`;
  } else {
    document.title = 'MiraiStories';
  }
}

// ==========================================================================
// 2. READER VIEW CONTROLLERS
// ==========================================================================

// --- VIEW 1: HOME/DISCOVERY PORTAL ---
async function renderHome() {
  await loadAndApplyGlobalLayout();
  const grid = document.getElementById('stories-grid');
  grid.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải danh sách truyện...</div>';

  try {
    const res = await fetch('/api/stories');
    const stories = await res.json();

    if (stories.length === 0) {
      grid.innerHTML = '<div class="empty-list-notice">Chưa có truyện nào được đăng tải.</div>';
      return;
    }

    grid.innerHTML = stories.map(story => {
      const isOngoing = story.status === 'Đang tiến hành';
      const coverSrc = (story.cover && (story.cover.startsWith('/') || story.cover.startsWith('http')))
        ? story.cover
        : `/api/stories/${story._id}/cover.svg`;
      return `
        <article class="story-card" onclick="window.appRouter.navigate('/story/${story._id}')">
          <div class="story-card-cover-container">
            <img src="${coverSrc}" alt="${story.title}" class="story-card-cover" loading="lazy">
          </div>
          <div class="story-card-info">
            <span class="story-card-genre">${story.genre}</span>
            <h3 class="story-card-title">${story.title}</h3>
            <span class="story-card-author">Tác giả: ${story.author || 'Ẩn danh'}</span>
            <p class="story-card-synopsis">${story.synopsis}</p>
            <div class="story-card-footer">
              <span class="story-card-status ${isOngoing ? 'ongoing' : 'completed'}">
                ${story.status}
              </span>
              <div class="story-card-stats">
                <span class="story-card-stat"><i class="fa-solid fa-eye"></i> ${story.reads}</span>
                <span class="story-card-stat"><i class="fa-solid fa-heart"></i> ${story.likes}</span>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

  } catch (err) {
    grid.innerHTML = '<div class="empty-list-notice">Đã xảy ra lỗi khi tải danh sách truyện.</div>';
  }
}

// --- VIEW 2: STORY DETAILS ---
async function renderStoryDetail(storyId) {
  state.currentStoryId = storyId;

  fetch(`/api/stories/${storyId}/increment/reads`, { method: 'POST' }).catch(() => { });

  try {
    const res = await fetch(`/api/stories/${storyId}`);
    if (!res.ok) throw new Error('Không tìm thấy truyện');

    const { story, chapters } = await res.json();
    state.chaptersList = chapters;

    applyLayoutSettings(story);

    const coverSrc = (story.cover && (story.cover.startsWith('/') || story.cover.startsWith('http')))
      ? story.cover
      : `/api/stories/${story._id}/cover.svg`;
    document.getElementById('detail-cover-img').src = coverSrc;
    document.getElementById('detail-genre').textContent = story.genre;
    document.getElementById('detail-title').textContent = story.title;
    document.getElementById('detail-author-name').textContent = story.author || 'Tác giả ẩn danh';
    document.getElementById('detail-reads').textContent = story.reads;
    document.getElementById('detail-likes').textContent = story.likes;
    document.getElementById('detail-chapters-count').textContent = chapters.length;
    document.getElementById('detail-synopsis-text').textContent = story.synopsis;

    const readFirstBtn = document.getElementById('read-first-btn');
    const publishedChapters = chapters.filter(c => !c.isDraft);
    if (publishedChapters.length > 0) {
      readFirstBtn.disabled = false;
      readFirstBtn.onclick = () => window.appRouter.navigate(`/story/${story._id}/chapter/${publishedChapters[0]._id}`);
    } else {
      readFirstBtn.disabled = true;
      readFirstBtn.innerHTML = '<i class="fa-solid fa-ban"></i> Chưa có chương';
    }

    const tagsContainer = document.getElementById('detail-tags-container');
    if (story.tags && story.tags.length > 0) {
      tagsContainer.innerHTML = story.tags.map(t => `<span class="tag-badge">#${t.trim()}</span>`).join('');
    } else {
      tagsContainer.innerHTML = '';
    }

    const chaptersListUl = document.getElementById('detail-chapters-list');
    if (publishedChapters.length === 0) {
      chaptersListUl.innerHTML = '<li class="empty-list-notice">Tác giả chưa xuất bản chương nào.</li>';
    } else {
      chaptersListUl.innerHTML = publishedChapters.map(ch => {
        const readTime = Math.ceil(ch.wordCount / 200);
        return `
          <li class="chapter-list-item">
            <div class="chapter-link-info">
              <a href="/story/${story._id}/chapter/${ch._id}" class="chapter-link-title">Chương ${ch.order}: ${ch.title}</a>
              <span class="chapter-link-meta">${ch.wordCount} từ • Khoảng ${readTime} phút đọc</span>
            </div>
            <span class="comment-date"><i class="fa-solid fa-clock"></i> ${new Date(ch.createdAt).toLocaleDateString('vi-VN')}</span>
          </li>
        `;
      }).join('');
    }

    // Like Event
    const likeBtn = document.getElementById('like-story-btn');
    likeBtn.onclick = async () => {
      try {
        const likeRes = await fetch(`/api/stories/${storyId}/increment/likes`, { method: 'POST' });
        const updatedStory = await likeRes.json();
        document.getElementById('detail-likes').textContent = updatedStory.likes;
        showToast('Cảm ơn bạn đã thích truyện này!', 'success');
      } catch (e) { }
    };

    loadComments(storyId);

    // Comments Submit
    const commentForm = document.getElementById('comment-form');
    commentForm.onsubmit = async (e) => {
      e.preventDefault();
      const authorInput = document.getElementById('comment-author');
      const contentInput = document.getElementById('comment-content');

      try {
        const commentRes = await fetch(`/api/stories/${storyId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author: authorInput.value,
            content: contentInput.value
          })
        });

        if (commentRes.ok) {
          contentInput.value = '';
          showToast('Đã gửi bình luận thành công!', 'success');
          loadComments(storyId);
        }
      } catch (err) {
        showToast('Không thể gửi bình luận.', 'error');
      }
    };

  } catch (err) {
    showToast(err.message, 'error');
    window.appRouter.navigate('/');
  }
}

// Load Comments list
async function loadComments(storyId) {
  try {
    const res = await fetch(`/api/stories/${storyId}/comments`);
    const comments = await res.json();

    document.getElementById('detail-comments-count').textContent = comments.length;

    const commentsListDiv = document.getElementById('detail-comments-list');
    if (comments.length === 0) {
      commentsListDiv.innerHTML = '<p class="empty-list-notice">Chưa có bình luận nào. Hãy chia sẻ cảm nghĩ của bạn!</p>';
    } else {
      commentsListDiv.innerHTML = comments.map(c => `
        <div class="comment-card">
          <div class="comment-card-header">
            <span class="comment-author-name"><i class="fa-solid fa-user-pen text-muted"></i> ${c.author}</span>
            <span class="comment-date">${formatDate(c.createdAt)}</span>
          </div>
          <div class="comment-card-body">${c.content}</div>
        </div>
      `).join('');
    }
  } catch (e) { }
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
      } catch (e) { }

      const finalStyle = styleStr ? ` style="${styleStr}"` : '';
      const index = imageIndex++;
      return `<span class="reader-image-wrapper" data-index="${index}" style="display: inline-block;"><img src="${src}" alt="${alt}" class="reader-image"${finalStyle}></span>`;
    });

    // Convert single newlines to <br> breaks inside paragraph
    html = html.replace(/\n/g, '<br>');

    return `<p class="reader-paragraph">${html}</p>`;
  }).join('\n');
}

// --- VIEW 3: READER MODE ---
async function renderReaderMode(storyId, chapterId) {
  state.currentStoryId = storyId;
  state.currentChapterId = chapterId;

  try {
    const viewport = document.getElementById('reader-text-content');
    viewport.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải chương...</div>';

    const [chRes, storyRes] = await Promise.all([
      fetch(`/api/chapters/${chapterId}`),
      fetch(`/api/stories/${storyId}`)
    ]);

    if (!chRes.ok || !storyRes.ok) throw new Error('Không tìm thấy chương hoặc truyện');

    const chapter = await chRes.json();
    const { story, chapters } = await storyRes.json();

    applyLayoutSettings(story, chapter);

    document.getElementById('reader-back-to-story').href = `/story/${story._id}`;
    document.getElementById('reader-story-title-nav').textContent = story.title;
    document.getElementById('reader-chapter-title').textContent = chapter.title;
    document.getElementById('reader-word-count').textContent = chapter.wordCount;
    document.getElementById('reader-read-time').textContent = Math.max(1, Math.ceil(chapter.wordCount / 200));

    viewport.innerHTML = parseChapterContent(chapter.content);

    // Pagination
    const publishedChapters = chapters.filter(c => !c.isDraft);
    const currentIndex = publishedChapters.findIndex(c => c._id === chapterId);

    const prevBtn = document.getElementById('prev-chapter-btn');
    const nextBtn = document.getElementById('next-chapter-btn');

    if (currentIndex > 0) {
      prevBtn.disabled = false;
      prevBtn.onclick = () => window.appRouter.navigate(`/story/${storyId}/chapter/${publishedChapters[currentIndex - 1]._id}`);
    } else {
      prevBtn.disabled = true;
    }

    if (currentIndex >= 0 && currentIndex < publishedChapters.length - 1) {
      nextBtn.disabled = false;
      nextBtn.innerHTML = 'Chương tiếp theo <i class="fa-solid fa-chevron-right"></i>';
      nextBtn.onclick = () => window.appRouter.navigate(`/story/${storyId}/chapter/${publishedChapters[currentIndex + 1]._id}`);
    } else {
      nextBtn.disabled = true;
      nextBtn.innerHTML = 'Hết truyện <i class="fa-solid fa-flag-checkered"></i>';
    }

  } catch (err) {
    showToast(err.message, 'error');
    window.appRouter.navigate(`/story/${storyId}`);
  }
}

// ==========================================================================
// 3. READER PREFERENCES & THEMES
// ==========================================================================

function initThemeAndSettings() {
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

  const settingsToggle = document.getElementById('reader-settings-toggle');
  const settingsPanel = document.getElementById('reader-settings-panel');

  if (settingsToggle) {
    settingsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsPanel.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      settingsPanel.classList.remove('show');
    });

    settingsPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Themes selectors
    document.querySelectorAll('.theme-select').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-select').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = btn.dataset.theme;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('reader-theme', theme);
        if (theme === 'light') themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        if (theme === 'dark') themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
      });
    });

    // Fonts selectors
    document.querySelectorAll('.font-select').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.font-select').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const font = btn.dataset.font;
        const textViewport = document.getElementById('reader-text-content');
        textViewport.className = `reader-text font-${font} width-${localStorage.getItem('reader-width') || 'medium'}`;
        localStorage.setItem('reader-font', font);
      });
    });

    // Width selectors
    document.querySelectorAll('.width-select').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.width-select').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const width = btn.dataset.width;
        const textViewport = document.getElementById('reader-text-content');
        textViewport.className = `reader-text font-${localStorage.getItem('reader-font') || 'serif'} width-${width}`;

        const widths = { 'narrow': 'Hẹp', 'medium': 'Vừa', 'wide': 'Rộng' };
        document.getElementById('line-width-val').textContent = widths[width];
        localStorage.setItem('reader-width', width);
      });
    });

    // Size selectors
    let currentFontSize = parseInt(localStorage.getItem('reader-font-size')) || 18;
    const sizeValLabel = document.getElementById('font-size-val');
    const textViewport = document.getElementById('reader-text-content');

    const setFontSize = (size) => {
      currentFontSize = Math.min(28, Math.max(14, size));
      textViewport.style.fontSize = `${currentFontSize}px`;
      sizeValLabel.textContent = `${currentFontSize}px`;
      localStorage.setItem('reader-font-size', currentFontSize);
    };

    document.getElementById('font-decrease').addEventListener('click', () => setFontSize(currentFontSize - 2));
    document.getElementById('font-increase').addEventListener('click', () => setFontSize(currentFontSize + 2));

    const savedReaderTheme = localStorage.getItem('reader-theme') || savedTheme;
    const savedReaderFont = localStorage.getItem('reader-font') || 'serif';
    const savedReaderWidth = localStorage.getItem('reader-width') || 'medium';

    const themeBtn = document.querySelector(`.theme-select[data-theme="${savedReaderTheme}"]`);
    if (themeBtn) themeBtn.click();

    const fontBtn = document.querySelector(`.font-select[data-font="${savedReaderFont}"]`);
    if (fontBtn) fontBtn.click();

    const widthBtn = document.querySelector(`.width-select[data-width="${savedReaderWidth}"]`);
    if (widthBtn) widthBtn.click();

    setFontSize(currentFontSize);
  }
}

// Details tabs
document.querySelectorAll('.tab-header').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-header').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    document.getElementById(`tab-${tabId}`).classList.add('active');
  });
});

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

// --- Fetch and Apply Global Site Design Settings ---
async function loadAndApplyGlobalLayout() {
  try {
    const res = await fetch('/api/settings/globalLayout');
    const data = await res.json();
    if (data && data.value) {
      applyGlobalLayout(data.value);
    } else {
      resetLayoutSettings();
    }
  } catch (err) {
    console.error('Failed to load global layout settings:', err);
    resetLayoutSettings();
  }
}

function applyGlobalLayout(ls) {
  const overlay = document.getElementById('custom-bg-overlay');


  // 2. Tên tab trình duyệt
  document.title = 'MiraiStories';

  // 3. Màu nền trang
  if (ls && ls.bgColor) {
    document.body.style.backgroundColor = ls.bgColor;
  } else {
    document.body.style.backgroundColor = '';
  }

  // 5. Ảnh nền trang + 6. Độ mờ/rõ
  if (overlay) {
    if (ls && ls.bgImageUrl) {
      overlay.style.backgroundImage = `url(${ls.bgImageUrl})`;
      overlay.style.opacity = ls.bgImageOpacity !== undefined ? ls.bgImageOpacity : 1;
      overlay.style.filter = `blur(${ls.bgImageBlur || 0}px)`;
      overlay.style.display = 'block';
    } else {
      overlay.style.backgroundImage = 'none';
      overlay.style.opacity = 0;
      overlay.style.filter = 'none';
      overlay.style.display = 'none';
    }
  }
}

// --- Initialize Reader Portal Layout Customizer Sidebar ---
function initLayoutCustomizer() {
  const toggleBtn = document.getElementById('layout-customizer-toggle');
  const closeBtn = document.getElementById('close-customizer-btn');
  const customizer = document.getElementById('reader-layout-customizer');

  if (!toggleBtn || !customizer) return;

  const isCreator = localStorage.getItem('isCreator') === 'true';
  if (isCreator) {
    toggleBtn.style.display = 'inline-block';
  } else {
    toggleBtn.style.display = 'none';
    return; // Don't bind customizer listeners if not creator
  }

  // Toggle Sidebar
  toggleBtn.onclick = async () => {
    const isHome = !document.getElementById('view-home').classList.contains('hidden');
    const targetName = document.getElementById('customizer-target-name');
    const widthGroup = document.getElementById('portal-design-width-group');

    // Reset sidebar fields
    document.getElementById('portal-design-bgcolor').value = '#000000';
    document.getElementById('portal-design-bgcolor-text').value = '';
    document.getElementById('portal-design-bgimage-url').value = '';
    document.getElementById('portal-design-bgimage-preview-box').style.display = 'none';
    document.getElementById('portal-design-bgimage-preview-img').src = '';
    document.getElementById('clear-portal-design-bgimage-btn').style.display = 'none';
    document.getElementById('portal-design-bgimage-file').value = '';
    document.getElementById('portal-design-bgopacity').value = 1;
    document.getElementById('portal-bgopacity-val').textContent = '100%';
    document.getElementById('portal-design-bgblur').value = 0;
    document.getElementById('portal-bgblur-val').textContent = '0px';

    if (isHome) {
      targetName.textContent = 'Trang chủ (Chung)';
      widthGroup.style.display = 'none';

      // Load current global settings
      try {
        const res = await fetch('/api/settings/globalLayout');
        const data = await res.json();
        if (data && data.value) {
          const ls = data.value;
          if (ls.bgColor) {
            document.getElementById('portal-design-bgcolor').value = ls.bgColor;
            document.getElementById('portal-design-bgcolor-text').value = ls.bgColor;
          }
          if (ls.bgImageUrl) {
            document.getElementById('portal-design-bgimage-url').value = ls.bgImageUrl;
            document.getElementById('portal-design-bgimage-preview-img').src = ls.bgImageUrl;
            document.getElementById('portal-design-bgimage-preview-box').style.display = 'block';
            document.getElementById('clear-portal-design-bgimage-btn').style.display = 'inline-block';
          }
          if (ls.bgImageOpacity !== undefined) {
            document.getElementById('portal-design-bgopacity').value = ls.bgImageOpacity;
            document.getElementById('portal-bgopacity-val').textContent = `${Math.round(ls.bgImageOpacity * 100)}%`;
          }
          if (ls.bgImageBlur !== undefined) {
            document.getElementById('portal-design-bgblur').value = ls.bgImageBlur;
            document.getElementById('portal-bgblur-val').textContent = `${ls.bgImageBlur}px`;
          }
        }
      } catch (err) { }
    } else {
      // We are on a story page or reading a chapter
      widthGroup.style.display = 'block';

      if (state.currentStoryId) {
        try {
          const res = await fetch(`/api/stories/${state.currentStoryId}`);
          const { story } = await res.json();
          targetName.textContent = `Truyện: ${story.title}`;

          if (story.layoutSettings) {
            const ls = story.layoutSettings;
            if (ls.bgColor) {
              document.getElementById('portal-design-bgcolor').value = ls.bgColor;
              document.getElementById('portal-design-bgcolor-text').value = ls.bgColor;
            }
            document.getElementById('portal-design-width').value = ls.marginWidth || 'medium';
            if (ls.bgImageUrl) {
              document.getElementById('portal-design-bgimage-url').value = ls.bgImageUrl;
              document.getElementById('portal-design-bgimage-preview-img').src = ls.bgImageUrl;
              document.getElementById('portal-design-bgimage-preview-box').style.display = 'block';
              document.getElementById('clear-portal-design-bgimage-btn').style.display = 'inline-block';
            }
            if (ls.bgImageOpacity !== undefined) {
              document.getElementById('portal-design-bgopacity').value = ls.bgImageOpacity;
              document.getElementById('portal-bgopacity-val').textContent = `${Math.round(ls.bgImageOpacity * 100)}%`;
            }
            if (ls.bgImageBlur !== undefined) {
              document.getElementById('portal-design-bgblur').value = ls.bgImageBlur;
              document.getElementById('portal-bgblur-val').textContent = `${ls.bgImageBlur}px`;
            }
          }
        } catch (err) { }
      }
    }

    customizer.classList.remove('hidden');
  };

  if (closeBtn) {
    closeBtn.onclick = () => {
      customizer.classList.add('hidden');
    };
  }

  // Color picker bi-directional sync
  const designBgColor = document.getElementById('portal-design-bgcolor');
  const designBgColorText = document.getElementById('portal-design-bgcolor-text');

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

  // Sliders updates
  const designBgOpacity = document.getElementById('portal-design-bgopacity');
  const bgOpacityValText = document.getElementById('portal-bgopacity-val');
  if (designBgOpacity && bgOpacityValText) {
    designBgOpacity.addEventListener('input', (e) => {
      bgOpacityValText.textContent = `${Math.round(e.target.value * 100)}%`;
    });
  }

  const designBgBlur = document.getElementById('portal-design-bgblur');
  const bgBlurValText = document.getElementById('portal-bgblur-val');
  if (designBgBlur && bgBlurValText) {
    designBgBlur.addEventListener('input', (e) => {
      bgBlurValText.textContent = `${e.target.value}px`;
    });
  }

  // Image Upload Logic
  const bgImgUploadBtn = document.getElementById('portal-design-bgimage-upload-btn');
  const bgImgFileInput = document.getElementById('portal-design-bgimage-file');
  const bgImgUrlInput = document.getElementById('portal-design-bgimage-url');
  const bgImgClearBtn = document.getElementById('clear-portal-design-bgimage-btn');
  const bgImgPreviewBox = document.getElementById('portal-design-bgimage-preview-box');
  const bgImgPreviewImg = document.getElementById('portal-design-bgimage-preview-img');

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

  // Save Config Button
  const saveBtn = document.getElementById('save-portal-design-btn');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const isHome = !document.getElementById('view-home').classList.contains('hidden');

      const bgColor = document.getElementById('portal-design-bgcolor-text').value.trim() || document.getElementById('portal-design-bgcolor').value;
      const bgImageUrl = document.getElementById('portal-design-bgimage-url').value.trim();
      const bgImageOpacity = parseFloat(document.getElementById('portal-design-bgopacity').value);
      const bgImageBlur = parseInt(document.getElementById('portal-design-bgblur').value, 10);
      const marginWidth = document.getElementById('portal-design-width').value;

      const layoutSettings = {
        bgColor,
        marginWidth,
        bgImageUrl,
        bgImageOpacity,
        bgImageBlur
      };

      if (isHome) {
        // Save Global Layout to Settings collection
        try {
          const res = await fetch('/api/settings/globalLayout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: layoutSettings })
          });

          if (res.ok) {
            showToast('Đã lưu thiết kế Trang chủ thành công!', 'success');
            customizer.classList.add('hidden');
            applyGlobalLayout(layoutSettings);
          } else {
            showToast('Lỗi lưu cấu hình thiết kế.', 'error');
          }
        } catch (err) {
          showToast('Lỗi kết nối máy chủ.', 'error');
        }
      } else {
        // Save Layout to Current Story
        if (state.currentStoryId) {
          try {
            // Get current story details first to preserve other fields
            const storyRes = await fetch(`/api/stories/${state.currentStoryId}`);
            const { story } = await storyRes.json();

            const payload = {
              title: story.title,
              author: story.author,
              genre: story.genre,
              synopsis: story.synopsis,
              cover: story.cover,
              tags: story.tags,
              status: story.status,
              layoutSettings
            };

            const updateRes = await fetch(`/api/stories/${state.currentStoryId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            if (updateRes.ok) {
              showToast('Đã lưu cấu hình thiết kế truyện thành công!', 'success');
              customizer.classList.add('hidden');

              // Apply layout dynamics immediately
              const chTitleElement = document.getElementById('reader-chapter-title');
              const isReaderMode = !document.getElementById('view-reader-mode').classList.contains('hidden');
              if (isReaderMode && chTitleElement && chTitleElement.textContent !== 'Tên Chương') {
                applyLayoutSettings(layoutSettings, { title: chTitleElement.textContent });
              } else {
                applyLayoutSettings(layoutSettings);
              }
            } else {
              showToast('Lỗi cập nhật thiết kế truyện.', 'error');
            }
          } catch (err) {
            showToast('Lỗi kết nối máy chủ.', 'error');
          }
        }
      }
    };
  }
}
