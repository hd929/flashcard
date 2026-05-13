import './style.css';

// State Management
const state = {
  cards: [],
  currentCardIndex: 0,
  activeView: 'home',
  isLoading: false,
  studyMode: 'flip', // 'flip' or 'type'
  userInput: '',
  feedback: '' // 'correct', 'incorrect', ''
};

// API Functions
const api = {
  async fetchCards() {
    state.isLoading = true;
    render(state.activeView);
    try {
      const res = await fetch('/api/cards');
      if (!res.ok) throw new Error('API not responding. Run with "vercel dev"');
      state.cards = await res.json();
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      state.isLoading = false;
      render(state.activeView);
    }
  },

  async addCard(term, definition, silent = false) {
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, definition, learned: false })
      });
      if (!res.ok) throw new Error('Failed to add card.');
      const newCard = await res.json();
      
      const exists = state.cards.some(c => (c._id || c.id) === (newCard._id || newCard.id));
      if (!exists) {
        state.cards.unshift(newCard);
      }
      
      if (!silent) render('library');
      return newCard;
    } catch (err) {
      console.error('Add error:', err);
      if (!silent) alert('Error: ' + err.message);
    }
  },

  async autoFill(word, silent = false) {
    if (!word) return;
    const btn = document.getElementById('auto-fill-btn');
    if (btn) {
      btn.innerText = '...';
      btn.disabled = true;
    }

    try {
      const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`);
      const transData = await transRes.json();
      const translation = transData.responseData.translatedText;
      
      const defInput = document.getElementById('def-input');
      if (defInput) defInput.value = translation;
      return translation;
    } catch (err) {
      console.error('Auto-fill error:', err);
      return null;
    } finally {
      if (btn) {
        btn.innerText = 'Auto-fill';
        btn.disabled = false;
      }
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

// Helper Functions
const helpers = {
  cleanWord(word) {
    return word.replace(/[^a-zA-Z-]/g, '').trim();
  },
  async isValidEnglishWord(word) {
    if (!word || word.length < 2) return false;
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      return res.ok;
    } catch (e) {
      return false;
    }
  },
  checkAnswer(input, answer) {
    return input.trim().toLowerCase() === answer.trim().toLowerCase();
  }
};

// Selectors
const mainContent = document.getElementById('main-content');
const navBtns = document.querySelectorAll('.nav-btn');

// View Templates
const templates = {
  home: () => `
    <div class="view">
      <h1 style="margin-bottom: 2rem; text-align: center;">Welcome back, Learner!</h1>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${state.cards.length}</div>
          <div class="stat-label">Total Cards</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${state.cards.filter(c => c.learned).length}</div>
          <div class="stat-label">Mastered</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Math.round((state.cards.filter(c => c.learned).length / (state.cards.length || 1)) * 100)}%</div>
          <div class="stat-label">Progress</div>
        </div>
      </div>
      <div style="text-align: center;">
        <button id="start-study" class="btn-primary" style="font-size: 1.25rem;">Start Studying Now</button>
      </div>
    </div>
  `,
  study: () => {
    if (state.isLoading) return `<div class="view" style="text-align: center;"><h3>Loading data...</h3></div>`;
    if (state.cards.length === 0) return `<div class="view" style="text-align: center;"><h3>No cards to study! Add some in the Library.</h3></div>`;
    
    const card = state.cards[state.currentCardIndex];
    const progress = ((state.currentCardIndex + 1) / state.cards.length) * 100;

    return `
      <div class="view study-container">
        <div style="width: 100%; max-width: 500px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div class="progress-container" style="flex: 1; margin-right: 1rem;">
            <div class="progress-bar" style="width: ${progress}%"></div>
          </div>
          <select id="mode-selector" class="form-input" style="width: auto; padding: 0.25rem 0.5rem;">
            <option value="flip" ${state.studyMode === 'flip' ? 'selected' : ''}>Flip Mode</option>
            <option value="type" ${state.studyMode === 'type' ? 'selected' : ''}>Type Mode</option>
          </select>
        </div>
        
        <p style="color: var(--text-secondary)">Card ${state.currentCardIndex + 1} / ${state.cards.length}</p>
        
        ${state.studyMode === 'flip' ? `
          <div class="card-scene" id="flashcard">
            <div class="card">
              <div class="card-face front">
                <div class="card-term">${card.term}</div>
                <div class="card-hint">Click to flip</div>
              </div>
              <div class="card-face back">
                <div class="card-definition">${card.definition}</div>
                <div class="card-hint">Click to flip back</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="stat-card" style="width: 100%; max-width: 500px; min-height: 350px; display: flex; flex-direction: column; justify-content: center; gap: 2rem;">
            <div class="card-definition" style="font-size: 2rem;">${card.definition}</div>
            
            <div style="position: relative;">
              <input type="text" id="answer-input" class="form-input" 
                     placeholder="Type English word..." 
                     style="font-size: 1.5rem; text-align: center; ${state.feedback === 'correct' ? 'border-color: var(--success);' : state.feedback === 'incorrect' ? 'border-color: var(--danger);' : ''}" 
                     value="${state.userInput}"
                     ${state.feedback !== '' ? 'disabled' : ''}
                     autocomplete="off">
              ${state.feedback === 'incorrect' ? `<div style="color: var(--danger); margin-top: 1rem;">Correct answer: <strong>${card.term}</strong></div>` : ''}
              ${state.feedback === 'correct' ? `<div style="color: var(--success); margin-top: 1rem;">Correct! Well done.</div>` : ''}
            </div>
          </div>
        `}

        <div class="controls">
          <button id="prev-card" class="btn-outline" ${state.currentCardIndex === 0 ? 'disabled' : ''}>Previous</button>
          <button id="mark-learned" class="btn-outline" style="border-color: var(--success); color: var(--success)">
            ${card.learned ? 'Mastered' : 'Not Mastered'}
          </button>
          <button id="next-card" class="btn-primary">
            ${state.currentCardIndex === state.cards.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    `;
  },
  library: () => `
    <div class="view">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h2>Your Library</h2>
        <div style="display: flex; gap: 0.5rem;">
          <button id="show-bulk-add" class="btn-outline">Bulk Import</button>
          <button id="show-add-modal" class="btn-primary">+ Add New Card</button>
        </div>
      </div>
      
      <div class="card-grid">
        ${state.isLoading ? '<p>Loading...</p>' : state.cards.map(card => `
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
      <h2 style="margin-bottom: 1.5rem; text-align: center;">Add New Flashcard</h2>
      <form class="add-card-form" id="new-card-form">
        <div class="form-group">
          <label>Vocabulary (English)</label>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" id="term-input" class="form-input" placeholder="e.g. Serendipity" required>
            <button type="button" id="auto-fill-btn" class="btn-outline" style="padding: 0 1rem; white-space: nowrap;">Auto-fill</button>
          </div>
        </div>
        <div class="form-group">
          <label>Meaning (Vietnamese)</label>
          <textarea id="def-input" class="form-input" rows="3" placeholder="Meaning will appear here..." required></textarea>
        </div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button type="button" id="cancel-add" class="btn-outline">Cancel</button>
          <button type="submit" class="btn-primary">Save Card</button>
        </div>
      </form>
    </div>
  `,
  bulkAdd: () => `
    <div class="view">
      <h2 style="margin-bottom: 1.5rem; text-align: center;">Bulk Import & Auto-translate</h2>
      <p style="color: var(--text-secondary); margin-bottom: 1rem; text-align: center;">
        Only valid English words will be imported. Duplicates will be skipped.
      </p>
      <div class="add-card-form">
        <textarea id="bulk-input" class="form-input" rows="10" placeholder="e.g. 
apple
banana
orange"></textarea>
        <div id="bulk-status" style="margin-top: 1rem; font-size: 0.9rem; color: var(--primary);"></div>
        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
          <button type="button" id="cancel-add-bulk" class="btn-outline">Cancel</button>
          <button id="process-bulk" class="btn-primary">Start Importing</button>
        </div>
      </div>
    </div>
  `
};

// Render Logic
const render = (viewName) => {
  state.activeView = viewName;
  mainContent.innerHTML = templates[viewName]();
  
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.id === `nav-${['addForm', 'bulkAdd'].includes(viewName) ? 'library' : viewName}`);
  });

  attachEventListeners();
};

