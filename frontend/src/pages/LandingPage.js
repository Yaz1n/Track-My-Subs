import React from "react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = () => navigate("/login");
  const handleSignup = () => navigate("/signup");

  return (
    <div style={styles.container}>
      {/* ---------- Decorative Circles ---------- */}
      <div style={styles.circle1}></div>
      <div style={styles.circle2}></div>

      {/* ---------- Navbar ---------- */}
      <header style={styles.header}>
        <h2 style={styles.logo}>💳 Track Your Subscriptions</h2>
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
        <span style={styles.badge}>🌟 Your Financial Peace of Mind</span>
        <h1 style={styles.tagline}>
          Manage all your{" "}
          <span style={styles.gradientText}>subscriptions</span> effortlessly in
          one place.
        </h1>
        <p style={styles.subtitle}>
          Stay organized, track renewals, and never miss a billing date again!
        </p>
        <button style={styles.ctaButton} onClick={handleLogin}>
          Get Started →
        </button>

        {/* ---------- Feature Cards ---------- */}
        <div style={styles.features}>
          <div style={styles.card}>
            <div style={styles.icon}>⏰</div>
            <h3 style={styles.cardTitle}>Never Miss Renewals</h3>
            <p style={styles.cardText}>
              Get timely reminders before any subscription renews.
            </p>
          </div>

          <div style={styles.card}>
            <div style={styles.icon}>📊</div>
            <h3 style={styles.cardTitle}>Visualize Spending</h3>
            <p style={styles.cardText}>
              Track how much you spend across all your subscriptions.
            </p>
          </div>

          <div style={styles.card}>
            <div style={styles.icon}>🔒</div>
            <h3 style={styles.cardTitle}>Secure & Private</h3>
            <p style={styles.cardText}>
              Your financial data stays protected with top-level encryption.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------- CSS Styles ----------
const styles = {
  container: {
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(135deg, #7f00ff, #e100ff)",
    minHeight: "100vh",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },

  // Floating Decorative Circles
  circle1: {
    position: "absolute",
    top: "10%",
    left: "15%",
    width: "200px",
    height: "200px",
    background: "rgba(255, 255, 255, 0.2)",
    borderRadius: "50%",
    filter: "blur(80px)",
  },
  circle2: {
    position: "absolute",
    bottom: "10%",
    right: "15%",
    width: "250px",
    height: "250px",
    background: "rgba(255, 255, 255, 0.15)",
    borderRadius: "50%",
    filter: "blur(100px)",
  },

  // Navbar with Glassmorphism
  header: {
    width: "90%",
    maxWidth: "1200px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 40px",
    background: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(10px)",
    borderRadius: "15px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    marginTop: "25px",
    zIndex: 2,
  },

  logo: {
    margin: 0,
    fontSize: "1.6rem",
    fontWeight: "700",
    letterSpacing: "0.5px",
    color: "#fff",
  },

  navButtons: {
    display: "flex",
    gap: "12px",
  },

  button: {
    padding: "10px 20px",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.5)",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.95rem",
    transition: "all 0.3s ease",
  },

  buttonOutline: {
    padding: "10px 20px",
    backgroundColor: "transparent",
    color: "#fff",
    border: "2px solid white",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.95rem",
    transition: "all 0.3s ease",
  },

  main: {
    flex: 1,
    textAlign: "center",
    marginTop: "80px",
    maxWidth: "700px",
    zIndex: 2,
  },

  badge: {
    display: "inline-block",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    padding: "8px 16px",
    borderRadius: "20px",
    fontWeight: "500",
    marginBottom: "20px",
    fontSize: "0.95rem",
    letterSpacing: "0.5px",
    backdropFilter: "blur(10px)",
  },

  tagline: {
    fontSize: "2.8rem",
    fontWeight: "700",
    marginBottom: "20px",
    lineHeight: "1.3",
  },

  gradientText: {
    background: "linear-gradient(90deg, #ff9a9e, #fad0c4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  subtitle: {
    fontSize: "1.2rem",
    color: "#f3e5f5",
    marginBottom: "40px",
  },

  ctaButton: {
    padding: "14px 34px",
    backgroundColor: "#fff",
    color: "#7f00ff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1.1rem",
    cursor: "pointer",
    fontWeight: "600",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    transition: "all 0.3s ease",
  },

  // Feature cards section
  features: {
    display: "flex",
    justifyContent: "center",
    gap: "25px",
    flexWrap: "wrap",
    marginTop: "80px",
  },

  card: {
    background: "rgba(255, 255, 255, 0.15)",
    backdropFilter: "blur(12px)",
    borderRadius: "16px",
    padding: "30px 25px",
    width: "260px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    textAlign: "center",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },

  icon: {
    fontSize: "2rem",
    marginBottom: "10px",
  },

  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: "600",
    marginBottom: "10px",
  },

  cardText: {
    fontSize: "0.95rem",
    color: "#f3e5f5",
  },
};

// ---------- Hover Effects ----------
styles.button["onMouseEnter"] = (e) =>
  (e.target.style.backgroundColor = "rgba(255,255,255,0.4)");
styles.button["onMouseLeave"] = (e) =>
  (e.target.style.backgroundColor = "rgba(255,255,255,0.25)");

styles.buttonOutline["onMouseEnter"] = (e) =>
  (e.target.style.backgroundColor = "rgba(255,255,255,0.15)");
styles.buttonOutline["onMouseLeave"] = (e) =>
  (e.target.style.backgroundColor = "transparent");

styles.ctaButton["onMouseEnter"] = (e) => {
  e.target.style.transform = "scale(1.05)";
  e.target.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
};
styles.ctaButton["onMouseLeave"] = (e) => {
  e.target.style.transform = "scale(1)";
  e.target.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
};

export default LandingPage;
