import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

function DashboardContent() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("access_token");

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const resUser = await fetch("http://127.0.0.1:8000/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await resUser.json();
      if (!resUser.ok) throw new Error(user.detail || "Unauthorized");
      setUserData(user);

      const resSubs = await fetch("http://127.0.0.1:8000/dashboard/subscriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subsData = await resSubs.json();
      if (!resSubs.ok) throw new Error(subsData.detail || "Failed to fetch subscriptions");
      setSubscriptions(subsData.subscriptions || []);
    } catch (err) {
      setError(err.message);
      localStorage.removeItem("access_token");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Totals
  const totalMonthly = subscriptions
    .filter(sub => sub.is_active)
    .reduce((acc, sub) => {
      if (sub.billing_cycle === "monthly") return acc + sub.cost;
      if (sub.billing_cycle === "yearly") return acc + sub.cost / 12;
      if (sub.billing_cycle === "custom" && sub.custom_cycle_days)
        return acc + (sub.cost / sub.custom_cycle_days) * 30;
      return acc;
    }, 0);

  const totalYearly = subscriptions
    .filter(sub => sub.is_active)
    .reduce((acc, sub) => {
      if (sub.billing_cycle === "monthly") return acc + sub.cost * 12;
      if (sub.billing_cycle === "yearly") return acc + sub.cost;
      if (sub.billing_cycle === "custom" && sub.custom_cycle_days)
        return acc + (sub.cost / sub.custom_cycle_days) * 365;
      return acc;
    }, 0);

  const activeCount = subscriptions.filter(sub => sub.is_active).length;

  // Upcoming renewals (next 7 days)
  const today = new Date();
  const next7Days = new Date(today);
  next7Days.setDate(today.getDate() + 7);

  const upcomingRenewals = subscriptions
    .filter(sub => {
      if (!sub.next_billing_date) return false;
      const billingDate = new Date(sub.next_billing_date);
      return billingDate >= today && billingDate <= next7Days && sub.is_active;
    })
    .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date));

  // Top 5 most expensive subscriptions
  const subsWithMonthlyCost = subscriptions
    .filter(sub => sub.is_active)
    .map(sub => {
      let monthlyEquivalent = 0;
      if (sub.billing_cycle === "monthly") monthlyEquivalent = sub.cost;
      else if (sub.billing_cycle === "yearly") monthlyEquivalent = sub.cost / 12;
      else if (sub.billing_cycle === "custom" && sub.custom_cycle_days)
        monthlyEquivalent = (sub.cost / sub.custom_cycle_days) * 30;
      return { ...sub, monthlyEquivalent };
    })
    .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
    .slice(0, 5);

  return (
    <div style={styles.container}>
      {error ? (
        <p style={styles.error}>⚠️ {error}</p>
      ) : loading ? (
        <p style={styles.loading}>Loading your dashboard...</p>
      ) : (
        <>
          <h1 style={styles.title}>Welcome, {userData.email}</h1>
          <p style={styles.subtitle}>{userData.message}</p>

          {/* ---------- Stats Row ---------- */}
          <div style={styles.row}>
            <div style={{ ...styles.card, ...styles.cardPurple }}>
              <div style={styles.icon}>💰</div>
              <h3>Total Monthly Spending</h3>
              <p style={styles.metric}>${totalMonthly.toFixed(2)}</p>
            </div>

            <div style={{ ...styles.card, ...styles.cardBlue }}>
              <div style={styles.icon}>📆</div>
              <h3>Total Yearly Spending</h3>
              <p style={styles.metric}>${totalYearly.toFixed(2)}</p>
            </div>

            <div style={{ ...styles.card, ...styles.cardGreen }}>
              <div style={styles.icon}>🟢</div>
              <h3>Active Subscriptions</h3>
              <p style={styles.metric}>{activeCount}</p>
            </div>
          </div>

          {/* ---------- Tables Row ---------- */}
          <div style={styles.row}>
            {/* Upcoming Renewals */}
            <div style={styles.tableCard}>
              <h3 style={styles.tableTitle}>🔔 Upcoming Renewals (Next 7 Days)</h3>
              {upcomingRenewals.length === 0 ? (
                <p style={styles.emptyState}>🎉 No renewals in the next 7 days!</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Cost</th>
                      <th>Cycle</th>
                      <th>Next Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingRenewals.map((sub, i) => (
                      <tr key={sub._id} style={i % 2 === 0 ? styles.altRow : {}}>
                        <td>{sub.name}</td>
                        <td>${sub.cost}</td>
                        <td>
                          <span style={styles.badge}>{sub.billing_cycle}</span>
                        </td>
                        <td>{new Date(sub.next_billing_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top 5 Expensive */}
            <div style={styles.tableCard}>
              <h3 style={styles.tableTitle}>💎 Top 5 Most Expensive Subscriptions</h3>
              {subsWithMonthlyCost.length === 0 ? (
                <p style={styles.emptyState}>🪙 No subscriptions yet!</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Monthly Cost</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subsWithMonthlyCost.map((sub, i) => (
                      <tr key={sub._id} style={i % 2 === 0 ? styles.altRow : {}}>
                        <td>{sub.name}</td>
                        <td>${sub.monthlyEquivalent.toFixed(2)}</td>
                        <td style={{ width: "35%" }}>
                          <div style={styles.progressBarContainer}>
                            <div
                              style={{
                                ...styles.progressBar,
                                width: `${(
                                  (sub.monthlyEquivalent / totalMonthly) *
                                  100
                                ).toFixed(2)}%`,
                              }}
                            ></div>
                          </div>
                          <span>
                            {((sub.monthlyEquivalent / totalMonthly) * 100).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #7f00ff, #e100ff)",
    color: "#fff",
    padding: "60px 20px",
    fontFamily: "'Poppins', sans-serif",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "10px",
    fontWeight: "700",
  },
  subtitle: {
    color: "#e0d7f8",
    marginBottom: "40px",
  },
  loading: {
    fontSize: "1.2rem",
  },
  row: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "25px",
    marginTop: "30px",
  },
  card: {
    borderRadius: "20px",
    padding: "25px",
    width: "260px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
    textAlign: "center",
    color: "#fff",
    transition: "transform 0.3s ease, box-shadow 0.3s ease",
  },
  cardPurple: {
    background: "linear-gradient(135deg, #9d50bb, #6e48aa)",
  },
  cardBlue: {
    background: "linear-gradient(135deg, #00c6ff, #0072ff)",
  },
  cardGreen: {
    background: "linear-gradient(135deg, #43e97b, #38f9d7)",
  },
  icon: {
    fontSize: "2rem",
    marginBottom: "10px",
  },
  metric: {
    fontSize: "1.5rem",
    fontWeight: "600",
  },
  tableCard: {
    background: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    padding: "20px",
    width: "45%",
    minWidth: "350px",
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
  },
  tableTitle: {
    fontSize: "1.2rem",
    marginBottom: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    background: "transparent",
  },
  altRow: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.25)",
    color: "#fff",
    fontSize: "0.85rem",
    textTransform: "capitalize",
  },
  progressBarContainer: {
    width: "100%",
    height: "6px",
    background: "rgba(255,255,255,0.2)",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "4px",
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #ff9a9e, #fad0c4)",
  },
  emptyState: {
    textAlign: "center",
    fontStyle: "italic",
    color: "#f5e1ff",
  },
  error: {
    color: "red",
    fontWeight: "bold",
  },
};

export default DashboardContent;
