import { useState, useEffect } from 'react';
import './App.css';

const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];

function getAttentionFlag(card) {
  const today = new Date();
  const applied = new Date(card.dateApplied);
  const daysSinceApplied = Math.floor((today - applied) / (1000 * 60 * 60 * 24));

  if (card.status === "Applied" && daysSinceApplied >= 10) {
    return { type: "stale", message: `No update in ${daysSinceApplied} days` };
  }

  if (card.nextActionDate) {
    const nextDate = new Date(card.nextActionDate);
    const daysUntilNext = Math.floor((nextDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilNext >= 0 && daysUntilNext <= 2) {
      return { type: "upcoming", message: `${card.nextAction} due in ${daysUntilNext} day(s)` };
    }
  }

  return null;
}

function App() {
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem("cards");
    return saved ? JSON.parse(saved) : [];
  });

  const [form, setForm] = useState({
    company: "",
    role: "",
    dateApplied: "",
    nextAction: "",
    nextActionDate: "",
  });

  // Save to localStorage every time cards changes
  useEffect(() => {
    localStorage.setItem("cards", JSON.stringify(cards));
  }, [cards]);

  function addCard() {
    if (!form.company) return; // basic guard, don't add empty cards
    const newCard = {
      id: Date.now().toString(),
      company: form.company,
      role: form.role,
      status: "Applied",
      dateApplied: form.dateApplied || new Date().toISOString().slice(0, 10),
      nextAction: form.nextAction,
      nextActionDate: form.nextActionDate,
      notes: "",
    };
    setCards([...cards, newCard]);
    setForm({ company: "", role: "", dateApplied: "", nextAction: "", nextActionDate: "" });
  }

  function updateStatus(id, newStatus) {
    setCards(cards.map(c => c.id === id ? { ...c, status: newStatus } : c));
  }

  function deleteCard(id) {
    setCards(cards.filter(c => c.id !== id));
  }

  return (
  <div className="app">
    <h1>Application Tracker</h1>

    <div className="attention-panel">
      <h2>Needs Attention</h2>
      {cards
        .map(card => ({ card, flag: getAttentionFlag(card) }))
        .filter(item => item.flag !== null)
        .map(({ card, flag }) => (
          <div key={card.id} className={`attention-card ${flag.type}`}>
            <strong>{card.company}</strong> — {flag.message}
          </div>
        ))}
      {cards.every(card => getAttentionFlag(card) === null) && cards.length > 0 && (
        <p className="empty-note">Nothing needs attention right now.</p>
      )}
    </div>

    <div className="add-form">
      <input
        placeholder="Company"
        value={form.company}
        onChange={e => setForm({ ...form, company: e.target.value })}
      />
      <input
        placeholder="Role"
        value={form.role}
        onChange={e => setForm({ ...form, role: e.target.value })}
      />
      <input
        type="date"
        value={form.dateApplied}
        onChange={e => setForm({ ...form, dateApplied: e.target.value })}
      />
      <input
        placeholder="Next action"
        value={form.nextAction}
        onChange={e => setForm({ ...form, nextAction: e.target.value })}
      />
      <input
        type="date"
        value={form.nextActionDate}
        onChange={e => setForm({ ...form, nextActionDate: e.target.value })}
      />
      <button onClick={addCard}>Add</button>
    </div>

    <div className="board">
      {STATUSES.map(status => (
        <div key={status} className="column">
          <h3>{status}</h3>
          {cards.filter(c => c.status === status).map(card => (
            <div key={card.id} className="card">
              <strong>{card.company}</strong>
              {card.role}
              <div className="card-next">Next: {card.nextAction} ({card.nextActionDate})</div>
              <select value={card.status} onChange={e => updateStatus(card.id, e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => deleteCard(card.id)}>Delete</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);
}

export default App;