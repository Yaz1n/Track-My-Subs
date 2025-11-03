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

  // Helper to clean formData for API
  const preparePayload = (data) => {
    const payload = {};

    if (data.name?.trim()) payload.name = data.name.trim();
    if (data.cost) payload.cost = parseFloat(data.cost);
    if (data.billing_cycle) payload.billing_cycle = data.billing_cycle;
    if (data.custom_cycle_days) payload.custom_cycle_days = parseInt(data.custom_cycle_days);
    if (data.next_billing_date) payload.next_billing_date = data.next_billing_date; // "2025-11-03"
    if (data.payment_method?.trim()) payload.payment_method = data.payment_method.trim();
    if (data.category_id?.trim()) payload.category_id = data.category_id.trim();
    if (data.logo_url?.trim()) payload.logo_url = data.logo_url.trim();
    if (data.notes !== undefined) payload.notes = data.notes.trim();

    return payload;
  };

  // ------------------- Update -------------------
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

  // ------------------- Add -------------------
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = preparePayload(formData);

      // Required fields check
      if (!payload.name || !payload.cost || !payload.next_billing_date || !payload.billing_cycle) {
        alert("Please fill all required fields!");
        return;
      }

      // custom_cycle_days only required if billing_cycle === "custom"
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>All Active Subscriptions</h2>
        <button style={styles.addButton} onClick={() => setAddingSub(true)}>+ Add Subscription</button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : subscriptions.length === 0 ? (
        <p>No active subscriptions found.</p>
      ) : (
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
            {subscriptions.map((sub) => (
              <tr key={sub._id}>
                <td>{sub.name}</td>
                <td>${sub.cost}</td>
                <td>{sub.billing_cycle}</td>
                <td>{sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : "-"}</td>
                <td>{sub.payment_method || "-"}</td>
                <td>{sub.notes || "-"}</td>
                <td>
                  <button style={{ ...styles.actionButton, backgroundColor: "#2196f3" }} onClick={() => handleUpdateClick(sub)}>Update</button>
                  <button style={{ ...styles.actionButton, backgroundColor: "#f44336" }} onClick={() => handleDelete(sub._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Edit Subscription Modal */}
      {editingSub && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Edit Subscription</h3>
            <form onSubmit={handleUpdateSubmit}>
              <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Name" style={styles.input} required />
              <input name="cost" type="number" step="0.01" min="0.01" value={formData.cost} onChange={handleInputChange} placeholder="Cost" style={styles.input} required />
              <select name="billing_cycle" value={formData.billing_cycle} onChange={handleInputChange} style={styles.input} required>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
              {formData.billing_cycle === "custom" && (
                <input name="custom_cycle_days" type="number" min="1" value={formData.custom_cycle_days} onChange={handleInputChange} placeholder="Custom Cycle Days" style={styles.input} />
              )}
              <input name="next_billing_date" type="date" value={formData.next_billing_date} onChange={handleInputChange} style={styles.input} />
              <input name="payment_method" value={formData.payment_method} onChange={handleInputChange} placeholder="Payment Method" style={styles.input} />
              <input name="category_id" value={formData.category_id} onChange={handleInputChange} placeholder="Category ID" style={styles.input} />
              <input name="logo_url" value={formData.logo_url} onChange={handleInputChange} placeholder="Logo URL" style={styles.input} />
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Notes" rows="3" style={styles.input} />
              <div>
                <button type="submit" style={styles.saveButton}>Save</button>
                <button type="button" onClick={() => setEditingSub(null)} style={styles.cancelButton}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {addingSub && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Add New Subscription</h3>
            <form onSubmit={handleAddSubmit}>
              <input name="name" value={formData.name} onChange={handleInputChange} placeholder="Name" style={styles.input} required />
              <input name="cost" type="number" step="0.01" min="0.01" value={formData.cost} onChange={handleInputChange} placeholder="Cost" style={styles.input} required />
              <select name="billing_cycle" value={formData.billing_cycle} onChange={handleInputChange} style={styles.input} required>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
              {formData.billing_cycle === "custom" && (
                <input name="custom_cycle_days" type="number" min="1" value={formData.custom_cycle_days} onChange={handleInputChange} placeholder="Custom Cycle Days" style={styles.input} />
              )}
              <input name="next_billing_date" type="date" value={formData.next_billing_date} onChange={handleInputChange} style={styles.input} required />
              <input name="payment_method" value={formData.payment_method} onChange={handleInputChange} placeholder="Payment Method" style={styles.input} />
              <input name="category_id" value={formData.category_id} onChange={handleInputChange} placeholder="Category ID" style={styles.input} />
              <input name="logo_url" value={formData.logo_url} onChange={handleInputChange} placeholder="Logo URL" style={styles.input} />
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Notes" rows="3" style={styles.input} />
              <div>
                <button type="submit" style={styles.saveButton}>Add</button>
                <button type="button" onClick={() => setAddingSub(false)} style={styles.cancelButton}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { textAlign: "center", padding: "20px" },
  table: { width: "90%", margin: "20px auto", borderCollapse: "collapse", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" },
  error: { color: "red", fontWeight: "bold" },
  actionButton: { border: "none", color: "white", padding: "6px 12px", marginRight: "6px", borderRadius: "4px", cursor: "pointer", fontSize: "14px" },
  addButton: { backgroundColor: "#4caf50", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "14px" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "white", padding: "20px", borderRadius: "8px", width: "350px", textAlign: "left", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
  input: { display: "block", width: "100%", marginBottom: "10px", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" },
  saveButton: { backgroundColor: "#4caf50", color: "white", border: "none", padding: "8px 14px", marginRight: "8px", borderRadius: "4px", cursor: "pointer", fontSize: "14px" },
  cancelButton: { backgroundColor: "#f44336", color: "white", border: "none", padding: "8px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "14px" },
};

export default ViewAllSubscriptions;
