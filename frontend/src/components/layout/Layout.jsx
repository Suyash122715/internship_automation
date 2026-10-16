import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, activeTab, setActiveTab, health, onRefresh, loading }) {
  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Header health={health} onRefresh={onRefresh} loading={loading} />
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
