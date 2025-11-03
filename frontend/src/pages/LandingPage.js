import React from "react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = () => navigate("/login");
  const handleSignup = () => navigate("/signup");

  return (
    <div style={styles.container}>
      {/* ---------- Navbar ---------- */}
      <header style={styles.header}>
        <h2 style={styles.logo}>Track Your Subscriptions</h2>
        <div style={styles.navButtons}>
          <button style={styles.button} onClick={handleSignup}>
            Sign Up
          </button>
          <button style={styles.buttonOutline} onClick={handleLogin}>
            Login
          </button>
        </div>
      </header>

      {/* ---------- Hero Section ---------- */}
      <main style={styles.main}>
        <h1 style={styles.tagline}>
          Manage all your subscriptions effortlessly in one place.
        </h1>
        <p style={styles.subtitle}>
          Stay organized, track renewals, and never miss a billing date again!
        </p>
        <button style={styles.ctaButton} onClick={handleLogin}>
          Get Started →
        </button>
      </main>
    </div>
  );
}

// ---------- CSS Styles ----------
const styles = {
  container: {
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(to bottom right, #e3f2fd, #bbdefb)",
    minHeight: "100vh",
    color: "#0d47a1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  header: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 50px",
    backgroundColor: "white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  },

  logo: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#0d47a1",
  },

  navButtons: {
    display: "flex",
    gap: "10px",
  },

  button: {
    padding: "8px 18px",
    backgroundColor: "#0d47a1",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "0.95rem",
    transition: "0.2s ease",
  },

  buttonOutline: {
    padding: "8px 18px",
    backgroundColor: "white",
    color: "#0d47a1",
    border: "2px solid #0d47a1",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "0.95rem",
    transition: "0.2s ease",
  },

  main: {
    flex: 1,
    textAlign: "center",
    marginTop: "100px",
    maxWidth: "600px",
  },

  tagline: {
    fontSize: "2.5rem",
    fontWeight: "600",
    marginBottom: "20px",
  },

  subtitle: {
    fontSize: "1.1rem",
    color: "#1a237e",
    marginBottom: "40px",
  },

  ctaButton: {
    padding: "12px 30px",
    backgroundColor: "#0d47a1",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "1.1rem",
    cursor: "pointer",
    transition: "0.3s ease",
  },
};

// Add hover effects using inline styles
styles.button[':hover'] = { backgroundColor: "#1565c0" };
styles.buttonOutline[':hover'] = {
  backgroundColor: "#e3f2fd",
  borderColor: "#1565c0",
};
styles.ctaButton[':hover'] = { backgroundColor: "#1565c0" };

export default LandingPage;
