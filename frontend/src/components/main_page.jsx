import React, { useState } from 'react';
import { FaUser, FaBook, FaFolder, FaCalendar, FaShieldAlt, FaTrash, FaMoon, FaSun } from 'react-icons/fa';

export default function MainPage() {
  const [darkMode, setDarkMode] = useState(false);

  const menuItems = [
    { icon: FaUser, label: 'Profile' },
    { icon: FaBook, label: 'Diary' },
    { icon: FaFolder, label: 'Diary Folder' },
    { icon: FaCalendar, label: 'Schedule' },
    { icon: FaShieldAlt, label: 'Privacy Policy' },
    { icon: FaTrash, label: 'Bin' },
  ];

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <div className={`w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col p-8`}>
        {/* Logo */}
        <h1 className={`text-3xl font-black mb-12 ${darkMode ? 'text-white' : 'text-gray-900'}`}>KickLog</h1>

        {/* Menu Items */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${
                darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            darkMode
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          {darkMode ? (
            <FaSun size={18} />
          ) : (
            <FaMoon size={18} />
          )}
          <span>Dark mode</span>
        </button>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`} />
    </div>
  );
}
