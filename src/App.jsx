import React, { useState } from "react";
import EsopTab from "./components/EsopTab.jsx";
import IncomeTaxTab from "./components/incometaxtab.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("esop"); // "esop" | "us-tax"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* sidebar / header here */}
      <main className="p-6">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab("esop")} className="px-3 py-2 bg-gray-100 rounded">ESOP</button>
          <button onClick={() => setActiveTab("us-tax")} className="px-3 py-2 bg-gray-100 rounded">US/CA Income Tax</button>
        </div>

        {activeTab === "esop" && <EsopTab />}
        {activeTab === "us-tax" && <IncomeTaxTab />}
      </main>
    </div>
  );
}
