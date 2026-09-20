"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { demoTasks, starterCategories } from "@/lib/defaults";
import { Category, ContentPlatform, ContentStatus, PlannerTask } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type View = "home" | "months" | "calendar";
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const monthLabel = (year: number, month: number) => new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
const startOfWeek = (date: Date) => { const copy = new Date(date); copy.setDate(copy.getDate() - copy.getDay()); return copy; };

export default function Planner() {
  const now = new Date();
  const [categories, setCategories] = useState<Category[]>(starterCategories);
  const [tasks, setTasks] = useState<PlannerTask[]>(() => demoTasks(now));
  const [view, setView] = useState<View>("home");
  const [selectedCategory, setSelectedCategory] = useState<Category>(starterCategories[0]);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(dayKey(now));
  const [showEditor, setShowEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannerTask | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const savedTasks = window.localStorage.getItem("mayank-planner-tasks");
    const savedCategories = window.localStorage.getItem("mayank-planner-categories");
    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedCategories) setCategories(JSON.parse(savedCategories));
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem("mayank-planner-tasks", JSON.stringify(tasks)); }, [tasks, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem("mayank-planner-categories", JSON.stringify(categories)); }, [categories, hydrated]);
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    const client = supabase;
    if (!client) return;
    const load = async (id: string) => {
      const [{ data: categoryRows }, { data: taskRows }] = await Promise.all([
        client.from("categories").select("*").order("display_order"),
        client.from("tasks").select("*").order("planned_date")
      ]);
      if (categoryRows?.length) setCategories(categoryRows.map((row) => ({ id: row.id, name: row.name, icon: row.icon, accent: row.accent, description: row.description, order: row.display_order })));
      else await client.from("categories").upsert(starterCategories.map((category) => ({ user_id: id, id: category.id, name: category.name, icon: category.icon, accent: category.accent, description: category.description, display_order: category.order })));
      if (taskRows) setTasks(taskRows.map((row) => ({ id: row.id, categoryId: row.category_id, title: row.title, plannedDate: row.planned_date, deadline: row.deadline ?? undefined, notes: row.notes ?? undefined, status: row.status, completedAt: row.completed_at ?? undefined, platform: row.platform ?? undefined, contentStatus: row.content_status ?? undefined, createdAt: row.created_at })));
    };
    void client.auth.getSession().then(({ data: { session } }) => { if (session) { setUserId(session.user.id); void load(session.user.id); } });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { setUserId(session?.user.id ?? null); if (session) void load(session.user.id); });
    return () => subscription.unsubscribe();
  }, []);

  const categoryTasks = (id: string) => tasks.filter((task) => task.categoryId === id);
  const percent = (list: PlannerTask[]) => list.length ? Math.round((list.filter((task) => task.status === "done").length / list.length) * 100) : 0;
  const today = dayKey(now);
  const overdue = tasks.filter((task) => task.status === "open" && task.deadline && task.deadline < today);
  const weekStart = startOfWeek(now);
  const weekTasks = tasks.filter((task) => { const d = new Date(`${task.plannedDate}T12:00:00`); return d >= weekStart && d < new Date(weekStart.getTime() + 7 * 86400000); });
  const weekDates = Array.from({ length: 7 }, (_, index) => { const d = new Date(weekStart); d.setDate(d.getDate() + index); return d; });
  const currentMonthTasks = categoryTasks(selectedCategory.id).filter((task) => { const d = new Date(`${task.plannedDate}T12:00:00`); return d.getFullYear() === year && d.getMonth() === month; });
  const selectedDayTasks = categoryTasks(selectedCategory.id).filter((task) => task.plannedDate === selectedDate);
  const completeDays = new Set(tasks.filter((task) => task.status === "done").map((task) => task.completedAt?.slice(0, 10)).filter(Boolean));
  const streak = (() => { let count = 0; const cursor = new Date(now); while (completeDays.has(dayKey(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); } return count; })();

  function openCategory(category: Category) { setSelectedCategory(category); setView("months"); }
  function openMonth(index: number) { setMonth(index); setSelectedDate(`${year}-${String(index + 1).padStart(2, "0")}-01`); setView("calendar"); }
  async function upsertCloudTask(task: PlannerTask) { if (!supabase || !userId) return; await supabase.from("tasks").upsert({ id: task.id, user_id: userId, category_id: task.categoryId, title: task.title, planned_date: task.plannedDate, deadline: task.deadline ?? null, notes: task.notes ?? null, status: task.status, completed_at: task.completedAt ?? null, platform: task.platform ?? null, content_status: task.contentStatus ?? null, created_at: task.createdAt }); }
  function toggleTask(id: string) { setTasks((items) => items.map((task) => { if (task.id !== id) return task; const next = { ...task, status: task.status === "done" ? "open" as const : "done" as const, completedAt: task.status === "done" ? undefined : new Date().toISOString() }; void upsertCloudTask(next); return next; })); }
  function deleteTask(id: string) { setTasks((items) => items.filter((task) => task.id !== id)); if (supabase && userId) void supabase.from("tasks").delete().eq("id", id); }
  function editTask(task?: PlannerTask) { setEditingTask(task ?? null); setShowEditor(true); }
  function saveTask(task: PlannerTask) { setTasks((items) => editingTask ? items.map((item) => item.id === task.id ? task : item) : [...items, task]); void upsertCloudTask(task); setShowEditor(false); setEditingTask(null); }
  function addCategory(category: Category) { setCategories((items) => [...items, category]); if (supabase && userId) void supabase.from("categories").upsert({ user_id: userId, id: category.id, name: category.name, icon: category.icon, accent: category.accent, description: category.description, display_order: category.order }); setShowAddCategory(false); }
  async function signIn(email: string, password: string, isNew: boolean) {
    if (!supabase) { setAuthMessage("Add Supabase keys to .env.local to enable your private account."); return; }
    const { error } = isNew ? await supabase.auth.signUp({ email, password, options: { data: { name: "Mayank" } } }) : await supabase.auth.signInWithPassword({ email, password });
    setAuthMessage(error ? error.message : isNew ? "Account created — confirm your email, then sign in." : "Signed in successfully.");
  }

  return <main className="planner-shell">
    <nav className="sidebar">
      <button className="brand" onClick={() => setView("home")} aria-label="Open dashboard"><span className="brand-mark">M</span><span>mayank<span>•</span>planner</span></button>
      <div className="nav-group"><button className={view === "home" ? "nav-item active" : "nav-item"} onClick={() => setView("home")}><span>◫</span> Overview</button><button className="nav-item" onClick={() => openCategory(selectedCategory)}><span>▦</span> My planning</button></div>
      <p className="nav-caption">YOUR SPACES</p>
      <div className="category-nav">{categories.map((category) => <button className={selectedCategory.id === category.id ? "space-link selected" : "space-link"} key={category.id} onClick={() => openCategory(category)}><i className={`dot ${category.accent}`} />{category.name}</button>)}</div>
      <button className="add-space" onClick={() => setShowAddCategory(true)}>＋ Add a category</button>
      <div className="sidebar-bottom"><button className="profile" onClick={() => setShowAuth(true)}><span className="avatar">M</span><span><strong>Mayank</strong><small>Private workspace</small></span><b>⌄</b></button></div>
    </nav>

    <section className="content-area">
      <header className="topbar"><div className="crumbs"><span>{view === "home" ? "Personal planning" : selectedCategory.name}</span>{view !== "home" && <><b>/</b><button onClick={() => setView("months")}>{view === "months" ? "Months" : monthLabel(year, month)}</button></>}</div><div className="top-actions"><span className="sync-pill"><i /> {userId ? "Private cloud sync" : "Saved locally"}</span><button className="icon-button" aria-label="Settings">⚙</button></div></header>
      {view === "home" && <Dashboard categories={categories} tasks={tasks} weekTasks={weekTasks} overdue={overdue} streak={streak} onOpenCategory={openCategory} onToggle={toggleTask} />}
      {view === "months" && <MonthPicker category={selectedCategory} year={year} tasks={categoryTasks(selectedCategory.id)} onYear={setYear} onMonth={openMonth} />}
      {view === "calendar" && <CalendarView category={selectedCategory} year={year} month={month} selectedDate={selectedDate} tasks={currentMonthTasks} selectedDayTasks={selectedDayTasks} onBack={() => setView("months")} onDate={setSelectedDate} onAdd={() => editTask()} onEdit={editTask} onToggle={toggleTask} onDelete={deleteTask} />}
    </section>

    {showEditor && <TaskEditor category={selectedCategory} selectedDate={selectedDate} task={editingTask} onClose={() => { setShowEditor(false); setEditingTask(null); }} onSave={saveTask} />}
    {showAddCategory && <CategoryEditor onClose={() => setShowAddCategory(false)} onSave={addCategory} />}
    {showAuth && <AuthDialog message={authMessage} onClose={() => { setShowAuth(false); setAuthMessage(""); }} onSubmit={signIn} />}
  </main>;
}

