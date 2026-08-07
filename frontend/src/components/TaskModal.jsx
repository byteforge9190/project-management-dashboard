import { useState } from "react";
import api from "../api/axios";

const PRIORITIES = ["low", "medium", "high", "critical"];
const TYPES = ["task", "bug", "feature", "improvement"];

const TaskModal = ({ task, projectId, columnId, members, onClose, onSaved, onDeleted }) => {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [type, setType] = useState(task?.type || "task");
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : "");
  const [storyPoints, setStoryPoints] = useState(task?.storyPoints || 0);
  const [assignees, setAssignees] = useState(task?.assignees?.map((a) => a._id || a) || []);
  const [labels, setLabels] = useState(task?.labels?.join(", ") || "");
  const [subtasks, setSubtasks] = useState(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState(task?.comments || []);

  const toggleAssignee = (id) => {
    setAssignees((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      title,
      description,
      priority,
      type,
      dueDate: dueDate || null,
      storyPoints: Number(storyPoints) || 0,
      assignees,
      labels: labels.split(",").map((l) => l.trim()).filter(Boolean),
      subtasks,
      columnId: columnId,
    };

    if (isEdit) {
      await api.put(`/projects/${projectId}/tasks/${task._id}`, payload);
    } else {
      await api.post(`/projects/${projectId}/tasks`, payload);
    }
    onSaved();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this task?")) return;
    await api.delete(`/projects/${projectId}/tasks/${task._id}`);
    onDeleted();
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { title: newSubtask, done: false }]);
    setNewSubtask("");
  };

  const toggleSubtaskLocal = (idx) => {
    setSubtasks((prev) => prev.map((s, i) => (i === idx ? { ...s, done: !s.done } : s)));
  };

  const addComment = async () => {
    if (!newComment.trim() || !isEdit) return;
    const { data } = await api.post(`/projects/${projectId}/tasks/${task._id}/comments`, {
      text: newComment,
    });
    setComments(data.comments);
    setNewComment("");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
        <h2>{isEdit ? "Edit Task" : "New Task"}</h2>

        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />

        <label>Description</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task details..."
        />

        <div className="form-row">
          <div>
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Story Points</label>
            <input
              type="number"
              min="0"
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div>
            <label>Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
            <label>Labels (comma separated)</label>
            <input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="frontend, urgent" />
          </div>
        </div>

        <label>Assignees</label>
        <div className="assignee-list">
          {members.map((m) => (
            <label key={m._id} className="assignee-chip">
              <input
                type="checkbox"
                checked={assignees.includes(m._id)}
                onChange={() => toggleAssignee(m._id)}
              />
              {m.name}
            </label>
          ))}
        </div>

        <label>Subtasks</label>
        <div className="subtask-list">
          {subtasks.map((s, idx) => (
            <label key={idx} className="subtask-item">
              <input type="checkbox" checked={s.done} onChange={() => toggleSubtaskLocal(idx)} />
              <span className={s.done ? "done" : ""}>{s.title}</span>
            </label>
          ))}
          <div className="subtask-add">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add subtask..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubtask();
                }
              }}
            />
            <button type="button" onClick={addSubtask}>Add</button>
          </div>
        </div>

        {isEdit && (
          <>
            <label>Comments</label>
            <div className="comment-list">
              {comments.map((c) => (
                <div key={c._id} className="comment-item">
                  <strong>{c.author?.name || "User"}:</strong> {c.text}
                </div>
              ))}
              <div className="subtask-add">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                />
                <button type="button" onClick={addComment}>Post</button>
              </div>
            </div>
          </>
        )}

        <div className="modal-actions">
          {isEdit && (
            <button type="button" className="btn-danger" onClick={handleDelete}>Delete</button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>
    </div>
  );
};

export default TaskModal;
