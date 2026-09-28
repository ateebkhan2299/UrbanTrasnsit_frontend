import React, { useState } from 'react';
import { PageHeader, StatCard } from '../components/ui';
import { Ticket, DollarSign, Users, CreditCard, Search } from 'lucide-react';

export default function TicketManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const stats = [
    { label: "Total Revenue", value: "$42,500", trend: "+5.2%", icon: DollarSign },
    { label: "Tickets Sold", value: "12,450", trend: "+2.1%", icon: Ticket },
    { label: "Active Passes", value: "3,120", trend: "-1.0%", icon: Users },
    { label: "Card Payments", value: "85%", trend: "+1.5%", icon: CreditCard },
  ];

  const recentTransactions = [
    { id: "TXN-9021", user: "Alice Johnson", type: "Monthly Pass", amount: "$85.00", status: "Completed", date: "2 mins ago" },
    { id: "TXN-9022", user: "Bob Smith", type: "Single Trip", amount: "$2.50", status: "Completed", date: "5 mins ago" },
    { id: "TXN-9023", user: "Charlie Davis", type: "Weekly Pass", amount: "$25.00", status: "Pending", date: "12 mins ago" },
    { id: "TXN-9024", user: "Diana Prince", type: "Single Trip", amount: "$2.50", status: "Completed", date: "15 mins ago" },
    { id: "TXN-9025", user: "Evan Wright", type: "Student Pass", amount: "$45.00", status: "Failed", date: "22 mins ago" },
    { id: "TXN-9026", user: "Fiona Gallagher", type: "Single Trip", amount: "$2.50", status: "Completed", date: "30 mins ago" },
  ];

  const filteredTransactions = recentTransactions.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto text-white">
      <PageHeader 
        title="Ticket & Fare Management" 
        subtitle="Analyze transactional ticketing data across the transport network" 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <StatCard
            key={i}
            label={stat.label}
            value={stat.value}
            trend={stat.trend}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-[#111] border border-[#333] rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold">Recent Transactions</h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by ID or User..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#333] rounded focus:outline-none focus:border-[#E31E24]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#333] text-gray-400">
                <th className="pb-3 px-4">Transaction ID</th>
                <th className="pb-3 px-4">User</th>
                <th className="pb-3 px-4">Ticket Type</th>
                <th className="pb-3 px-4">Amount</th>
                <th className="pb-3 px-4">Date</th>
                <th className="pb-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((txn, i) => (
                <tr key={i} className="border-b border-[#222] hover:bg-[#1a1a1a]">
                  <td className="py-4 px-4 text-gray-300 font-mono">{txn.id}</td>
                  <td className="py-4 px-4">{txn.user}</td>
                  <td className="py-4 px-4 text-gray-400">{txn.type}</td>
                  <td className="py-4 px-4 font-bold">{txn.amount}</td>
                  <td className="py-4 px-4 text-gray-400">{txn.date}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      txn.status === 'Completed' ? 'bg-green-900/50 text-green-400' :
                      txn.status === 'Pending' ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No transactions found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
