(function () {
  'use strict';

  const STORAGE_KEY = 'meishi-cards';

  // ── データ層 ────────────────────────────────────────

  function loadCards() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  }

  function saveCards(cards) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  function seedIfEmpty() {
    if (localStorage.getItem(STORAGE_KEY) !== null) return;
    const now = Date.now();
    const seeds = [
      {
        id: String(now - 2000),
        name: '高橋 健一',
        company: 'グローバルテック株式会社',
        title: 'シニアエンジニア',
        email: 'takahashi@globaltech.example',
        phone: '03-1234-5678',
        memo: '技術カンファレンスで名刺交換。クラウド基盤に詳しい。',
        createdAt: new Date(now - 2000).toISOString(),
      },
      {
        id: String(now - 1000),
        name: '鈴木 莉奈',
        company: 'ネクストウェーブ合同会社',
        title: 'マーケティング部長',
        email: 'suzuki@nextwave.example',
        phone: '06-9876-5432',
        memo: '展示会でお会いした。SNSマーケに強み。',
        createdAt: new Date(now - 1000).toISOString(),
      },
      {
        id: String(now),
        name: '佐藤 翔太',
        company: '株式会社フューチャーブリッジ',
        title: '代表取締役',
        email: 'sato@futurebridge.example',
        phone: '090-0000-1111',
        memo: '紹介経由。新規事業の相談あり。来月フォローアップ予定。',
        createdAt: new Date(now).toISOString(),
      },
    ];
    saveCards(seeds);
  }

  // ── 状態 ────────────────────────────────────────────

  let selectedId = null;

  // ── UI 要素 ─────────────────────────────────────────

  const elCardList   = document.getElementById('card-list');
  const elSearchInput = document.getElementById('search-input');
  const elBtnNew     = document.getElementById('btn-new');
  const elBtnEdit    = document.getElementById('btn-edit');
  const elBtnDelete  = document.getElementById('btn-delete');
  const elBtnSave    = document.getElementById('btn-save');
  const elBtnCancel  = document.getElementById('btn-cancel');
  const elCardForm   = document.getElementById('card-form');

  // ── ペイン切替 ──────────────────────────────────────

  function showPane(paneName) {
    ['pane-empty', 'pane-detail', 'pane-form'].forEach((id) => {
      const el = document.getElementById(id);
      el.classList.toggle('hidden', id !== paneName);
    });
  }

  // ── リスト描画 ──────────────────────────────────────

  function renderList(query) {
    const cards = loadCards();
    const q = (query || '').trim().toLowerCase();

    const filtered = cards
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          (c.title || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    elCardList.innerHTML = '';

    if (filtered.length === 0) {
      elCardList.innerHTML = '<li class="text-center text-gray-400 text-sm py-8">該当する名刺がありません</li>';
      return;
    }

    filtered.forEach((card) => {
      const li = document.createElement('li');
      li.className = 'card-item' + (card.id === selectedId ? ' selected' : '');
      li.dataset.id = card.id;
      li.innerHTML = `
        <div class="card-name">${escHtml(card.name)}</div>
        <div class="card-company">${escHtml(card.company)}</div>
        ${card.title ? `<div class="card-title">${escHtml(card.title)}</div>` : ''}
      `;
      li.addEventListener('click', () => selectCard(card.id));
      elCardList.appendChild(li);
    });
  }

  // ── 詳細表示 ────────────────────────────────────────

  function selectCard(id) {
    selectedId = id;
    renderList(elSearchInput.value);
    const card = loadCards().find((c) => c.id === id);
    if (!card) return;
    renderDetail(card);
    showPane('pane-detail');
  }

  function renderDetail(card) {
    document.getElementById('detail-name').textContent    = card.name;
    document.getElementById('detail-company').textContent = card.company;
    document.getElementById('detail-title').textContent   = card.title || '';

    setDetailRow('detail-row-email', 'detail-email', card.email, (el) => {
      el.href = card.email ? `mailto:${card.email}` : '#';
    });
    setDetailRow('detail-row-phone', 'detail-phone', card.phone);
    setDetailRow('detail-row-memo',  'detail-memo',  card.memo);

    const d = new Date(card.createdAt);
    document.getElementById('detail-created').textContent =
      `登録日時: ${d.toLocaleString('ja-JP')}`;
  }

  function setDetailRow(rowId, valueId, value, extra) {
    const row = document.getElementById(rowId);
    const el  = document.getElementById(valueId);
    if (value) {
      row.classList.remove('hidden');
      el.textContent = value;
      if (extra) extra(el);
    } else {
      row.classList.add('hidden');
    }
  }

  // ── フォーム ────────────────────────────────────────

  function openFormNew() {
    selectedId = null;
    renderList(elSearchInput.value);
    document.getElementById('form-title').textContent = '新規登録';
    elCardForm.reset();
    document.getElementById('field-id').value = '';
    showPane('pane-form');
  }

  function openFormEdit(id) {
    const card = loadCards().find((c) => c.id === id);
    if (!card) return;
    document.getElementById('form-title').textContent = '編集';
    document.getElementById('field-id').value      = card.id;
    document.getElementById('field-name').value    = card.name;
    document.getElementById('field-company').value = card.company;
    document.getElementById('field-title').value   = card.title || '';
    document.getElementById('field-email').value   = card.email || '';
    document.getElementById('field-phone').value   = card.phone || '';
    document.getElementById('field-memo').value    = card.memo  || '';
    showPane('pane-form');
  }

  function handleSave(e) {
    e.preventDefault();

    const name    = document.getElementById('field-name').value.trim();
    const company = document.getElementById('field-company').value.trim();
    if (!name || !company) {
      alert('氏名と会社名は必須です。');
      return;
    }

    const editId = document.getElementById('field-id').value;
    const cards  = loadCards();

    if (editId) {
      const idx = cards.findIndex((c) => c.id === editId);
      if (idx !== -1) {
        cards[idx] = buildCard(editId, cards[idx].createdAt);
      }
    } else {
      const newCard = buildCard(String(Date.now()), new Date().toISOString());
      cards.unshift(newCard);
      selectedId = newCard.id;
    }

    saveCards(cards);
    renderList(elSearchInput.value);
    selectCard(selectedId || editId);
  }

  function buildCard(id, createdAt) {
    return {
      id,
      name:      document.getElementById('field-name').value.trim(),
      company:   document.getElementById('field-company').value.trim(),
      title:     document.getElementById('field-title').value.trim(),
      email:     document.getElementById('field-email').value.trim(),
      phone:     document.getElementById('field-phone').value.trim(),
      memo:      document.getElementById('field-memo').value.trim(),
      createdAt,
    };
  }

  // ── 削除 ────────────────────────────────────────────

  function handleDelete() {
    if (!selectedId) return;
    const card = loadCards().find((c) => c.id === selectedId);
    if (!card) return;
    if (!confirm(`「${card.name}」の名刺を削除しますか？`)) return;

    const cards = loadCards().filter((c) => c.id !== selectedId);
    saveCards(cards);
    selectedId = null;
    renderList(elSearchInput.value);
    showPane('pane-empty');
  }

  // ── ユーティリティ ──────────────────────────────────

  function escHtml(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ── イベント登録 ────────────────────────────────────

  elBtnNew.addEventListener('click', openFormNew);
  elBtnEdit.addEventListener('click', () => openFormEdit(selectedId));
  elBtnDelete.addEventListener('click', handleDelete);
  elCardForm.addEventListener('submit', handleSave);
  elBtnCancel.addEventListener('click', () => {
    if (selectedId) {
      selectCard(selectedId);
    } else {
      showPane('pane-empty');
    }
  });
  elSearchInput.addEventListener('input', () => renderList(elSearchInput.value));

  // ── 起動 ────────────────────────────────────────────

  seedIfEmpty();
  renderList();
  showPane('pane-empty');

})();
