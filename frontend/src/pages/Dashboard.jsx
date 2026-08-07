import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const canCreate = user.role === "admin" || user.role === "project_manager";

  const loadProjects = async () => {
    const { data } = await api.get("/projects");
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post("/projects", { name, description });
    setName("");
    setDescription("");
    setShowForm(false);
    loadProjects();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this project? This can't be undone from the UI.")) return;
    await api.delete(`/projects/${id}`);
    loadProjects();
  };

  const handleClone = async (id) => {
    await api.post(`/projects/${id}/clone`);
    loadProjects();
  };

  const handleArchive = async (id) => {
    await api.put(`/projects/${id}/archive`);
    loadProjects();
  };

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <div className="page-header">
          <h1>Your Projects</h1>
          {canCreate && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : "+ New Project"}
            </button>
          )}
        </div>

        {showForm && (
          <form className="inline-form" onSubmit={handleCreate}>
            <input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button type="submit" className="btn-primary">Create</button>
          </form>
        )}

        {loading ? (
          <p>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="empty-state">No projects yet. {canCreate && "Create your first one above."}</p>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <div key={p._id} className={`project-card ${p.isArchived ? "archived" : ""}`}>
                <h3 onClick={() => navigate(`/projects/${p._id}`)}>{p.name}</h3>
                <p>{p.description || "No description"}</p>
                <div className="project-meta">
                  <span>{p.members.length + 1} members</span>
                  {p.isArchived && <span className="badge">Archived</span>}
                </div>
                <div className="project-actions">
                  <button onClick={() => navigate(`/projects/${p._id}`)}>Open</button>
                  {canCreate && (
                    <>
                      <button onClick={() => handleClone(p._id)}>Clone</button>
                      <button onClick={() => handleArchive(p._id)}>
                        {p.isArchived ? "Unarchive" : "Archive"}
                      </button>
                      <button className="btn-danger" onClick={() => handleDelete(p._id)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
