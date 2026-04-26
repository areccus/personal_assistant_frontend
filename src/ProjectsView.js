import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8081';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog',     dot: '#4a4457' },
  { id: 'doing',   label: 'In Progress', dot: '#a6e6ff' },
  { id: 'done',    label: 'Done',        dot: '#d1bcff' },
];

const PRIORITIES = [
  { id: 'none',   label: 'No Priority', color: '#958da3', bg: 'rgba(149,141,163,0.12)', border: 'rgba(149,141,163,0.25)' },
  { id: 'low',    label: 'Low',         color: '#a6e6ff', bg: 'rgba(166,230,255,0.12)', border: 'rgba(166,230,255,0.25)' },
  { id: 'medium', label: 'Medium',      color: '#ebb2ff', bg: 'rgba(235,178,255,0.12)', border: 'rgba(235,178,255,0.25)' },
  { id: 'high',   label: 'High Priority', color: '#ffb4ab', bg: 'rgba(255,180,171,0.12)', border: 'rgba(255,180,171,0.25)' },
];

const getPriority = (id) => PRIORITIES.find(p => p.id === id) || PRIORITIES[0];

export default function ProjectsView({ onBack }) {
  const [cards, setCards]       = useState([]);
  const [detail, setDetail]     = useState(null); // card being viewed in modal
  const [addingIn, setAddingIn] = useState(null); // column id where inline add is open

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await axios.get(`${API}/projects/cards`);
    setCards(res.data);
  };

  const refresh = (updated) =>
    setCards(prev => prev.map(c => c.id === updated.id ? updated : c));

  // ── Cards ──────────────────────────────────────────────────────────────────

  const createCard = async (title, status) => {
    if (!title.trim()) return;
    const res = await axios.post(`${API}/projects/cards`, { title: title.trim(), status });
    setCards(prev => [...prev, res.data]);
    setAddingIn(null);
  };

  const patchCard = async (id, fields) => {
    const res = await axios.patch(`${API}/projects/cards/${id}`, fields);
    refresh(res.data);
    if (detail?.id === id) setDetail(res.data);
  };

  const deleteCard = async (id) => {
    await axios.delete(`${API}/projects/cards/${id}`);
    setCards(prev => prev.filter(c => c.id !== id));
    if (detail?.id === id) setDetail(null);
  };

  // ── Subtasks ───────────────────────────────────────────────────────────────

  const addSub = async (cardId, title) => {
    if (!title.trim()) return;
    const res = await axios.post(`${API}/projects/cards/${cardId}/subtasks`, { title });
    const updated = { ...cards.find(c => c.id === cardId), subtasks: [...cards.find(c => c.id === cardId).subtasks, res.data] };
    refresh(updated);
    if (detail?.id === cardId) setDetail(updated);
  };

  const toggleSub = async (cardId, sub) => {
    const res = await axios.patch(`${API}/projects/subtasks/${sub.id}`, { completed: !sub.completed });
    const card = cards.find(c => c.id === cardId);
    const updated = { ...card, subtasks: card.subtasks.map(s => s.id === sub.id ? res.data : s) };
    refresh(updated);
    if (detail?.id === cardId) setDetail(updated);
  };

  const deleteSub = async (cardId, subId) => {
    await axios.delete(`${API}/projects/subtasks/${subId}`);
    const card = cards.find(c => c.id === cardId);
    const updated = { ...card, subtasks: card.subtasks.filter(s => s.id !== subId) };
    refresh(updated);
    if (detail?.id === cardId) setDetail(updated);
  };

  return (
    <div className="board-wrap">
      {/* Ambient glows */}
      <div className="board-glow board-glow--violet" />
      <div className="board-glow board-glow--blue" />

      {/* Header */}
      <div className="board-header">
        <div className="board-header-left">
          <button className="board-back" onClick={onBack}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="board-title">Projects</h1>
            <p className="board-sub">Manage your streams, tasks, and sub-routines</p>
          </div>
        </div>
        <button className="board-new-btn" onClick={() => setAddingIn('backlog')}>
          <span className="material-symbols-outlined">add</span>
          New Card
        </button>
      </div>

      {/* Columns */}
      <div className="board-columns">
        {COLUMNS.map(col => {
          const colCards = cards.filter(c => c.status === col.id);
          return (
            <div key={col.id} className="board-col">
              <div className="board-col-header">
                <div className="board-col-label">
                  <span className="board-col-dot" style={{ background: col.dot }} />
                  <span className="board-col-name">{col.label}</span>
                </div>
                <span className="board-col-count">{colCards.length}</span>
              </div>

              <div className="board-col-cards">
                {colCards.map(card => (
                  <BoardCard
                    key={card.id}
                    card={card}
                    onClick={() => setDetail(card)}
                    onAddSub={(title) => addSub(card.id, title)}
                  />
                ))}

                {addingIn === col.id ? (
                  <InlineAdd
                    onConfirm={(t) => createCard(t, col.id)}
                    onCancel={() => setAddingIn(null)}
                  />
                ) : (
                  <button className="board-add-card-btn" onClick={() => setAddingIn(col.id)}>
                    <span className="material-symbols-outlined">add</span>
                    Add card
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {detail && (
        <DetailModal
          card={detail}
          onClose={() => setDetail(null)}
          onPatch={(fields) => patchCard(detail.id, fields)}
          onDelete={() => deleteCard(detail.id)}
          onAddSub={(title) => addSub(detail.id, title)}
          onToggleSub={(sub) => toggleSub(detail.id, sub)}
          onDeleteSub={(subId) => deleteSub(detail.id, subId)}
        />
      )}
    </div>
  );
}

// ── Board Card ─────────────────────────────────────────────────────────────────

function BoardCard({ card, onClick, onAddSub }) {
  const [addingHere, setAddingHere] = useState(false);
  const [newSub, setNewSub]         = useState('');
  const subDone  = card.subtasks.filter(s => s.completed).length;
  const subTotal = card.subtasks.length;
  const pct      = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : 0;
  const pri      = getPriority(card.priority);

  const submitSub = () => {
    onAddSub(newSub);
    setNewSub('');
    setAddingHere(false);
  };

  return (
    <div className="bcard" onClick={onClick}>
      {/* Priority chip */}
      {card.priority !== 'none' && (
        <div className="bcard-tags">
          <span className="bcard-chip" style={{ color: pri.color, background: pri.bg, borderColor: pri.border }}>
            {pri.label}
          </span>
        </div>
      )}

      {/* Title */}
      <h3 className="bcard-title">{card.title}</h3>

      {/* Notes preview */}
      {card.notes && <p className="bcard-desc">{card.notes}</p>}

      {/* Progress */}
      {subTotal > 0 && (
        <div className="bcard-progress" onClick={e => e.stopPropagation()}>
          <div className="bcard-progress-row">
            <span className="bcard-progress-label">
              <span className="material-symbols-outlined">checklist</span>
              {subDone} of {subTotal} subtasks
            </span>
            <span className="bcard-progress-pct">{pct}%</span>
          </div>
          <div className="bcard-progress-track">
            <div className="bcard-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Quick add subtask */}
      <div className="bcard-add-sub" onClick={e => { e.stopPropagation(); setAddingHere(true); }}>
        {addingHere ? (
          <input
            autoFocus
            className="bcard-add-sub-input"
            placeholder="Subtask title…"
            value={newSub}
            onChange={e => setNewSub(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submitSub();
              if (e.key === 'Escape') { setAddingHere(false); setNewSub(''); }
            }}
            onBlur={() => { if (newSub.trim()) submitSub(); else setAddingHere(false); }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="material-symbols-outlined">add_circle</span>
            <span>Add subtask or note…</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Inline add card ────────────────────────────────────────────────────────────

function InlineAdd({ onConfirm, onCancel }) {
  const [val, setVal] = useState('');
  const ref = useRef(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div className="board-inline-add">
      <textarea
        ref={ref}
        className="board-inline-input"
        placeholder="Card title…"
        value={val}
        rows={2}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onConfirm(val); }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <div className="board-inline-actions">
        <button className="board-inline-confirm" onClick={() => onConfirm(val)}>Add Card</button>
        <button className="board-inline-cancel" onClick={onCancel}>
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────────────────

function DetailModal({ card, onClose, onPatch, onDelete, onAddSub, onToggleSub, onDeleteSub }) {
  const [title, setTitle]   = useState(card.title);
  const [notes, setNotes]   = useState(card.notes);
  const [newSub, setNewSub] = useState('');
  const pri = getPriority(card.priority);

  const saveTitle = () => { if (title.trim() && title !== card.title) onPatch({ title: title.trim() }); };
  const saveNotes = () => { if (notes !== card.notes) onPatch({ notes }); };

  const submitSub = () => {
    onAddSub(newSub);
    setNewSub('');
  };

  // sync if card prop updates (after patch)
  useEffect(() => { setTitle(card.title); setNotes(card.notes); }, [card.title, card.notes]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <input
            className="modal-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') { saveTitle(); e.target.blur(); }}}
          />
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body">
          {/* Meta row */}
          <div className="modal-meta">
            {/* Status */}
            <div className="modal-field">
              <label className="modal-label">Status</label>
              <select
                className="modal-select"
                value={card.status}
                onChange={e => onPatch({ status: e.target.value })}
              >
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div className="modal-field">
              <label className="modal-label">Priority</label>
              <select
                className="modal-select"
                value={card.priority}
                onChange={e => onPatch({ priority: e.target.value })}
                style={{ color: pri.color }}
              >
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="modal-field">
            <label className="modal-label">Notes</label>
            <textarea
              className="modal-notes"
              placeholder="Add notes…"
              value={notes}
              rows={3}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
          </div>

          {/* Subtasks */}
          <div className="modal-field">
            <label className="modal-label">Subtasks</label>
            <div className="modal-subtasks">
              {card.subtasks.map(sub => (
                <div key={sub.id} className="modal-sub-row">
                  <button
                    className={`modal-sub-check ${sub.completed ? 'modal-sub-check--done' : ''}`}
                    onClick={() => onToggleSub(sub)}
                  >
                    <span className="material-symbols-outlined">
                      {sub.completed ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                  </button>
                  <span className={`modal-sub-title ${sub.completed ? 'modal-sub-title--done' : ''}`}>
                    {sub.title}
                  </span>
                  <button className="modal-sub-delete" onClick={() => onDeleteSub(sub.id)}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}

              {/* Add subtask */}
              <div className="modal-sub-add">
                <span className="material-symbols-outlined">add</span>
                <input
                  className="modal-sub-input"
                  placeholder="Add a subtask…"
                  value={newSub}
                  onChange={e => setNewSub(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitSub(); }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="modal-delete-btn" onClick={onDelete}>
            <span className="material-symbols-outlined">delete</span>
            Delete Card
          </button>
        </div>
      </div>
    </div>
  );
}