const attachEventListeners = () => {
  const startBtn = document.getElementById('start-study');
  if (startBtn) startBtn.addEventListener('click', () => {
    state.currentCardIndex = 0;
    state.feedback = '';
    state.userInput = '';
    render('study');
  });

  const modeSelector = document.getElementById('mode-selector');
  if (modeSelector) {
    modeSelector.addEventListener('change', (e) => {
      state.studyMode = e.target.value;
      state.feedback = '';
      state.userInput = '';
      render('study');
    });
  }

  const flashcard = document.getElementById('flashcard');
  if (flashcard) {
    flashcard.addEventListener('click', () => {
      flashcard.querySelector('.card').classList.toggle('is-flipped');
    });
  }

  const answerInput = document.getElementById('answer-input');
  if (answerInput) {
    answerInput.focus();
    answerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const card = state.cards[state.currentCardIndex];
        const isCorrect = helpers.checkAnswer(answerInput.value, card.term);
        state.userInput = answerInput.value;
        state.feedback = isCorrect ? 'correct' : 'incorrect';
        render('study');
        
        // Auto next on correct after delay
        if (isCorrect) {
          setTimeout(() => {
            if (state.activeView === 'study' && state.feedback === 'correct') {
              document.getElementById('next-card')?.click();
            }
          }, 1500);
        }
      }
    });
  }

  const nextBtn = document.getElementById('next-card');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      state.feedback = '';
      state.userInput = '';
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
      state.feedback = '';
      state.userInput = '';
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

  const showBulkBtn = document.getElementById('show-bulk-add');
  if (showBulkBtn) showBulkBtn.addEventListener('click', () => render('bulkAdd'));

  // Auto-fill on Blur
  const termInput = document.getElementById('term-input');
  if (termInput) {
    termInput.addEventListener('blur', async () => {
      const rawWord = termInput.value;
      const cleaned = helpers.cleanWord(rawWord);
      termInput.value = cleaned; 

      if (cleaned && await helpers.isValidEnglishWord(cleaned)) {
        const defInput = document.getElementById('def-input');
        if (!defInput.value || defInput.value === 'Meaning will appear here...') {
          api.autoFill(cleaned, true);
        }
      }
    });
  }

  const autoFillBtn = document.getElementById('auto-fill-btn');
  if (autoFillBtn) {
    autoFillBtn.addEventListener('click', async () => {
      const cleaned = helpers.cleanWord(document.getElementById('term-input').value);
      document.getElementById('term-input').value = cleaned;
      api.autoFill(cleaned);
    });
  }

  const form = document.getElementById('new-card-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      api.addCard(document.getElementById('term-input').value, document.getElementById('def-input').value);
    });
    document.getElementById('cancel-add').addEventListener('click', () => render('library'));
  }

  // Bulk Process
  const processBulkBtn = document.getElementById('process-bulk');
  if (processBulkBtn) {
    processBulkBtn.addEventListener('click', async () => {
      const input = document.getElementById('bulk-input').value;
      const rawWords = input.split(/[\n,]+/).map(w => w.trim()).filter(w => w);
      
      if (rawWords.length === 0) return alert('Please enter some words.');
      
      processBulkBtn.disabled = true;
      const status = document.getElementById('bulk-status');
      let successCount = 0;
      
      for (let i = 0; i < rawWords.length; i++) {
        const cleaned = helpers.cleanWord(rawWords[i]);
        if (!cleaned) continue;

        status.innerText = `Validating (${i + 1}/${rawWords.length}): ${cleaned}...`;
        
        if (await helpers.isValidEnglishWord(cleaned)) {
          const translation = await api.autoFill(cleaned, true);
          if (translation) {
            await api.addCard(cleaned, translation, true);
            successCount++;
          }
        }
        await new Promise(r => setTimeout(r, 400));
      }
      
      alert(`Imported ${successCount} words!`);
      render('library');
    });
    document.getElementById('cancel-add-bulk').addEventListener('click', () => render('library'));
  }
};

window.deleteCardHandler = (id) => {
  if (confirm('Are you sure?')) {
    api.deleteCard(id);
  }
};

// Nav Click Handlers
document.getElementById('nav-home').addEventListener('click', () => render('home'));
document.getElementById('nav-study').addEventListener('click', () => render('home'));
document.getElementById('nav-library').addEventListener('click', () => render('library'));

// Initial Load
api.fetchCards();
render('home');
