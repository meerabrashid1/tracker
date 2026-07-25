import { useState, useEffect } from 'react';
import './App.css';

const STATUSES = ["Applied", "OA", "Interview", "Offer", "Rejected"];
const STATUS_COLORS = {
  "Applied": "#FFA500",
  "OA": "#4A90E2",
  "Interview": "#9B59B6",
  "Offer": "#2ECC71",
  "Rejected": "#E74C3C"
};

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
    notes: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("Newest");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [view, setView] = useState("board"); // "board" or "calendar"

  const stats = {
    total: cards.length,
    applied: cards.filter(c => c.status === "Applied").length,
    oa: cards.filter(c => c.status === "OA").length,
    interview: cards.filter(c => c.status === "Interview").length,
    offer: cards.filter(c => c.status === "Offer").length,
    rejected: cards.filter(c => c.status === "Rejected").length,
  };

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("cards", JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  function saveCard() {
    if (!form.company) return;

    if (editingId) {
      setCards(
        cards.map(card =>
          card.id === editingId
            ? {
                ...card,
                company: form.company,
                role: form.role,
                dateApplied: form.dateApplied,
                nextAction: form.nextAction,
                nextActionDate: form.nextActionDate,
                notes: form.notes,
              }
            : card
        )
      );
      setEditingId(null);
    } else {
      const newCard = {
        id: Date.now().toString(),
        company: form.company,
        role: form.role,
        status: "Applied",
        dateApplied: form.dateApplied || new Date().toISOString().slice(0, 10),
        nextAction: form.nextAction,
        nextActionDate: form.nextActionDate,
        notes: form.notes,
      };
      setCards([...cards, newCard]);
    }

    setForm({
      company: "",
      role: "",
      dateApplied: "",
      nextAction: "",
      nextActionDate: "",
      notes: "",
    });
  }

  function updateStatus(id, newStatus) {
    setCards(cards.map(c => c.id === id ? { ...c, status: newStatus } : c));
  }

  function deleteCard(id) {
    setCards(cards.filter(c => c.id !== id));
  }

  function editCard(card) {
    setForm({
      company: card.company,
      role: card.role,
      dateApplied: card.dateApplied,
      nextAction: card.nextAction,
      nextActionDate: card.nextActionDate,
      notes: card.notes || "",
    });
    setEditingId(card.id);
  }

  // Export to CSV
  function exportToCSV() {
    if (cards.length === 0) {
      alert("No applications to export!");
      return;
    }
    
    const headers = ["Company", "Role", "Status", "Date Applied", "Next Action", "Next Action Date", "Notes"];
    const csvRows = [headers.join(",")];
    
    cards.forEach(card => {
      const row = [
        `"${card.company}"`,
        `"${card.role}"`,
        `"${card.status}"`,
        `"${card.dateApplied}"`,
        `"${card.nextAction || ''}"`,
        `"${card.nextActionDate || ''}"`,
        `"${card.notes || ''}"`
      ];
      csvRows.push(row.join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-applications-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Sorting function
  const sortCards = (cardList) => {
    const sorted = [...cardList];
    switch(sortBy) {
      case "Newest":
        return sorted.sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
      case "Oldest":
        return sorted.sort((a, b) => new Date(a.dateApplied) - new Date(b.dateApplied));
      case "A-Z":
        return sorted.sort((a, b) => a.company.localeCompare(b.company));
      case "Z-A":
        return sorted.sort((a, b) => b.company.localeCompare(a.company));
      default:
        return sorted;
    }
  };

  // Get days until next action
  function getDaysUntil(date) {
    if (!date) return null;
    const today = new Date();
    const nextDate = new Date(date);
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Calendar view
  function renderCalendar() {
    const months = ["January", "February", "March", "April", "May", "June", 
                    "July", "August", "September", "October", "November", "December"];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    // Get cards for each day
    const getCardsForDay = (day) => {
      if (!day) return [];
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return cards.filter(c => c.nextActionDate === dateStr || c.dateApplied === dateStr);
    };

    return (
      <div className="calendar-view">
        <h2>{months[currentMonth]} {currentYear}</h2>
        <div className="calendar-grid">
          <div className="calendar-header">Sun</div>
          <div className="calendar-header">Mon</div>
          <div className="calendar-header">Tue</div>
          <div className="calendar-header">Wed</div>
          <div className="calendar-header">Thu</div>
          <div className="calendar-header">Fri</div>
          <div className="calendar-header">Sat</div>
          
          {weeks.map((week, weekIndex) => (
            week.map((day, dayIndex) => {
              const dayCards = day ? getCardsForDay(day) : [];
              const isToday = day === currentDate.getDate() && 
                             currentMonth === new Date().getMonth() && 
                             currentYear === new Date().getFullYear();
              const dateStr = day ? `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              
              return (
                <div 
                  key={`${weekIndex}-${dayIndex}`} 
                  className={`calendar-day ${isToday ? 'today' : ''} ${dayCards.length > 0 ? 'has-events' : ''}`}
                >
                  <div className="day-number">{day}</div>
                  {dayCards.slice(0, 3).map(card => (
                    <div key={card.id} className="calendar-event" style={{borderLeftColor: STATUS_COLORS[card.status]}}>
                      <small>{card.company}</small>
                    </div>
                  ))}
                  {dayCards.length > 3 && <small className="more-events">+{dayCards.length - 3} more</small>}
                </div>
              );
            })
          ))}
        </div>
      </div>
    );
  }

  // Progress chart
  function renderProgressChart() {
    const maxValue = Math.max(stats.applied, stats.oa, stats.interview, stats.offer, stats.rejected, 1);
    
    return (
      <div className="progress-chart">
        <h2>Application Progress</h2>
        <div className="chart-container">
          {STATUSES.map(status => {
            const count = cards.filter(c => c.status === status).length;
            const percentage = (count / Math.max(stats.total, 1)) * 100;
            return (
              <div key={status} className="chart-bar">
                <div className="chart-label">{status}</div>
                <div className="bar-track">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: STATUS_COLORS[status]
                    }}
                  >
                    <span className="bar-count">{count}</span>
                  </div>
                </div>
                <div className="chart-percentage">{Math.round(percentage)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <div className="header">
        <div>
          <h1>📋 Job Application Tracker</h1>
          <p>Manage and track all your job applications in one place.</p>
        </div>
        <div className="header-controls">
          <button 
            className="dark-mode-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setView(view === "board" ? "calendar" : "board")} className="view-toggle">
            {view === "board" ? "📅 Calendar" : "📋 Board"}
          </button>
          <button onClick={exportToCSV} className="export-btn">
            📊 Export CSV
          </button>
        </div>
      </div>
      
      <div className="dashboard">
        <h2>Dashboard</h2>
        <div className="stats-grid">
          <div className="stat-box">
            <h3>{stats.total}</h3>
            <p>Total</p>
          </div>
          {STATUSES.map(status => {
            const count = cards.filter(c => c.status === status).length;
            return (
              <div key={status} className="stat-box" style={{borderTopColor: STATUS_COLORS[status]}}>
                <h3>{count}</h3>
                <p>{status}</p>
              </div>
            );
          })}
        </div>
      </div>

      {renderProgressChart()}

      <div className="attention-panel">
        <h2>⚠️ Needs Attention</h2>
        {cards
          .map(card => ({ card, flag: getAttentionFlag(card) }))
          .filter(item => item.flag !== null)
          .map(({ card, flag }) => (
            <div key={card.id} className={`attention-card ${flag.type}`}>
              <strong>{card.company}</strong> — {flag.message}
            </div>
          ))}
        {cards.every(card => getAttentionFlag(card) === null) && cards.length > 0 && (
          <p className="empty-note">✅ Nothing needs attention right now.</p>
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
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          rows="3"
        />
        <button onClick={saveCard}>
          {editingId ? "Update" : "Add"}
        </button>
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="🔍 Search by company or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          {STATUSES.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="Newest">Newest First</option>
          <option value="Oldest">Oldest First</option>
          <option value="A-Z">Company A-Z</option>
          <option value="Z-A">Company Z-A</option>
        </select>
      </div>

      {view === "board" ? (
        <div className="board">
          {STATUSES.map(status => {
            let statusCards = cards.filter(c => c.status === status);
            
            if (filterStatus !== "All") {
              statusCards = statusCards.filter(c => c.status === filterStatus);
            }
            
            statusCards = statusCards.filter(
              c =>
                c.company.toLowerCase().includes(search.toLowerCase()) ||
                c.role.toLowerCase().includes(search.toLowerCase())
            );
            
            statusCards = sortCards(statusCards);

            return (
              <div key={status} className="column">
                <h3 style={{color: STATUS_COLORS[status]}}>{status}</h3>
                {statusCards.map(card => {
                  const daysUntil = getDaysUntil(card.nextActionDate);
                  return (
                    <div key={card.id} className="card">
                      <div className="card-header">
                        <strong>{card.company}</strong>
                        <span className="status-badge" style={{backgroundColor: STATUS_COLORS[card.status]}}>
                          {card.status}
                        </span>
                      </div>
                      <div className="card-role">{card.role}</div>
                      <div className="card-next">
                        Next: {card.nextAction || 'None'} 
                        {card.nextActionDate && (
                          <span className={`due-countdown ${daysUntil <= 2 ? 'urgent' : ''}`}>
                            ({daysUntil > 0 ? `${daysUntil} days` : daysUntil === 0 ? 'Today!' : 'Overdue'})
                          </span>
                        )}
                      </div>
                      {card.notes && (
                        <div className="card-notes">
                          <strong>Notes:</strong> {card.notes}
                        </div>
                      )}
                      <select
                        value={card.status}
                        onChange={e => updateStatus(card.id, e.target.value)}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <div className="card-actions">
                        <button onClick={() => editCard(card)}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => deleteCard(card.id)}>
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        renderCalendar()
      )}
    </div>
  );
}

export default App;