function Dashboard({ categories, tasks, weekTasks, overdue, streak, onOpenCategory, onToggle }: { categories: Category[]; tasks: PlannerTask[]; weekTasks: PlannerTask[]; overdue: PlannerTask[]; streak: number; onOpenCategory: (category: Category) => void; onToggle: (id: string) => void }) {
  const weekTotal = weekTasks.length; const weekDone = weekTasks.filter((task) => task.status === "done").length;
  return <div className="page dashboard"><div className="hero"><div><p className="eyebrow">SATURDAY, 20 SEPTEMBER</p><h1>Hi Mayank <span>✦</span></h1><p>Small plans. Stronger days. Let&apos;s make this week count.</p></div><div className="hero-orb"><span>{weekTotal ? Math.round(weekDone / weekTotal * 100) : 0}%</span><small>weekly flow</small></div></div>
    <div className="stats"><article><span>THIS WEEK</span><strong>{weekDone}<em> / {weekTotal} done</em></strong><div className="mini-progress"><i style={{ width: `${weekTotal ? (weekDone / weekTotal) * 100 : 0}%` }} /></div></article><article><span>CONSISTENCY</span><strong>{streak}<em> day streak</em></strong><p>Keep a promise to yourself today.</p></article><article><span>OPEN DEADLINES</span><strong className={overdue.length ? "danger" : ""}>{overdue.length}</strong><p>{overdue.length ? "Need your attention" : "You are all caught up"}</p></article></div>
    <div className="section-heading"><div><p className="eyebrow">YOUR FOCUS AREAS</p><h2>Plan with intention</h2></div><span>{categories.length} spaces</span></div>
    <div className="category-grid">{categories.map((category) => { const list = tasks.filter((task) => task.categoryId === category.id); const done = list.filter((task) => task.status === "done").length; const value = list.length ? Math.round(done / list.length * 100) : 0; return <button className={`category-card ${category.accent}`} onClick={() => onOpenCategory(category)} key={category.id}><span className="category-icon">{category.icon}</span><span className="card-arrow">↗</span><div><h3>{category.name}</h3><p>{category.description}</p></div><div className="category-footer"><div className="card-progress"><i style={{ width: `${value}%` }} /></div><span>{done}/{list.length} complete</span></div></button>; })}</div>
    <section className="bottom-grid"><div className="panel"><div className="panel-heading"><div><p className="eyebrow">TODAY&apos;S CHECKPOINT</p><h2>Move the needle</h2></div><span>{weekTotal - weekDone} left</span></div><div className="task-stack">{weekTasks.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} onToggle={onToggle} />)}{!weekTasks.length && <Empty text="Your week is clear. Add a target from any category." />}</div></div><div className="panel emphasis"><p className="eyebrow">YOUR PACE</p><h2>Progress is not always loud.</h2><p>Show up, check it off, and let the little wins compound.</p><div className="quote-line"><i /> A calmer way to build consistency</div></div></section>
  </div>;
}

