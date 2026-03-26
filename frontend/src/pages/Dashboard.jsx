/** Dashboard page: application pipeline view (stub). */

import { useState } from "react";

import ManualAddForm from "../components/ManualAddForm";

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Application
        </button>
      </div>
      <ManualAddForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </main>
  );
}

export default Dashboard;
