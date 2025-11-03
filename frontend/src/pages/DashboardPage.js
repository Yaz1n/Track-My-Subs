import React from "react";
import DashboardLayout from "../components/DashboardLayout"; // adjust path
import DashboardContent from "./DashboardContent"; // move your main dashboard content here

function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}

export default DashboardPage;
