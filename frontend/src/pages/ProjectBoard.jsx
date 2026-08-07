import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import TaskModal from "../components/TaskModal";

const PRIORITY_COLORS = {
  low: "#4caf50",
  medium: "#2196f3",
  high: "#ff9800",
  critical: "#f44336",
};

const ProjectBoard = () => {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const loadData = async () => {
    const [projRes, taskRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/tasks`, {
        params: {
          assignee: filterAssignee || undefined,
          priority: filterPriority || undefined,
        },
      }),
    ]);
    setProject(projRes.data);
    setTasks(taskRes.data);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filterAssignee, filterPriority]);

  const members = useMemo(() => {
    if (!project) return [];
    return [project.owner, ...project.members.map((m) => m.user)];
  }, [project]);

  const columns = useMemo(() => {
    if (!project) return [];
    return [...project.columns].sort((a, b) => a.order - b.order);
  }, [project]);

  const tasksByColumn = useMemo(() => {
    const map = {};
    columns.forEach((c) => (map[c.id] = []));
    tasks.forEach((t) => {
      if (!map[t.columnId]) map[t.columnId] = [];
      map[t.columnId].push(t);
    });
    Object.keys(map).forEach((k) => map[k].sort((a, b) => a.order - b.order));
    return map;
  }, [tasks, columns]);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic UI update
    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    const newTasks = [...tasks];
    const movedTaskIdx = newTasks.findIndex((t) => t._id === draggableId);
    const movedTask = { ...newTasks[movedTaskIdx] };

    const destTasks = tasksByColumn[destCol].filter((t) => t._id !== draggableId);
    destTasks.splice(destination.index, 0, movedTask);
    const newOrder = destination.index;

    movedTask.columnId = destCol;
    movedTask.order = newOrder;
    newTasks[movedTaskIdx] = movedTask;
    setTasks(newTasks);

    try {
      await api.put(`/projects/${projectId}/tasks/${draggableId}/move`, {
        columnId: destCol,
        order: newOrder,
      });
    } catch {
      loadData(); // revert on failure
    }
  };

  const openNewTask = (columnId) => {
    setActiveTask(null);
    setActiveColumn(columnId);
    setShowModal(true);
  };

  const openEditTask = (task) => {
    setActiveTask(task);
    setActiveColumn(task.columnId);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setActiveTask(null);
  };

  const handleSaved = () => {
    closeModal();
    loadData();
  };

  if (!project) return <div className="page-loading">Loading board...</div>;

  return (
    <div>
      <Navbar />
      <div className="board-header">
        <div>
          <h1>{project.name}</h1>
          <p className="subtitle">{project.description}</p>
        </div>
        <div className="filters">
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
            <option value="">All assignees</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All priorities</option>
            {Object.keys(PRIORITY_COLORS).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board">
          {columns.map((col) => (
            <div className="column" key={col.id}>
              <div className="column-header">
                <h3>{col.name}</h3>
                <span className="count">{tasksByColumn[col.id]?.length || 0}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    className={`column-body ${snapshot.isDraggingOver ? "drag-over" : ""}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {(tasksByColumn[col.id] || []).map((task, index) => (
                      <Draggable draggableId={task._id} index={index} key={task._id}>
                        {(provided, snapshot) => (
                          <div
                            className={`task-card ${snapshot.isDragging ? "dragging" : ""}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => openEditTask(task)}
                          >
                            <div
                              className="priority-bar"
                              style={{ background: PRIORITY_COLORS[task.priority] }}
                            />
                            <div className="task-type">{task.type}</div>
                            <h4>{task.title}</h4>
                            {task.labels?.length > 0 && (
                              <div className="label-row">
                                {task.labels.map((l) => (
                                  <span key={l} className="label-chip">{l}</span>
                                ))}
                              </div>
                            )}
                            <div className="task-footer">
                              <div className="avatars">
                                {task.assignees?.slice(0, 3).map((a) => (
                                  <span key={a._id} className="avatar-dot" title={a.name}>
                                    {a.name?.[0]?.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                              {task.dueDate && (
                                <span className="due-date">
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {task.subtasks?.length > 0 && (
                                <span className="subtask-count">
                                  {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <button className="add-task-btn" onClick={() => openNewTask(col.id)}>+ Add task</button>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showModal && (
        <TaskModal
          task={activeTask}
          projectId={projectId}
          columnId={activeColumn}
          members={members}
          onClose={closeModal}
          onSaved={handleSaved}
          onDeleted={handleSaved}
        />
      )}
    </div>
  );
};

export default ProjectBoard;
