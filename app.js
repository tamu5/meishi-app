import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const TABLE = 'meishi_cards';

(function () {
  'use strict';

  // ── 状態 ────────────────────────────────────────────

  let selectedId = null;

  // ── UI 要素 ─────────────────────────────────────────

  const elCardList    = document.getElementById('card-list');
  const elSearchInput = document.getElementById('search-input');
  const elBtnNew      = document.getElementById('btn-new');
  const elBtnEdit     = document.getElementById('btn-edit');
  const elBtnDelete   = document.getElementById('btn-delete');
  const elCardForm    = document.getElementById('card-form');

  // ── ペイン切替 ──────────────────────────────────────

  function showPane(paneName) {
    ['pane-empty', 'pane-detail', 'pane-form'].forEach((id) => {
      document.getElementById(id).classList.toggle('hidden', id !== paneName);
    });
  }

  // ── データ層（Supabase） ────────────────────────────

  async function fetchCards(query) {
    const q = (query || '').trim();
    let req = supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (q) {
      req = req.or(
        `name.ilike.%${q}%,company.ilike.%${q}%,title.ilike.%${q}%`,
      );
    }

    const { data, error } = await req;
    if (error) { console.error(error); return []; }
    return data;
  }

  async function fetchCard(id) {
    const { data, error } = await supabase
      .from(TABLE).select('*').eq('id', id).single();
    if (error) { console.error(error); return null; }
    return data;
  }

  async function insertCard(fields) {
    const { data, error } = await supabase
      .from(TABLE).insert(fields).select().single();
    if (error) throw error;
    return data;
  }

  async function updateCard(id, fields) {
    const { error } = await supabase
      .from(TABLE).update(fields).eq('id', id);
    if (error) throw error;
  }

  async function deleteCard(id) {
    const { error } = await supabase
      .from(TABLE).delete().eq('id', id);
    if (error) throw error;
  }

  // ── リスト描画 ──────────────────────────────────────

  async function renderList(query) {
    const cards = await fetchCards(query);
    elCardList.innerHTML = '';

    if (cards.length === 0) {
      elCardList.innerHTML =
        '<li class="text-center text-gray-400 text-sm py-8">該当する名刺がありません</li>';
      return;
    }

    cards.forEach((card) => {
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

  async function selectCard(id) {
    selectedId = id;
    await renderList(elSearchInput.value);
    const card = await fetchCard(id);
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

    const d = new Date(card.created_at);
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

  async function openFormNew() {
    selectedId = null;
    await renderList(elSearchInput.value);
    document.getElementById('form-title').textContent = '新規登録';
    elCardForm.reset();
    document.getElementById('field-id').value = '';
    showPane('pane-form');
  }

  async function openFormEdit(id) {
    const card = await fetchCard(id);
    if (!card) return;
    document.getElementById('form-title').textContent   = '編集';
    document.getElementById('field-id').value           = card.id;
    document.getElementById('field-name').value         = card.name;
    document.getElementById('field-company').value      = card.company;
    document.getElementById('field-title').value        = card.title || '';
    document.getElementById('field-email').value        = card.email || '';
    document.getElementById('field-phone').value        = card.phone || '';
    document.getElementById('field-memo').value         = card.memo  || '';
    showPane('pane-form');
  }

  async function handleSave(e) {
    e.preventDefault();

    const name    = document.getElementById('field-name').value.trim();
    const company = document.getElementById('field-company').value.trim();
    if (!name || !company) {
      alert('氏名と会社名は必須です。');
      return;
    }

    const editId = document.getElementById('field-id').value;
    const fields = {
      name,
      company,
      title: document.getElementById('field-title').value.trim() || null,
      email: document.getElementById('field-email').value.trim() || null,
      phone: document.getElementById('field-phone').value.trim() || null,
      memo:  document.getElementById('field-memo').value.trim()  || null,
    };

    try {
      if (editId) {
        await updateCard(editId, fields);
        await selectCard(editId);
      } else {
        const created = await insertCard(fields);
        selectedId = created.id;
        await selectCard(created.id);
      }
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。');
    }
  }

  // ── 削除 ────────────────────────────────────────────

  async function handleDelete() {
    if (!selectedId) return;
    const card = await fetchCard(selectedId);
    if (!card) return;
    if (!confirm(`「${card.name}」の名刺を削除しますか？`)) return;

    try {
      await deleteCard(selectedId);
      selectedId = null;
      await renderList(elSearchInput.value);
      showPane('pane-empty');
    } catch (err) {
      console.error(err);
      alert('削除に失敗しました。');
    }
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
  document.getElementById('btn-cancel').addEventListener('click', () => {
    if (selectedId) {
      selectCard(selectedId);
    } else {
      showPane('pane-empty');
    }
  });
  elSearchInput.addEventListener('input', () => renderList(elSearchInput.value));

  // ── 起動 ────────────────────────────────────────────

  renderList();
  showPane('pane-empty');

})();
