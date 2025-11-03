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

  // Top 5 most expensive subscriptions (monthly equivalent)
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
        <p style={styles.error}>{error}</p>
      ) : loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h2>Welcome, {userData.email}</h2>
          <p>{userData.message}</p>

          {/* Row 1: Totals */}
          <div style={styles.row}>
            <div style={styles.card}>
              <h3>Total Monthly Spending</h3>
              <p>${totalMonthly.toFixed(2)}</p>
            </div>
            <div style={styles.card}>
              <h3>Total Yearly Spending</h3>
              <p>${totalYearly.toFixed(2)}</p>
            </div>
            <div style={styles.card}>
              <h3>Active Subscriptions</h3>
              <p>{activeCount}</p>
            </div>
          </div>

          {/* Row 2: Upcoming renewals & Top 5 subscriptions */}
          <div style={styles.row}>
            {/* Upcoming Renewals */}
            <div style={styles.tableCard}>
              <h3>Upcoming Renewals (Next 7 Days)</h3>
              {upcomingRenewals.length === 0 ? (
                <p>No renewals in the next 7 days.</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Cost</th>
                      <th>Billing Cycle</th>
                      <th>Next Billing Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingRenewals.map(sub => (
                      <tr key={sub._id}>
                        <td>{sub.name}</td>
                        <td>${sub.cost}</td>
                        <td>{sub.billing_cycle}</td>
                        <td>{new Date(sub.next_billing_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Top 5 Most Expensive */}
            <div style={styles.tableCard}>
              <h3>Top 5 Most Expensive Subscriptions</h3>
              {subsWithMonthlyCost.length === 0 ? (
                <p>No subscriptions yet.</p>
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
                    {subsWithMonthlyCost.map(sub => (
                      <tr key={sub._id}>
                        <td>{sub.name}</td>
                        <td>${sub.monthlyEquivalent.toFixed(2)}</td>
                        <td>{((sub.monthlyEquivalent / totalMonthly) * 100).toFixed(2)}%</td>
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
    textAlign: "center",
    marginTop: "50px",
    fontFamily: "Arial, sans-serif",
  },
  error: {
    color: "red",
  },
  row: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginTop: "20px",
    flexWrap: "wrap",
  },
  card: {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "20px",
    width: "200px",
    boxShadow: "0px 2px 6px rgba(0,0,0,0.1)",
  },
  tableCard: {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "15px",
    width: "45%",
    boxShadow: "0px 2px 6px rgba(0,0,0,0.1)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
};

export default DashboardContent;
