import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Search, 
  Sparkles,
  Calendar,
  ChevronDown,
  Filter,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GeminiService } from "../services/geminiService";

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
}

export const TaskManagement: React.FC<{ onToggleSidebar?: () => void }> = ({ onToggleSidebar }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium", due_date: "" });
  const [filter, setFilter] = useState<'all' | 'todo' | 'doing' | 'done'>('all');
  const [isSuggesting, setIsSuggesting] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Record<number, string>>({});
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const gemini = new GeminiService();

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask)
      });
      if (res.ok) {
        const data = await res.json();
        setTasks([data, ...tasks]);
        setNewTask({ title: "", description: "", priority: "medium", due_date: "" });
        setIsAdding(false);
      }
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  const updateTask = async (id: number, updates: Partial<Task>) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
      }
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  const saveEdit = async (id: number) => {
    if (!editingTask) return;
    await updateTask(id, {
      title: editingTask.title,
      description: editingTask.description,
      priority: editingTask.priority,
      due_date: editingTask.due_date
    });
    setExpandedTaskId(null);
    setEditingTask(null);
  };

  const handleTaskClick = (task: Task) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
      setEditingTask(null);
    } else {
      setExpandedTaskId(task.id);
      setEditingTask({ ...task });
    }
  };

  const deleteTask = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== id));
        setTaskToDelete(null);
      }
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const smartSuggest = async (task: Task) => {
    setIsSuggesting(task.id);
    try {
      const prompt = `I have a task: "${task.title}". Description: "${task.description}". 
      Please provide 3-5 actionable sub-tasks or research points to help me complete this task. 
      Use Google Search to find the most up-to-date information or best practices if relevant.
      Format the response as a concise Markdown list.`;
      
      const result = await gemini.chat(prompt, [], { model: "gemini-3-flash-preview" });
      setSuggestions({ ...suggestions, [task.id]: result });
    } catch (err) {
      console.error("Smart suggest failed", err);
    } finally {
      setIsSuggesting(null);
    }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-orange-500 bg-orange-50';
      case 'low': return 'text-blue-500 bg-blue-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--accent-main)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--bg-main)]">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            {onToggleSidebar && (
              <button 
                onClick={onToggleSidebar}
                className="p-2 hover:bg-[var(--border-main)] rounded-lg text-[var(--text-muted)] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
              </button>
            )}
            <div>
              <h2 className="text-3xl font-serif font-bold mb-2">Task Management</h2>
              <p className="text-[var(--text-muted)]">Organize your workflow and get AI-powered insights.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent-main)] text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
          >
            <Plus className="w-5 h-5" />
            Add New Task
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
          {(['all', 'todo', 'doing', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                filter === f 
                ? "bg-[var(--accent-main)] text-white" 
                : "bg-[var(--surface-main)] border border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--border-main)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-3xl p-6 mb-8 shadow-sm"
            >
              <form onSubmit={addTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Task Title</label>
                    <input 
                      type="text" 
                      value={newTask.title}
                      onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="What needs to be done?"
                      className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Due Date</label>
                    <input 
                      type="date" 
                      value={newTask.due_date}
                      onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-[var(--text-muted)]">Description</label>
                  <textarea 
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Add more details..."
                    className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-xl outline-none focus:border-[var(--accent-main)] min-h-[100px]"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-muted)]">Priority:</span>
                      <select 
                        value={newTask.priority}
                        onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                        className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-lg px-2 py-1 text-sm outline-none focus:border-[var(--accent-main)]"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-6 py-2 bg-[var(--surface-hover)] text-[var(--text-muted)] rounded-xl font-bold hover:bg-[var(--border-main)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-6 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold shadow-md hover:scale-[1.02] transition-transform"
                    >
                      Create Task
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <motion.div 
                layout
                key={task.id}
                className={`bg-[var(--surface-main)] border border-[var(--border-main)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer ${expandedTaskId === task.id ? 'ring-2 ring-[var(--accent-main)]' : ''}`}
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' }); }}
                    className="mt-1 text-[var(--text-muted)] hover:text-[var(--accent-main)] transition-colors"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    {expandedTaskId === task.id && editingTask ? (
                      <div className="space-y-4" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={editingTask.title}
                          onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                          className="w-full px-3 py-2 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-lg outline-none focus:border-[var(--accent-main)] font-bold text-lg"
                        />
                        <textarea 
                          value={editingTask.description}
                          onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                          className="w-full px-3 py-2 bg-[var(--surface-hover)] border border-[var(--border-main)] rounded-lg outline-none focus:border-[var(--accent-main)] min-h-[80px] text-sm"
                          placeholder="Description..."
                        />
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-muted)]">Priority:</span>
                            <select 
                              value={editingTask.priority}
                              onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                              className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-lg px-2 py-1 text-sm outline-none focus:border-[var(--accent-main)]"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-muted)]">Due:</span>
                            <input 
                              type="date" 
                              value={editingTask.due_date || ''}
                              onChange={e => setEditingTask({ ...editingTask, due_date: e.target.value })}
                              className="bg-[var(--surface-main)] border border-[var(--border-main)] rounded-lg px-2 py-1 text-sm outline-none focus:border-[var(--accent-main)]"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <button 
                            onClick={() => { setExpandedTaskId(null); setEditingTask(null); }}
                            className="px-4 py-1.5 bg-[var(--surface-hover)] text-[var(--text-muted)] rounded-lg font-bold hover:bg-[var(--border-main)] text-sm transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => saveEdit(task.id)}
                            className="px-4 py-1.5 bg-[var(--accent-main)] text-white rounded-lg font-bold shadow-md hover:scale-[1.02] text-sm transition-transform"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`text-lg font-bold truncate ${task.status === 'done' ? 'line-through text-[var(--text-muted)]' : ''}`}>
                            {task.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        
                        {task.description && (
                          <p className={`text-sm text-[var(--text-muted)] mb-3 ${expandedTaskId === task.id ? '' : 'line-clamp-2'}`}>{task.description}</p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(task.due_date).toLocaleDateString()}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(task.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <select 
                              value={task.status}
                              onChange={e => { e.stopPropagation(); updateTask(task.id, { status: e.target.value as any }); }}
                              onClick={e => e.stopPropagation()}
                              className="bg-transparent border-none text-[var(--accent-main)] font-bold cursor-pointer outline-none"
                            >
                              <option value="todo">To Do</option>
                              <option value="doing">Doing</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    {suggestions[task.id] && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border-main)] text-sm"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 mb-2 text-[var(--accent-main)] font-bold">
                          <Sparkles className="w-4 h-4" />
                          AI Suggestions
                        </div>
                        <div className="prose prose-sm max-w-none text-[var(--text-main)]">
                          {suggestions[task.id].split('\n').map((line, i) => (
                            <p key={i} className="mb-1">{line}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); smartSuggest(task); }}
                      disabled={isSuggesting === task.id}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-main)] hover:bg-[var(--accent-main)]/5 rounded-lg transition-all"
                      title="AI Smart Suggest"
                    >
                      {isSuggesting === task.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTaskToDelete(task.id); }}
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-[var(--surface-main)] border border-dashed border-[var(--border-main)] rounded-3xl">
              <div className="w-16 h-16 bg-[var(--surface-hover)] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">No tasks found</h3>
              <p className="text-[var(--text-muted)] mb-6">Start by adding a new task to your list.</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="px-6 py-2 bg-[var(--accent-main)] text-white rounded-xl font-bold shadow-md hover:scale-[1.02] transition-transform"
              >
                Add Your First Task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[var(--surface-main)] p-8 rounded-3xl shadow-2xl w-full max-w-md border border-[var(--border-main)]"
            >
              <div className="flex items-center gap-4 mb-6 text-red-500">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold">Delete Task?</h3>
              </div>
              <p className="text-[var(--text-muted)] mb-8">
                Are you sure you want to delete this task? This action cannot be undone and you will lose all associated data.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setTaskToDelete(null)}
                  className="flex-1 py-3 bg-[var(--surface-hover)] text-[var(--text-muted)] rounded-xl font-bold hover:bg-[var(--border-main)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteTask(taskToDelete)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg hover:bg-red-600 transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
