import React, { useEffect, useState, useCallback } from "react";

function ViewAllSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingSub, setEditingSub] = useState(null);
  const [addingSub, setAddingSub] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cost: "",
    billing_cycle: "monthly",
    custom_cycle_days: "",
    next_billing_date: "",
    payment_method: "",
    category_id: "",
    logo_url: "",
    notes: "",
  });

  const token = localStorage.getItem("access_token");

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/dashboard/subscriptions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch subscriptions");
      setSubscriptions(data.subscriptions.filter((s) => s.is_active));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subscription?")) return;
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/dashboard/subscription/${id}?confirm=true`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete subscription");
      alert(`✅ ${data.message}`);
      await fetchSubscriptions();
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  };

  const handleUpdateClick = (sub) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      cost: sub.cost,
      billing_cycle: sub.billing_cycle,
      custom_cycle_days: sub.custom_cycle_days || "",
      next_billing_date: sub.next_billing_date?.split("T")[0] || "",
      payment_method: sub.payment_method || "",
      category_id: sub.category_id || "",
      logo_url: sub.logo_url || "",
      notes: sub.notes || "",
    });
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const preparePayload = (data) => {
    const payload = {};
    if (data.name?.trim()) payload.name = data.name.trim();
    if (data.cost) payload.cost = parseFloat(data.cost);
    if (data.billing_cycle) payload.billing_cycle = data.billing_cycle;
    if (data.custom_cycle_days) payload.custom_cycle_days = parseInt(data.custom_cycle_days);
    if (data.next_billing_date) payload.next_billing_date = data.next_billing_date;
    if (data.payment_method?.trim()) payload.payment_method = data.payment_method.trim();
    if (data.category_id?.trim()) payload.category_id = data.category_id.trim();
    if (data.logo_url?.trim()) payload.logo_url = data.logo_url.trim();
    if (data.notes !== undefined) payload.notes = data.notes.trim();
    return payload;
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingSub) return;
    try {
      const updatePayload = preparePayload(formData);
      if (Object.keys(updatePayload).length === 0) {
        alert("No fields to update!");
        return;
      }
      const res = await fetch(
        `http://127.0.0.1:8000/dashboard/subscription/${editingSub._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatePayload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update subscription");
      alert(`✅ ${data.message}`);
      setEditingSub(null);
      await fetchSubscriptions();
    } catch (err) {
      alert(`❌ ${err.message}`);
      console.error("Update error:", err);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = preparePayload(formData);
      if (!payload.name || !payload.cost || !payload.next_billing_date || !payload.billing_cycle) {
        alert("Please fill all required fields!");
        return;
      }
      if (payload.billing_cycle === "custom" && !payload.custom_cycle_days) {
        alert("Please provide custom cycle days for custom billing cycle!");
        return;
      }
      const res = await fetch("http://127.0.0.1:8000/dashboard/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add subscription");
      alert(`✅ ${data.message}`);
      setAddingSub(false);
      setFormData({
        name: "",
        cost: "",
        billing_cycle: "monthly",
        custom_cycle_days: "",
        next_billing_date: "",
        payment_method: "",
        category_id: "",
        logo_url: "",
        notes: "",
      });
      await fetchSubscriptions();
    } catch (err) {
      alert(`❌ ${err.message}`);
      console.error("Add subscription error:", err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return (
    <div style={styles.container}>
      {/* ---------- Header ---------- */}
      <div style={styles.header}>
        <h2 style={styles.title}>📋 All Active Subscriptions</h2>
        <button style={styles.addButton} onClick={() => setAddingSub(true)}>
          + Add Subscription
        </button>
      </div>

      {/* ---------- Content ---------- */}
      {error && <p style={styles.error}>{error}</p>}
      {loading ? (
        <p style={styles.loading}>⏳ Loading your subscriptions...</p>
      ) : subscriptions.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyEmoji}>🎉</p>
          <p style={styles.emptyText}>No active subscriptions found</p>
          <button style={styles.addButton} onClick={() => setAddingSub(true)}>
            + Add your first one
          </button>
        </div>
      ) : (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Cost</th>
                <th>Billing Cycle</th>
                <th>Next Billing Date</th>
                <th>Payment</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub, i) => (
                <tr
                  key={sub._id}
                  style={{
                    background: i % 2 === 0 ? "#fafafa" : "rgba(255,255,255,0.4)",
                  }}
                >
                  <td>{sub.name}</td>
                  <td>${sub.cost}</td>
                  <td>
                    <span
                      style={{
                        ...styles.badge,
                        background:
                          sub.billing_cycle === "monthly"
                            ? "linear-gradient(45deg, #7e57c2, #9575cd)"
                            : sub.billing_cycle === "yearly"
                            ? "linear-gradient(45deg, #ec407a, #f48fb1)"
                            : "linear-gradient(45deg, #42a5f5, #64b5f6)",
                      }}
                    >
                      {sub.billing_cycle}
                    </span>
                  </td>
                  <td>
                    {sub.next_billing_date
                      ? new Date(sub.next_billing_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>{sub.payment_method || "-"}</td>
                  <td>{sub.notes || "-"}</td>
                  <td>
                    <button
                      style={{ ...styles.iconButton, backgroundColor: "#2196f3" }}
                      onClick={() => handleUpdateClick(sub)}
                    >
                      ✏️
                    </button>
                    <button
                      style={{ ...styles.iconButton, backgroundColor: "#f44336" }}
                      onClick={() => handleDelete(sub._id)}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Modals ---------- */}
      {(editingSub || addingSub) && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>{editingSub ? "✏️ Edit Subscription" : "➕ Add New Subscription"}</h3>
            <form
              onSubmit={editingSub ? handleUpdateSubmit : handleAddSubmit}
              style={styles.formGrid}
            >
              {[
                ["name", "text", "Name", true],
                ["cost", "number", "Cost", true],
                ["billing_cycle", "select", "Billing Cycle", true],
                ["custom_cycle_days", "number", "Custom Cycle Days", false],
                ["next_billing_date", "date", "Next Billing Date", true],
                ["payment_method", "text", "Payment Method", false],
                ["category_id", "text", "Category ID", false],
                ["logo_url", "text", "Logo URL", false],
              ].map(([name, type, label, required]) => {
                if (name === "billing_cycle")
                  return (
                    <div key={name} style={styles.formGroup}>
                      <label style={styles.label}>{label}</label>
                      <select
                        name={name}
                        value={formData[name]}
                        onChange={handleInputChange}
                        style={styles.input}
                        required={required}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                  );
                if (name === "custom_cycle_days" && formData.billing_cycle !== "custom")
                  return null;
                return (
                  <div key={name} style={styles.formGroup}>
                    <label style={styles.label}>{label}</label>
                    <input
                      name={name}
                      type={type}
                      value={formData[name]}
                      onChange={handleInputChange}
                      style={styles.input}
                      required={required}
                    />
                  </div>
                );
              })}
              <div style={{ gridColumn: "span 2" }}>
                <label style={styles.label}>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add notes..."
                  rows="3"
                  style={styles.textarea}
                />
              </div>
              <div style={styles.modalButtons}>
                <button type="submit" style={styles.saveButton}>
                  {editingSub ? "Save Changes" : "Add Subscription"}
                </button>
                <button
                  type="button"
                  onClick={() => (editingSub ? setEditingSub(null) : setAddingSub(false))}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Styles ---------- */
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
    color: "#fff",
    padding: "40px 20px",
    fontFamily: "'Poppins', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(10px)",
    borderRadius: "12px",
    padding: "15px 30px",
    marginBottom: "30px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  title: { fontWeight: "600", fontSize: "1.6rem" },
  addButton: {
    background: "linear-gradient(45deg, #ff4081, #f50057)",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  tableCard: {
    background: "rgba(255,255,255,0.2)",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    color: "black",
  },
  badge: {
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "0.85rem",
    textTransform: "capitalize",
  },
  iconButton: {
    border: "none",
    color: "#fff",
    padding: "6px 10px",
    marginRight: "6px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "transform 0.2s",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "white",
    color: "#333",
    padding: "30px",
    borderRadius: "12px",
    width: "500px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    marginTop: "10px",
  },
  label: { fontSize: "0.9rem", fontWeight: "600", marginBottom: "5px", display: "block" },
  input: {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "0.9rem",
  },
  textarea: {
    width: "100%",
    borderRadius: "6px",
    padding: "8px",
    border: "1px solid #ccc",
    fontSize: "0.9rem",
  },
  saveButton: {
    background: "linear-gradient(45deg, #7b1fa2, #ba68c8)",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  cancelButton: {
    background: "#f44336",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
  },
  modalButtons: {
    gridColumn: "span 2",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
  },
  emptyState: {
    marginTop: "100px",
    textAlign: "center",
  },
  emptyEmoji: { fontSize: "3rem", marginBottom: "10px" },
  emptyText: { fontSize: "1.2rem", marginBottom: "15px" },
};

export default ViewAllSubscriptions;