function MonthPicker({ category, year, tasks, onYear, onMonth }: { category: Category; year: number; tasks: PlannerTask[]; onYear: (year: number) => void; onMonth: (month: number) => void }) {
  return <div className="page months-page"><div className="page-intro"><p className="eyebrow"><i className={`dot ${category.accent}`} /> {category.name.toUpperCase()}</p><h1>Choose your month</h1><p>Every month is a fresh surface for focused work.</p></div><div className="year-switcher"><button onClick={() => onYear(year - 1)}>←</button><strong>{year}</strong><button onClick={() => onYear(year + 1)}>→</button></div><div className="month-grid">{months.map((name, index) => { const monthly = tasks.filter((task) => { const d = new Date(`${task.plannedDate}T12:00:00`); return d.getFullYear() === year && d.getMonth() === index; }); const complete = monthly.filter((task) => task.status === "done").length; return <button className="month-tile" key={name} onClick={() => onMonth(index)}><span>{String(index + 1).padStart(2, "0")}</span><h2>{name}</h2><p>{monthly.length ? `${complete}/${monthly.length} targets done` : "Start planning"}</p><i style={{ width: `${monthly.length ? (complete / monthly.length) * 100 : 0}%` }} /></button>; })}</div></div>;
}

function CalendarView({ category, year, month, selectedDate, tasks, selectedDayTasks, onBack, onDate, onAdd, onEdit, onToggle, onDelete }: { category: Category; year: number; month: number; selectedDate: string; tasks: PlannerTask[]; selectedDayTasks: PlannerTask[]; onBack: () => void; onDate: (value: string) => void; onAdd: () => void; onEdit: (task: PlannerTask) => void; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const first = new Date(year, month, 1); const leading = first.getDay(); const days = new Date(year, month + 1, 0).getDate(); const cells = Array.from({ length: leading + days }, (_, index) => index < leading ? null : new Date(year, month, index - leading + 1));
  const selected = new Date(`${selectedDate}T12:00:00`); const week = Array.from({ length: 7 }, (_, index) => { const d = startOfWeek(selected); d.setDate(d.getDate() + index); return d; });
  return <div className="page calendar-page"><div className="calendar-heading"><div><button className="back-button" onClick={onBack}>← Back to months</button><p className="eyebrow"><i className={`dot ${category.accent}`} /> {category.name.toUpperCase()}</p><h1>{monthLabel(year, month)}</h1></div><button className="primary-button" onClick={onAdd}>＋ Add target</button></div><div className="calendar-layout"><section className="calendar-panel"><div className="weekday-row">{weekDays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{cells.map((date, index) => { if (!date) return <span className="blank-cell" key={`blank-${index}`} />; const value = dayKey(date); const entries = tasks.filter((task) => task.plannedDate === value); const isSelected = value === selectedDate; const today = value === dayKey(new Date()); return <button key={value} className={`${isSelected ? "selected " : ""}${today ? "today" : ""}calendar-day`} onClick={() => onDate(value)}><strong>{date.getDate()}</strong><div>{entries.slice(0, 3).map((task) => <i key={task.id} className={`event-dot ${task.status === "done" ? "done" : category.accent}`} />)}</div>{entries.length > 3 && <small>+{entries.length - 3}</small>}</button>; })}</div></section><aside className="day-panel"><div className="day-panel-heading"><div><p className="eyebrow">DAY PLAN</p><h2>{selected.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</h2></div><button className="small-add" onClick={onAdd}>＋</button></div><div className="task-stack day-tasks">{selectedDayTasks.map((task) => <TaskRow key={task.id} task={task} onToggle={onToggle} onEdit={() => onEdit(task)} onDelete={() => onDelete(task.id)} />)}{!selectedDayTasks.length && <Empty text="Nothing planned yet. Give this day one meaningful target." />}</div></aside></div><section className="weekly-strip"><div><p className="eyebrow">WEEKLY FOCUS</p><h2>This week at a glance</h2></div><div className="week-list">{week.map((date) => { const value = dayKey(date); const total = tasks.filter((task) => task.plannedDate === value).length; const done = tasks.filter((task) => task.plannedDate === value && task.status === "done").length; return <button onClick={() => onDate(value)} className={value === selectedDate ? "week-day current" : "week-day"} key={value}><span>{date.toLocaleDateString("en-IN", { weekday: "short" })}</span><strong>{date.getDate()}</strong><i style={{ height: `${total ? Math.max(12, (done / total) * 36) : 4}px` }} /></button>; })}</div></section></div>;
}

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: PlannerTask; onToggle: (id: string) => void; onEdit?: () => void; onDelete?: () => void }) {
  const overdue = task.status === "open" && task.deadline && task.deadline < dayKey(new Date());
  return <div className={`task-row ${task.status === "done" ? "is-done" : ""}`}><button className="check-button" onClick={() => onToggle(task.id)} aria-label={task.status === "done" ? "Mark incomplete" : "Mark complete"}>{task.status === "done" && "✓"}</button><div className="task-copy"><strong>{task.title}</strong><span>{task.platform && <b className="platform-tag">{task.platform}</b>}{task.deadline && <em className={overdue ? "late" : ""}>{overdue ? "Overdue · " : "Due · "}{dateLabel(task.deadline)}</em>}</span></div>{onEdit && <button className="row-action" onClick={onEdit} aria-label="Edit task">···</button>}{onDelete && <button className="delete-action" onClick={onDelete} aria-label="Delete task">×</button>}</div>;
}

function Empty({ text }: { text: string }) { return <div className="empty"><span>✦</span><p>{text}</p></div>; }

function TaskEditor({ category, selectedDate, task, onClose, onSave }: { category: Category; selectedDate: string; task: PlannerTask | null; onClose: () => void; onSave: (task: PlannerTask) => void }) {
  const [title, setTitle] = useState(task?.title ?? ""); const [date, setDate] = useState(task?.plannedDate ?? selectedDate); const [deadline, setDeadline] = useState(task?.deadline ?? ""); const [notes, setNotes] = useState(task?.notes ?? ""); const [platform, setPlatform] = useState<ContentPlatform | "">(task?.platform ?? ""); const [contentStatus, setContentStatus] = useState<ContentStatus>(task?.contentStatus ?? "Idea");
  function submit(event: FormEvent) { event.preventDefault(); if (!title.trim()) return; onSave({ id: task?.id ?? crypto.randomUUID(), categoryId: category.id, title: title.trim(), plannedDate: date, deadline: deadline || undefined, notes: notes || undefined, status: task?.status ?? "open", completedAt: task?.completedAt, platform: category.id === "content" && platform ? platform : undefined, contentStatus: category.id === "content" ? contentStatus : undefined, createdAt: task?.createdAt ?? new Date().toISOString() }); }
  return <div className="modal-layer"><form className="modal" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">{category.name.toUpperCase()}</p><h2>{task ? "Edit target" : "New target"}</h2></div><button type="button" className="close-button" onClick={onClose}>×</button></div><label>What do you want to do?<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Finish chapter 4 notes" /></label><div className="form-two"><label>Plan for<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label>Deadline <span>optional</span><input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} /></label></div>{category.id === "content" && <div className="form-two"><label>Platform<select value={platform} onChange={(event) => setPlatform(event.target.value as ContentPlatform)}><option value="">Choose a platform</option><option>Instagram</option><option>LinkedIn</option><option>X</option></select></label><label>Status<select value={contentStatus} onChange={(event) => setContentStatus(event.target.value as ContentStatus)}><option>Idea</option><option>Draft</option><option>Planned</option><option>Published</option></select></label></div>}<label>Notes <span>optional</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add context, links, or a small reminder..." rows={4} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">{task ? "Save changes" : "Add target"}</button></div></form></div>;
}

