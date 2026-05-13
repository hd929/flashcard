import './style.css';

// State Management
const state = {
  cards: [],
  currentCardIndex: 0,
  activeView: 'home',
  isLoading: false
};

// API Functions
const api = {
  async fetchCards() {
    state.isLoading = true;
    render(state.activeView);
    try {
      const res = await fetch('/api/cards');
      state.cards = await res.json();
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      state.isLoading = false;
      render(state.activeView);
    }
  },

  async addCard(term, definition) {
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, definition, learned: false })
      });
      const newCard = await res.json();
      state.cards.push(newCard);
      render('library');
    } catch (err) {
      console.error('Add error:', err);
    }
  },

  async toggleLearned(card) {
    try {
      const newStatus = !card.learned;
      await fetch(`/api/cards?id=${card._id || card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learned: newStatus })
      });
      card.learned = newStatus;
      render('study');
    } catch (err) {
      console.error('Update error:', err);
    }
  },

  async deleteCard(id) {
    try {
      await fetch(`/api/cards?id=${id}`, { method: 'DELETE' });
      state.cards = state.cards.filter(c => (c._id || c.id) !== id);
      render('library');
    } catch (err) {
      console.error('Delete error:', err);
    }
  }
};

// Selectors
const mainContent = document.getElementById('main-content');
const navBtns = document.querySelectorAll('.nav-btn');

// View Templates
const templates = {
  home: () => `
    <div class="view">
      <h1 style="margin-bottom: 2rem; text-align: center;">Chào mừng bạn trở lại!</h1>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${state.cards.length}</div>
          <div class="stat-label">Tổng số thẻ</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${state.cards.filter(c => c.learned).length}</div>
          <div class="stat-label">Đã thuộc</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Math.round((state.cards.filter(c => c.learned).length / (state.cards.length || 1)) * 100)}%</div>
          <div class="stat-label">Tiến độ</div>
        </div>
      </div>
      <div style="text-align: center;">
        <button id="start-study" class="btn-primary" style="font-size: 1.25rem;">Bắt đầu học ngay</button>
      </div>
    </div>
  `,
  study: () => {
    if (state.isLoading) return `<div class="view" style="text-align: center;"><h3>Đang tải dữ liệu...</h3></div>`;
    if (state.cards.length === 0) return `<div class="view" style="text-align: center;"><h3>Không có thẻ nào để học! Hãy thêm thẻ mới trong Thư viện.</h3></div>`;
    
    const card = state.cards[state.currentCardIndex];
    const progress = ((state.currentCardIndex + 1) / state.cards.length) * 100;

    return `
      <div class="view study-container">
        <div class="progress-container">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        <p style="color: var(--text-secondary)">Thẻ ${state.currentCardIndex + 1} / ${state.cards.length}</p>
        
        <div class="card-scene" id="flashcard">
          <div class="card">
            <div class="card-face front">
              <div class="card-term">${card.term}</div>
              <div class="card-hint">Nhấn để lật thẻ</div>
            </div>
            <div class="card-face back">
              <div class="card-definition">${card.definition}</div>
              <div class="card-hint">Nhấn để lật lại</div>
            </div>
          </div>
        </div>

        <div class="controls">
          <button id="prev-card" class="btn-outline" ${state.currentCardIndex === 0 ? 'disabled' : ''}>Trước đó</button>
          <button id="mark-learned" class="btn-outline" style="border-color: var(--success); color: var(--success)">
            ${card.learned ? 'Đã thuộc' : 'Chưa thuộc'}
          </button>
          <button id="next-card" class="btn-primary">
            ${state.currentCardIndex === state.cards.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
          </button>
        </div>
      </div>
    `;
  },
  library: () => `
    <div class="view">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2>Thư viện của bạn</h2>
        <button id="show-add-modal" class="btn-primary">+ Thêm thẻ mới</button>
      </div>
      
      <div class="card-grid">
        ${state.isLoading ? '<p>Đang tải...</p>' : state.cards.map(card => `
          <div class="library-card">
            <div class="library-card-info">
              <h3>${card.term}</h3>
              <p>${card.definition}</p>
            </div>
            <button class="delete-btn" onclick="deleteCardHandler('${card._id || card.id}')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `,
  addForm: () => `
    <div class="view">
      <h2 style="margin-bottom: 1.5rem; text-align: center;">Thêm thẻ Flashcard mới</h2>
      <form class="add-card-form" id="new-card-form">
        <div class="form-group">
          <label>Từ vựng (Tiếng Anh)</label>
          <input type="text" id="term-input" class="form-input" placeholder="Ví dụ: Serendipity" required>
        </div>
        <div class="form-group">
          <label>Nghĩa (Tiếng Việt)</label>
          <textarea id="def-input" class="form-input" rows="3" placeholder="Ví dụ: Sự tình cờ may mắn" required></textarea>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button type="button" id="cancel-add" class="btn-outline">Hủy</button>
          <button type="submit" class="btn-primary">Lưu thẻ</button>
        </div>
      </form>
    </div>
  `
};

// Render Logic
const render = (viewName) => {
  state.activeView = viewName;
  mainContent.innerHTML = templates[viewName]();
  
  // Update Nav
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.id === `nav-${viewName === 'addForm' ? 'library' : viewName}`);
  });

  attachEventListeners();
};

const attachEventListeners = () => {
  const startBtn = document.getElementById('start-study');
  if (startBtn) startBtn.addEventListener('click', () => render('study'));

  const flashcard = document.getElementById('flashcard');
  if (flashcard) {
    flashcard.addEventListener('click', () => {
      flashcard.querySelector('.card').classList.toggle('is-flipped');
    });
  }

  const nextBtn = document.getElementById('next-card');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.currentCardIndex < state.cards.length - 1) {
        state.currentCardIndex++;
        render('study');
      } else {
        state.currentCardIndex = 0;
        render('home');
      }
    });
  }

  const prevBtn = document.getElementById('prev-card');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.currentCardIndex > 0) {
        state.currentCardIndex--;
        render('study');
      }
    });
  }

  const markBtn = document.getElementById('mark-learned');
  if (markBtn) {
    markBtn.addEventListener('click', () => {
      api.toggleLearned(state.cards[state.currentCardIndex]);
    });
  }

  const showAddBtn = document.getElementById('show-add-modal');
  if (showAddBtn) showAddBtn.addEventListener('click', () => render('addForm'));

  const form = document.getElementById('new-card-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const term = document.getElementById('term-input').value;
      const definition = document.getElementById('def-input').value;
      api.addCard(term, definition);
    });

    document.getElementById('cancel-add').addEventListener('click', () => render('library'));
  }
};

window.deleteCardHandler = (id) => {
  if (confirm('Bạn có chắc muốn xóa thẻ này?')) {
    api.deleteCard(id);
  }
};

// Nav Click Handlers
document.getElementById('nav-home').addEventListener('click', () => render('home'));
document.getElementById('nav-study').addEventListener('click', () => render('study'));
document.getElementById('nav-library').addEventListener('click', () => render('library'));

// Initial Load
api.fetchCards();
render('home');
