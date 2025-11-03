import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function DashboardLayout({ children }) {
  const navigate = useNavigate();
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <button style={styles.navButton}>Settings</button>
          <button style={styles.navButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div style={styles.navRight}>Track-Your-Subscription</div>
      </nav>

      {/* Sidebar */}
      {sidebarVisible && (
        <aside style={styles.sidebar}>
          <button
            style={styles.toggleSidebar}
            onClick={() => setSidebarVisible(false)}
          >
            &lt;
          </button>
          <ul style={styles.sidebarList}>
            <li>View All Subscriptions</li>
          </ul>
        </aside>
      )}
      {!sidebarVisible && (
        <button
          style={styles.showSidebarButton}
          onClick={() => setSidebarVisible(true)}
        >
          &gt;
        </button>
      )}

      {/* Main Content */}
      <main style={{ ...styles.main, marginLeft: sidebarVisible ? 220 : 40 }}>
        {children}
      </main>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
  },
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "60px",
    backgroundColor: "#1976d2",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
    zIndex: 1000,
  },
  navLeft: {
    display: "flex",
    gap: "10px",
  },
  navRight: {
    fontWeight: "bold",
    fontSize: "18px",
  },
  navButton: {
    backgroundColor: "#1565c0",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "6px 12px",
    cursor: "pointer",
  },
  sidebar: {
    position: "fixed",
    top: "60px",
    left: 0,
    width: "200px",
    bottom: 0,
    backgroundColor: "#f4f4f4",
    padding: "10px",
    boxShadow: "2px 0px 6px rgba(0,0,0,0.1)",
    transition: "width 0.3s",
    zIndex: 900,
  },
  toggleSidebar: {
    backgroundColor: "#ccc",
    border: "none",
    padding: "5px 8px",
    cursor: "pointer",
    marginBottom: "10px",
  },
  showSidebarButton: {
    position: "fixed",
    top: "80px",
    left: 0,
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    padding: "5px 10px",
    cursor: "pointer",
    zIndex: 1000,
    borderTopRightRadius: "4px",
    borderBottomRightRadius: "4px",
  },
  sidebarList: {
    listStyle: "none",
    padding: 0,
  },
  main: {
    marginTop: "60px",
    padding: "20px",
    transition: "margin-left 0.3s",
  },
};

export default DashboardLayout;
