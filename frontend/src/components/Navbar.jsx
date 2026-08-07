import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="brand">ProjectFlow</Link>
      {user && (
        <div className="nav-right">
          <span className="role-badge">{user.role.replace("_", " ")}</span>
          <span className="user-name">{user.name}</span>
          <button onClick={handleLogout} className="btn-ghost">Logout</button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