function CategoryEditor({ onClose, onSave }: { onClose: () => void; onSave: (category: Category) => void }) { const [name, setName] = useState(""); function submit(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; onSave({ id: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") + Date.now(), name: name.trim(), icon: "✦", accent: "violet", description: "A new space for what matters", order: 99 }); } return <div className="modal-layer"><form className="modal compact" onSubmit={submit}><div className="modal-head"><div><p className="eyebrow">NEW SPACE</p><h2>Add a category</h2></div><button type="button" className="close-button" onClick={onClose}>×</button></div><label>Category name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Reading, Notes, Reels" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Create space</button></div></form></div>; }

function AuthDialog({ message, onClose, onSubmit }: { message: string; onClose: () => void; onSubmit: (email: string, password: string, isNew: boolean) => void }) { const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [isNew, setIsNew] = useState(false); return <div className="modal-layer"><form className="modal compact" onSubmit={(event) => { event.preventDefault(); onSubmit(email, password, isNew); }}><div className="modal-head"><div><p className="eyebrow">PRIVATE WORKSPACE</p><h2>{isNew ? "Create your account" : "Sign in to Mayank Planner"}</h2></div><button type="button" className="close-button" onClick={onClose}>×</button></div><p className="auth-copy">Your tasks sync securely after Supabase is connected.</p><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required /></label>{message && <p className="auth-message">{message}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setIsNew(!isNew)}>{isNew ? "I have an account" : "Create account"}</button><button className="primary-button">{isNew ? "Create account" : "Sign in"}</button></div></form></div>; }
