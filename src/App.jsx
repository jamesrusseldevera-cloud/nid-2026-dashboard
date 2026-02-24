import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, CheckSquare, Users, Calendar, Mic2, DollarSign, 
  AlertTriangle, Menu, X, Clock, CheckCircle2, AlertCircle, 
  UserCheck, Lock, Unlock, Plus, Trash2, Edit2, ArrowRight, 
  Search, BarChart3, Filter, List, Columns, Save, Wifi, WifiOff, Table,
  Download, Upload, FileText, MapPin, Image as ImageIcon, Grid, Mail,
  Video, Link as LinkIcon, PieChart as PieChartIcon, Settings, Database, RotateCcw,
  CalendarClock, Hourglass, Bell, ChevronDown, ChevronUp, ExternalLink, ArrowUpDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, writeBatch 
} from "firebase/firestore";

// --- CONFIGURATION SECTION ---
const firebaseConfig = {
  apiKey: "AIzaSyDrNI40ZxqPiqMXqGYd__PxsPjAYBEg8xU",
  authDomain: "nid-2026.firebaseapp.com",
  projectId: "nid-2026",
  storageBucket: "nid-2026.firebasestorage.app",
  messagingSenderId: "1015576349659",
  appId: "1:1015576349659:web:58bca689b4a6d7e0a635fe"
};

const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
const db = isFirebaseConfigured ? getFirestore(app) : null;

// --- UTILITIES ---

const getColorClass = (str) => {
    if (!str || str === 'Unassigned') return 'bg-slate-100 text-slate-600 border-slate-200';
    const colors = [
      'bg-red-50 text-red-700 border-red-200', 'bg-orange-50 text-orange-700 border-orange-200',
      'bg-amber-50 text-amber-700 border-amber-200', 'bg-green-50 text-green-700 border-green-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200', 'bg-teal-50 text-teal-700 border-teal-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200', 'bg-blue-50 text-blue-700 border-blue-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200', 'bg-violet-50 text-violet-700 border-violet-200',
      'bg-purple-50 text-purple-700 border-purple-200', 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      'bg-pink-50 text-pink-700 border-pink-200', 'bg-rose-50 text-rose-700 border-rose-200'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const getStatusColor = (status) => {
    const s = String(status || '').trim();
    switch(s) {
      case 'Complete': return 'bg-green-50 border-green-200 text-green-700';
      case 'In Progress': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'Overdue': return 'bg-red-50 border-red-200 text-red-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
};

const getStatusBorder = (status) => {
    const s = String(status || '').trim();
    switch(s) {
      case 'Complete': return 'border-l-4 border-l-green-500';
      case 'In Progress': return 'border-l-4 border-l-blue-500';
      case 'Overdue': return 'border-l-4 border-l-red-500';
      default: return 'border-l-4 border-l-slate-300';
    }
};

const exportToCSV = (data, filename, notify) => {
  if (!data || data.length === 0) {
    notify("No data available to export.", 'error');
    return;
  }
  
  const cleanData = data.map(({ id, ...rest }) => rest);
  const headers = Object.keys(cleanData[0]);
  
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const row of cleanData) {
    const values = headers.map(header => {
      let val = row[header];
      if (Array.isArray(val)) val = val.join(', ');
      const escaped = String(val || '').replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  notify("Export successful!", 'success');
};

const downloadBackup = (allData) => {
    const jsonString = `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(allData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `nid_system_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
};

const parseCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  let headerIndex = 0;
  const knownKeywords = ['name', 'task', 'activity', 'role', 'committee', 'item', 'stakeholder', 'designation', 'date', 'day'];
  for(let i = 0; i < Math.min(lines.length, 15); i++) {
     const lineLower = lines[i].toLowerCase();
     if (knownKeywords.some(k => lineLower.includes(k))) {
         headerIndex = i;
         break;
     }
  }

  const parseLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for(let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else current += char;
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, '').trim());
  };

  const headers = parseLine(lines[headerIndex]).map(h => h.toLowerCase().replace(/\s+/g, ''));
  const originalHeaders = parseLine(lines[headerIndex]);

  return lines.slice(headerIndex + 1).map(line => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => {
        if (h) {
          obj[h] = values[i] || '';
          obj[originalHeaders[i]] = values[i] || ''; 
        }
    });
    return obj;
  });
};

const getDuration = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diff = e - s;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : 0;
};

const safeStr = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === 'object' && !Array.isArray(val)) {
    try { return JSON.stringify(val); } catch (e) { return "[Object]"; }
  }
  return String(val);
};

// --- SORTING UTILITY HOOK ---
const useSortableData = (items, config = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'priority') {
            const priorityMap = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
            const aVal = priorityMap[a.priority] || 0;
            const bVal = priorityMap[b.priority] || 0;
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }

        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (Array.isArray(aVal)) aVal = aVal.join(', ');
        if (Array.isArray(bVal)) bVal = bVal.join(', ');

        aVal = safeStr(aVal).toLowerCase();
        bVal = safeStr(bVal).toLowerCase();

        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum) && aVal.match(/^-?\d+(\.\d+)?$/) && bVal.match(/^-?\d+(\.\d+)?$/)) {
            if (aNum < bNum) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aNum > bNum) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

const SortableHeader = ({ label, sortKey, currentSort, requestSort, className = "" }) => {
    const isActive = currentSort?.key === sortKey;
    return (
        <th className={`p-4 cursor-pointer hover:bg-slate-200 transition-colors select-none group ${className}`} onClick={() => requestSort(sortKey)}>
            <div className="flex items-center gap-2">
                {label}
                <span className={`text-slate-400 group-hover:text-blue-500 transition-colors ${isActive ? 'text-blue-600' : 'opacity-40'}`}>
                    {isActive ? (currentSort.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} />}
                </span>
            </div>
        </th>
    );
};


// --- INITIAL DATA CONSTANTS ---
const INITIAL_COMMITTEES = [ "Executive Committee", "Programs", "Admin and Coordination", "Procurement and Logistics", "Media and Publicity", "Filipinnovation Awards" ];

const SECTORS = [
  "Startup/MSME", "Development Partner", "National Govt Agency", 
  "Academe/Research", "NEDA Regional", "NEDA Central", 
  "Resource Speaker", "HABI Mentor"
];

const SPEAKER_DAYS = ["Day 0", "Day 1", "Day 2 (Morning)", "Day 2 (Afternoon)", "VIPs Only"];
const SPEAKER_ASSIGNMENTS = [
  "TBD", "Opening Remarks", "Closing Remarks", "Scene Setter", 
  "Panelist", "Moderator", "Message from the President", 
  "Keynote Speech", "Message of Support", "Others"
];

const ASEAN_COUNTRIES = [
  { name: "Philippines", flag: "🇵🇭" }, { name: "Singapore", flag: "🇸🇬" },
  { name: "Malaysia", flag: "🇲🇾" }, { name: "Indonesia", flag: "🇮🇩" },
  { name: "Thailand", flag: "🇹🇭" }, { name: "Viet Nam", flag: "🇻🇳" },
  { name: "Brunei Darussalam", flag: "🇧🇳" }, { name: "Cambodia", flag: "🇰🇭" },
  { name: "Lao PDR", flag: "🇱🇦" }, { name: "Myanmar", flag: "🇲🇲" },
  { name: "Timor-Leste", flag: "🇹🇱" }, { name: "International / Other", flag: "🌐" }
];

const INITIAL_ORG = [
  { id: '1', role: "Event Director", name: "Diane Gail L. Maharjan", division: "OED", level: 1, photo: '' },
  { id: '2', role: "Event Lead", name: "James De Vera", division: "ICPD", level: 2, photo: '' },
  { id: '3', role: "Event Co-Lead", name: "Jovs Laureta", division: "ICPD", level: 2, photo: '' }
];
const INITIAL_TASKS = [];
const INITIAL_SPEAKERS = [];
const INITIAL_ATTENDEES = [];
const INITIAL_PROGRAM = [];
const INITIAL_MEETINGS = [];
const INITIAL_BUDGET = [];

// --- DATA SYNC HOOK ---
const useDataSync = (collectionName, initialData) => {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (items.length > 0) setData(items); 
      else setData(initialData);
    }, (error) => {
      console.error(`Error syncing ${collectionName}:`, error);
    });
    return () => unsubscribe();
  }, [collectionName]);

  const add = async (item) => {
    if (db) await addDoc(collection(db, collectionName), item);
    else setData(prev => [...prev, { ...item, id: Date.now().toString() }]);
  };

  const update = async (id, updates) => {
    if (db) await updateDoc(doc(db, collectionName, id), updates);
    else setData(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const remove = async (id) => {
    if (db) await deleteDoc(doc(db, collectionName, id));
    else setData(prev => prev.filter(item => item.id !== id));
  };
  
  const reset = () => setData(initialData);

  return { data, add, update, remove, reset };
};

// --- COMPONENT: TOAST NOTIFICATION ---
const Toast = ({ message, type, onClose }) => {
    if (!message) return null;
    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${type === 'error' ? 'bg-red-900 border-red-700 text-red-50' : type === 'success' ? 'bg-green-900 border-green-700 text-green-50' : 'bg-slate-900 border-slate-700 text-slate-50'}`}>
                {type === 'error' ? <AlertTriangle size={20}/> : type === 'success' ? <CheckCircle2 size={20}/> : <Bell size={20}/>}
                <span className="font-bold text-sm">{message}</span>
                <button onClick={onClose} className="ml-4 opacity-70 hover:opacity-100"><X size={16}/></button>
            </div>
        </div>
    );
};

// --- COMPONENT: DASHBOARD HOME ---
const DashboardHome = ({ tasks = [], setActiveTab, speakers = [], attendees = [], budget = [], isAdmin }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => safeStr(t.status).trim() === 'Complete').length;
  const overdueTasks = tasks.filter(t => safeStr(t.status).trim() === 'Overdue');
  const confirmedSpeakers = speakers.filter(s => safeStr(s.status).trim() === 'Confirmed').length;
  
  const confirmedGuests = attendees.reduce((acc, curr) => {
      if (curr.confirmed !== undefined) return acc + Number(curr.confirmed);
      return acc + (safeStr(curr.status).trim() === 'Confirmed' ? 1 : 0);
  }, 0);

  const totalSpent = budget.reduce((a, b) => a + Number(b.amount || 0), 0);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter(t => t.endDate === todayStr && safeStr(t.status).trim() !== 'Complete');
  const criticalTasks = tasks.filter(t => (t.priority === 'Critical' || safeStr(t.status).trim() === 'Overdue') && safeStr(t.status).trim() !== 'Complete');

  const overdueAssignees = useMemo(() => {
      const names = overdueTasks.flatMap(t => Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]);
      return [...new Set(names.filter(n => n && n !== 'Unassigned'))];
  }, [overdueTasks]);

  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const target = new Date("2026-04-28T00:00:00");
    const interval = setInterval(() => {
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) return clearInterval(interval);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {overdueAssignees.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 md:p-6 rounded-3xl flex items-center shadow-lg relative z-10 animate-in slide-in-from-top-4">
              <div className="bg-red-100 p-3 rounded-full mr-4 shrink-0 shadow-inner">
                  <AlertCircle size={28} className="text-red-600" />
              </div>
              <div>
                  <strong className="font-black block text-lg mb-1 leading-tight">Attention Required</strong>
                  <div className="text-sm font-medium">
                      The following team members have OVERDUE deliverables: 
                      <span className="font-black ml-2 text-red-900 bg-red-200/50 px-2 py-0.5 rounded border border-red-300 shadow-sm">{overdueAssignees.join(', ')}</span>
                  </div>
              </div>
              <button onClick={() => setActiveTab('tasks')} className="ml-auto bg-white border border-red-200 text-red-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-red-50 transition-colors shrink-0 hidden md:block">View Tasks</button>
          </div>
      )}

      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-8 md:p-12 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
             <div>
                <h1 className="text-4xl md:text-5xl font-black mb-2 leading-tight">AGOS ASEAN</h1>
                <p className="text-blue-400 text-2xl font-bold italic tracking-tight">AI for Growth, Opportunity, and Sustainability</p>
             </div>
             <div className="flex gap-4">
               {['days', 'hours', 'minutes'].map(unit => (
                 <div key={unit} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center min-w-[90px] border border-white/10">
                   <div className="text-3xl font-black">{timeLeft[unit] || 0}</div>
                   <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">{unit}</div>
                 </div>
               ))}
             </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[140px]">
               <div className="text-3xl font-black">{totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}%</div>
               <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Completion</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[140px]">
               <div className="text-3xl font-black text-blue-400">{confirmedSpeakers}</div>
               <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Confirmed VIPs</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[140px]">
               <div className="text-3xl font-black text-green-400">{confirmedGuests}</div>
               <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Confirmed Guests</div>
            </div>
            {isAdmin && (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 min-w-[160px]">
               <div className="text-2xl font-black text-emerald-400 mt-1">₱{(totalSpent/1000).toFixed(1)}k</div>
               <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">Budget Allocation</div>
            </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Critical Items Panel */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group flex flex-col h-96">
            <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
            <div className="flex justify-between items-center mb-4 pl-2">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <AlertTriangle className="text-red-500" size={20}/> Critical & Overdue Actions
                </h3>
                <span className="bg-red-100 text-red-700 font-black text-xs px-2 py-1 rounded-lg">{criticalTasks.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {criticalTasks.length > 0 ? (
                    criticalTasks.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-red-50/50 rounded-2xl border border-red-100 hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('tasks')}>
                            <div className="flex-1 pr-4">
                                <div className="font-bold text-slate-800 text-sm mb-1">{safeStr(t.name)}</div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-widest border ${getColorClass(t.committee)}`}>{safeStr(t.committee)}</span>
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-widest border ${getStatusColor(t.status)}`}>{safeStr(t.status)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex -space-x-2">
                                    {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, i) => (
                                        <div key={i} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${getColorClass(a)}`} title={a}>{safeStr(a).charAt(0)}</div>
                                    )) : <div className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${getColorClass(t.assignedTo)}`}>{safeStr(t.assignedTo).charAt(0)}</div>}
                                </div>
                                <span className="text-[10px] font-black text-slate-500">{t.endDate || 'No Due Date'}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                        <CheckCircle2 className="mb-2 opacity-50 text-green-500" size={32}/>
                        <p className="text-sm font-bold">No critical or overdue tasks!</p>
                    </div>
                )}
            </div>
          </div>

          {/* Due Today Panel */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group flex flex-col h-96">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
            <div className="flex justify-between items-center mb-4 pl-2">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    <Clock className="text-blue-500" size={20}/> Tasks Due Today
                </h3>
                <span className="bg-blue-100 text-blue-700 font-black text-xs px-2 py-1 rounded-lg">{dueTodayTasks.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {dueTodayTasks.length > 0 ? (
                    dueTodayTasks.map(t => (
                        <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('tasks')}>
                            <div className="flex-1 pr-4">
                                <div className="font-bold text-slate-700 text-sm mb-1">{safeStr(t.name)}</div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-widest border ${getColorClass(t.committee)}`}>{safeStr(t.committee)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <div className="flex -space-x-2">
                                    {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, i) => (
                                        <div key={i} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${getColorClass(a)}`} title={a}>{safeStr(a).charAt(0)}</div>
                                    )) : <div className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${getColorClass(t.assignedTo)}`}>{safeStr(t.assignedTo).charAt(0)}</div>}
                                </div>
                                <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md border ${getStatusColor(t.status)}`}>{safeStr(t.status)}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                        <CalendarClock className="mb-2 opacity-50" size={32}/>
                        <p className="text-sm font-bold">No tasks due today. Stay ahead!</p>
                    </div>
                )}
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Pending Items', val: totalTasks - completedTasks, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
           { label: 'Critical / Overdue', val: overdueTasks.length, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
           { label: 'Confirmed Guests', val: confirmedGuests, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
           { label: 'Speakers Confirmed', val: confirmedSpeakers, icon: Mic2, color: 'text-purple-500', bg: 'bg-purple-50' }
         ].map((stat, i) => {
           const Icon = stat.icon;
           return (
             <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
               <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}><Icon size={24}/></div>
               <div><div className="text-2xl font-black text-slate-800">{stat.val}</div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div></div>
             </div>
           );
         })}
      </div>
    </div>
  );
};

// --- COMPONENT: ORG CHART WITH HIERARCHY ---
const OrgChart = ({ dataObj, isAdmin, notify }) => {
  const { data: members = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('tree');
  const [filterLevel, setFilterLevel] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);
  
  const levels = [1, 2, 3, 4];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      let count = 0;
      csvData.forEach(row => {
        const name = row.name || row.Name || row['full name'];
        if (name) {
          let lvl = 3;
          const roleStr = String(row.role || row.Role || '').toLowerCase();
          if (roleStr.includes('director')) lvl = 1;
          else if (roleStr.includes('lead') || roleStr.includes('head')) lvl = 2;
          else if (roleStr.includes('support') || roleStr.includes('assistant')) lvl = 4;
          
          add({
            name: name,
            role: row.role || row.Role || 'Member',
            division: row.division || row.Division || row.Office || 'NEDA',
            level: row.level || row.Level || lvl,
            photo: row.photo || row.Photo || '',
            remarks: row.remarks || row.Notes || ''
          });
          count++;
        }
      });
      notify(`Imported ${count} members successfully!`, 'success');
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  const filteredMembers = members.filter(m => {
      const lv = String(m.level).replace(/[^0-9]/g, '');
      const matchLevel = filterLevel === 'All' || lv === String(filterLevel);
      const matchSearch = safeStr(m.name).toLowerCase().includes(searchTerm.toLowerCase()) || 
                          safeStr(m.role).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          safeStr(m.division).toLowerCase().includes(searchTerm.toLowerCase());
      return matchLevel && matchSearch;
  });

  const { items: sortedMembers, requestSort, sortConfig } = useSortableData(filteredMembers, { key: 'level', direction: 'ascending' });

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b pb-6 border-slate-200">
        <div><h2 className="text-3xl font-black text-slate-800">Organizational Structure</h2><p className="text-slate-500">Event Leadership & Reporting Hierarchy</p></div>
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl max-w-[200px] mr-1">
                <Search size={16} className="text-slate-400 mr-2 shrink-0"/>
                <input placeholder="Search members..." className="bg-transparent outline-none text-sm font-medium w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 mr-2">
                <Filter size={14} className="text-slate-400 mr-2"/>
                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer">
                    <option value="All">All Levels</option>
                    <option value="1">Level 1 (Directors)</option>
                    <option value="2">Level 2 (Leads)</option>
                    <option value="3">Level 3 (Focals)</option>
                    <option value="4">Level 4 (Support)</option>
                </select>
            </div>
            
            <button onClick={() => exportToCSV(members, 'nid-org-structure', notify)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden xl:inline">Export</span></button>
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleFileUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden xl:inline">Import CSV</span></button>
              </>
            )}
            
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2 shadow-sm">
               <button onClick={() => setViewMode('tree')} className={`p-1.5 rounded-md transition-all ${viewMode === 'tree' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Tree View"><Grid size={16}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
            </div>
            <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={18}/> Add Member</button>
        </div>
      </div>
      
      {viewMode === 'tree' ? (
        <div className="relative pt-6 max-w-5xl mx-auto">
          {filterLevel === 'All' && <div className="absolute left-1/2 top-0 bottom-10 w-1 bg-slate-200 -translate-x-1/2 rounded-full hidden md:block"></div>}

          {levels.map((level) => {
            const lvMembers = filteredMembers.filter(m => Number(m.level) === level);
            if (lvMembers.length === 0 && filterLevel !== 'All') return null; 
            if (lvMembers.length === 0) return null; 
            
            return (
              <div key={level} 
                   className="relative z-10 flex flex-col items-center mb-16 group w-full min-h-[150px] rounded-3xl transition-colors border-2 border-transparent p-4"
                   onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-50/50', 'border-blue-200', 'border-dashed'); }}
                   onDragLeave={e => { e.currentTarget.classList.remove('bg-blue-50/50', 'border-blue-200', 'border-dashed'); }}
                   onDrop={e => {
                       e.preventDefault();
                       e.currentTarget.classList.remove('bg-blue-50/50', 'border-blue-200', 'border-dashed');
                       const memberId = e.dataTransfer.getData('orgMemberId');
                       if(memberId) update(memberId, { level });
                   }}
              >
                  <div className={`px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-8 shadow-md border-2 border-white relative z-20 
                      ${level === 1 ? 'bg-blue-600 text-white' : level === 2 ? 'bg-indigo-500 text-white' : level === 3 ? 'bg-sky-400 text-white' : 'bg-slate-400 text-white'}`}>
                      Level {level}
                  </div>
                  
                  {lvMembers.length > 1 && filterLevel === 'All' && (
                      <div className="absolute top-[56px] left-[15%] right-[15%] h-1 bg-slate-200 hidden md:block rounded-full"></div>
                  )}

                  <div className="flex flex-wrap justify-center gap-6 w-full relative z-20">
                      {lvMembers.map(m => (
                          <div key={m.id} className="relative flex flex-col items-center">
                              {lvMembers.length > 1 && filterLevel === 'All' && <div className="hidden md:block w-1 h-6 bg-slate-200 absolute -top-6 rounded-full"></div>}
                              
                              <div draggable={true} 
                                   onDragStart={e => e.dataTransfer.setData('orgMemberId', m.id)}
                                   className={`bg-white p-6 rounded-2xl border-2 text-center shadow-sm w-52 hover:shadow-xl hover:-translate-y-1 transition-all group/card relative cursor-grab active:cursor-grabbing
                                   ${m.level === 1 ? 'border-blue-200' : 'border-slate-100 hover:border-blue-300'}`}>
                                  
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                      <button onClick={() => openEditModal(m)} className="text-slate-400 hover:text-blue-500 bg-slate-50 border p-1 rounded shadow-sm"><Edit2 size={12}/></button>
                                      {isAdmin && <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-red-500 bg-slate-50 border p-1 rounded shadow-sm"><Trash2 size={12}/></button>}
                                  </div>
                                  
                                  {m.photo ? (
                                      <img src={m.photo} alt={m.name} className="w-16 h-16 mx-auto mb-4 rounded-2xl object-cover shadow-lg border-2 border-slate-100 bg-slate-50" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=e0e7ff&color=4f46e5`; }} />
                                  ) : (
                                      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-lg 
                                          ${level === 1 ? 'bg-gradient-to-br from-blue-500 to-blue-700' : level === 2 ? 'bg-gradient-to-br from-indigo-400 to-indigo-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                                          {safeStr(m.name).charAt(0)}
                                      </div>
                                  )}
                                  
                                  <h4 className="font-bold text-slate-800 text-sm leading-tight">{safeStr(m.role)}</h4>
                                  <p className="text-blue-600 text-xs font-bold mt-1 line-clamp-1">{safeStr(m.name)}</p>
                                  <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">{safeStr(m.division)}</div>
                                  {isAdmin && m.remarks && <div className="mt-2 text-[9px] text-slate-400 italic flex items-center justify-center gap-1"><AlertCircle size={10}/> {m.remarks}</div>}
                              </div>
                          </div>
                      ))}
                      {lvMembers.length === 0 && (
                          <div className="text-xs font-bold text-slate-300 border-2 border-dashed border-slate-200 p-4 rounded-2xl w-52 flex items-center justify-center">Drag members here</div>
                      )}
                  </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm mt-4">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <SortableHeader label="Name" sortKey="name" currentSort={sortConfig} requestSort={requestSort} />
                <SortableHeader label="Role" sortKey="role" currentSort={sortConfig} requestSort={requestSort} />
                <SortableHeader label="Division" sortKey="division" currentSort={sortConfig} requestSort={requestSort} />
                <SortableHeader label="Level" sortKey="level" currentSort={sortConfig} requestSort={requestSort} className="text-center" />
                {isAdmin && <th className="p-4">Remarks</th>}
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMembers.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 font-bold text-slate-800 flex items-center gap-3">
                    {m.photo ? (
                        <img src={m.photo} alt={m.name} className="w-8 h-8 rounded-full border object-cover shrink-0 bg-slate-50" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=e0e7ff&color=4f46e5`; }} />
                    ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border ${getColorClass(m.name)}`}>
                            {safeStr(m.name).charAt(0)}
                        </div>
                    )}
                    {safeStr(m.name)}
                  </td>
                  <td className="p-4 text-blue-600 font-bold text-xs">{safeStr(m.role)}</td>
                  <td className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{safeStr(m.division)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${m.level === 1 ? 'bg-blue-100 text-blue-700' : m.level === 2 ? 'bg-indigo-100 text-indigo-700' : m.level === 3 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>Level {m.level}</span>
                  </td>
                  {isAdmin && <td className="p-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={m.remarks}>{m.remarks}</td>}
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(m)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                        {isAdmin && <button onClick={() => remove(m.id)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             const data = { 
                 name: fd.get('name') || '', role: fd.get('role') || '', division: fd.get('division') || '', 
                 level: Number(fd.get('level')) || 3, photo: fd.get('photo') || '', remarks: fd.get('remarks') || '' 
             };
             if (editingItem) update(editingItem.id, data); else add(data);
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit Member' : 'Add Team Member'}</h3>
              <input name="name" defaultValue={editingItem?.name} placeholder="Full Name" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/>
              <input name="role" defaultValue={editingItem?.role} placeholder="Role (e.g. Lead)" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/>
              <input name="division" defaultValue={editingItem?.division} placeholder="Division / Office (e.g. ICPD)" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/>
              <select name="level" defaultValue={editingItem?.level || 3} className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700">
                 <option value="1">Level 1 (Director)</option>
                 <option value="2">Level 2 (Lead)</option>
                 <option value="3">Level 3 (Member/Focal)</option>
                 <option value="4">Level 4 (Support)</option>
              </select>
              <div className="relative">
                  <ImageIcon size={16} className="absolute left-4 top-5 text-slate-400"/>
                  <input name="photo" defaultValue={editingItem?.photo} placeholder="Photo URL (Optional)" className="w-full p-4 pl-12 border border-slate-200 rounded-2xl outline-none font-medium"/>
              </div>
              {isAdmin && <input name="remarks" defaultValue={editingItem?.remarks} placeholder="Admin Remarks (Optional)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium bg-slate-50 text-slate-700"/>}
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700">Save Member</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: TASK MANAGER ---
const TaskManager = ({ dataObj, isAdmin, committees = [], teamMembers = [], notify }) => {
  const { data: tasks = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCommittee, setFilterCommittee] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedAssignees, setSelectedAssignees] = useState([]); 
  const fileInputRef = useRef(null);

  const columns = ['Not Started', 'In Progress', 'Complete', 'Overdue'];

  const filteredTasks = tasks.filter(t => {
    const matchSearch = safeStr(t.name).toLowerCase().includes(safeStr(searchTerm).toLowerCase()) || safeStr(t.committee).toLowerCase().includes(safeStr(searchTerm).toLowerCase()) || safeStr(t.assignedTo).toLowerCase().includes(safeStr(searchTerm).toLowerCase());
    const matchCom = filterCommittee === 'All' || safeStr(t.committee).trim().toLowerCase() === filterCommittee.toLowerCase();
    const matchStat = filterStatus === 'All' || safeStr(t.status).trim().toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchCom && matchStat;
  });

  const { items: sortedTasks, requestSort, sortConfig } = useSortableData(filteredTasks);

  const handleDragStart = (e, id) => e.dataTransfer.setData('taskId', id);
  const handleDrop = (e, status) => {
    const id = e.dataTransfer.getData('taskId');
    update(id, { status });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      let count = 0;
      csvData.forEach(row => {
        const name = row.taskname || row.task || row.name;
        if (name) {
          const assigneesRaw = row.assignedto || row.assignee || row.owner || '';
          const assigneesArr = assigneesRaw.split(',').map(a => a.trim()).filter(a => a);

          add({
            name: name,
            assignedTo: assigneesArr.length > 0 ? assigneesArr : ['Unassigned'],
            committee: row.committee || row.team || 'General',
            status: row.status || 'Not Started',
            priority: row.priority || 'Medium',
            startDate: row.startdate || row.start || '',
            endDate: row.enddate || row.duedate || row.end || '',
            remarks: row.remarks || row.Notes || ''
          });
          count++;
        }
      });
      notify(`Imported ${count} tasks successfully!`, 'success');
    };
    reader.readAsText(file);
  };

  const toggleAssignee = (name) => {
    setSelectedAssignees(prev => 
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div><h2 className="text-3xl font-black text-slate-800">Task Board</h2><p className="text-slate-500">Track deliverables with multiple owners</p></div>
        <div className="flex flex-wrap items-center gap-2">
           <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl max-w-[200px]">
             <Search size={16} className="text-slate-400 mr-2 shrink-0"/>
             <input placeholder="Search tasks..." className="bg-transparent outline-none text-sm font-medium w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
           </div>
           
           <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2">
               <Filter size={14} className="text-slate-400 mr-2 shrink-0"/>
               <select value={filterCommittee} onChange={e => setFilterCommittee(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer max-w-[120px] truncate">
                   <option value="All">All Committees</option>
                   {committees.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
           </div>
           
           {viewMode === 'list' && (
               <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2">
                   <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer">
                       <option value="All">All Statuses</option>
                       {columns.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
               </div>
           )}

           <button onClick={() => exportToCSV(tasks, 'nid-tasks', notify)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden xl:inline">Export</span></button>
           {isAdmin && (
             <>
               <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleFileUpload}/>
               <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden xl:inline">Import</span></button>
             </>
           )}
           <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2 shadow-sm">
               <button onClick={() => {setViewMode('board'); setFilterStatus('All');}} className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Board View"><Columns size={16}/></button>
               <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
           </div>
           
           <button onClick={() => { 
             setEditingTask(null); 
             setSelectedAssignees([]); 
             setShowModal(true); 
           }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={18}/> Add Task</button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-6 h-full min-w-[1200px]">
            {columns.map(col => (
              <div key={col} className={`flex-1 rounded-3xl p-4 flex flex-col border border-slate-200 ${col === 'Complete' ? 'bg-green-50/30' : col === 'Overdue' ? 'bg-red-50/30' : col === 'In Progress' ? 'bg-blue-50/30' : 'bg-slate-100/70'}`}
                   onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col)}>
                 <div className="flex justify-between items-center mb-4 px-2 font-black text-slate-500 text-xs uppercase tracking-widest">
                    <span className={col === 'Complete' ? 'text-green-700' : col === 'Overdue' ? 'text-red-700' : col === 'In Progress' ? 'text-blue-700' : 'text-slate-600'}>{col}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full border shadow-sm">{filteredTasks.filter(t => safeStr(t.status).trim() === col).length}</span>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                  {filteredTasks.filter(t => safeStr(t.status).trim() === col).map(t => (
                    <div key={t.id} draggable={true} onDragStart={e => handleDragStart(e, t.id)} 
                         className={`bg-white p-4 rounded-2xl shadow-sm border transition-all group relative cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-1 ${getStatusBorder(t.status)}`}>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${t.priority === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>{safeStr(t.priority)}</span>
                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
                           <button onClick={() => { 
                             setEditingTask(t); 
                             setSelectedAssignees(Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]);
                             setShowModal(true); 
                           }} className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-blue-600 shadow-sm"><Edit2 size={12}/></button>
                           {isAdmin && <button onClick={() => remove(t.id)} className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-red-500 shadow-sm"><Trash2 size={12}/></button>}
                        </div>
                      </div>
                      
                      <div className="font-bold text-slate-800 leading-tight mb-3 text-sm">{safeStr(t.name)}</div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                          {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, idx) => (
                              <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${getColorClass(a)}`}>
                                  <div className="w-4 h-4 rounded-full bg-white/50 flex items-center justify-center text-[8px]">{safeStr(a).charAt(0)}</div>
                                  {safeStr(a)}
                              </div>
                          )) : <span className="text-xs text-slate-400">{safeStr(t.assignedTo)}</span>}
                      </div>

                      <div className={`inline-block px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border mb-3 ${getColorClass(t.committee)}`}>{safeStr(t.committee)}</div>

                      {isAdmin && t.remarks && (
                         <div className="mt-1 mb-3 pt-3 border-t border-slate-50 text-[10px] text-slate-500 italic flex items-start gap-1">
                             <AlertCircle size={12} className="shrink-0 mt-0.5 text-slate-400"/>
                             <span>{t.remarks}</span>
                         </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                         <select 
                            value={safeStr(t.status).trim()} 
                            onChange={(e) => update(t.id, { status: e.target.value })}
                            className={`text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer transition-all ${getStatusColor(t.status)}`}
                         >
                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>

                         <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-100">
                             <CalendarClock size={12} className="text-blue-400"/> 
                             {getDuration(t.startDate, t.endDate)}d
                         </div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>
      </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
              <tr>
                 <SortableHeader label="Task Name" sortKey="name" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Assigned To" sortKey="assignedTo" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Priority" sortKey="priority" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} className="w-40" />
                 {isAdmin && <th className="p-4">Remarks</th>}
                 <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedTasks.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{safeStr(t.name)}</div>
                    <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border mt-1.5 ${getColorClass(t.committee)}`}>{safeStr(t.committee)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, idx) => (
                        <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getColorClass(a)}`}>{safeStr(a)}</span>
                      )) : <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200">{safeStr(t.assignedTo)}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${t.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{safeStr(t.priority)}</span>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><CalendarClock size={12}/> {getDuration(t.startDate, t.endDate)}d</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <select value={safeStr(t.status).trim()} onChange={(e) => update(t.id, { status: e.target.value })} 
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer w-full transition-all ${getStatusColor(t.status)}`}>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  {isAdmin && <td className="p-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={t.remarks}>{t.remarks}</td>}
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingTask(t); setSelectedAssignees(Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]); setShowModal(true); }} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                      {isAdmin && <button onClick={() => remove(t.id)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <h3 className="text-2xl font-bold mb-6">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const item = {
                  name: fd.get('name') || '',
                  assignedTo: selectedAssignees.length > 0 ? selectedAssignees : ['Unassigned'],
                  committee: fd.get('committee') || '',
                  status: editingTask?.status || 'Not Started',
                  priority: fd.get('priority') || 'Medium',
                  startDate: fd.get('startDate') || '',
                  endDate: fd.get('endDate') || '',
                  remarks: fd.get('remarks') || ''
                };
                if(editingTask) update(editingTask.id, item);
                else add(item);
                setShowModal(false);
              }} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                 <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Task Name</label><input name="name" defaultValue={editingTask?.name} required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/></div>
                 
                 <div>
                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Assign Team Members</label>
                    <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto">
                        {teamMembers.map(member => (
                            <label key={member} className={`flex items-center gap-2 text-xs font-medium cursor-pointer p-1.5 rounded-lg border transition-colors ${selectedAssignees.includes(member) ? getColorClass(member) : 'bg-white border-transparent text-slate-700 hover:bg-slate-100'}`}>
                                <input type="checkbox" checked={selectedAssignees.includes(member)} onChange={() => toggleAssignee(member)} className="rounded text-blue-600 focus:ring-blue-500 hidden"/>
                                <div className={`w-3 h-3 rounded border flex items-center justify-center ${selectedAssignees.includes(member) ? 'bg-current border-transparent' : 'border-slate-300'}`}>
                                    {selectedAssignees.includes(member) && <CheckSquare size={10} className="text-white"/>}
                                </div>
                                {member}
                            </label>
                        ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Committee</label><select name="committee" defaultValue={editingTask?.committee} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium">{committees.map(c => <option key={c}>{c}</option>)}</select></div>
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Priority</label><select name="priority" defaultValue={editingTask?.priority || 'Medium'} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Start Date</label><input name="startDate" type="date" defaultValue={editingTask?.startDate} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/></div>
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Due Date</label><input name="endDate" type="date" defaultValue={editingTask?.endDate} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/></div>
                 </div>
                 
                 {isAdmin && <input name="remarks" defaultValue={editingTask?.remarks} placeholder="Admin Remarks (Optional)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium bg-slate-50 text-slate-700"/>}

                 <div className="flex gap-2 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700">Save Task</button>
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: PROGRAM MANAGER ---
const ProgramManager = ({ dataObj, isAdmin, teamMembers = [], notify }) => {
  const { data: events = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('timeline');
  const [filterDay, setFilterDay] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);
  
  const days = useMemo(() => {
    const d = new Set(events.map(e => safeStr(e.day).trim()));
    return Array.from(d).sort();
  }, [events]);

  const filteredEvents = events.filter(e => {
     const matchDay = filterDay === 'All' || safeStr(e.day).trim().toLowerCase() === filterDay.toLowerCase();
     const matchSearch = safeStr(e.activity).toLowerCase().includes(searchTerm.toLowerCase()) || 
                         safeStr(e.lead).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         safeStr(e.venue).toLowerCase().includes(searchTerm.toLowerCase());
     return matchDay && matchSearch;
  });

  const { items: sortedEvents, requestSort, sortConfig } = useSortableData(filteredEvents, { key: 'time', direction: 'ascending' });

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      let count = 0;
      csvData.forEach(row => {
        const activity = row.activity || row.activities || row.event;
        if(activity) {
          add({
            day: row.day || 'Day 1',
            time: row.time || '09:00',
            activity: activity,
            lead: row.lead || '',
            venue: row.venue || '',
            remarks: row.remarks || row.notes || '',
            isHeader: String(row.isheader || '').toLowerCase() === 'true'
          });
          count++;
        }
      });
      notify(`Imported ${count} agenda items!`, 'success');
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
        <div><h2 className="text-2xl font-black text-slate-800">Program Itinerary</h2><p className="text-slate-500">Scheduled Activities & Flow</p></div>
        <div className="flex flex-wrap items-center gap-2">
           <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl max-w-[200px] mr-1">
             <Search size={16} className="text-slate-400 mr-2 shrink-0"/>
             <input placeholder="Search activity..." className="bg-transparent outline-none text-sm font-medium w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
           </div>
           <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 mr-2">
               <Filter size={14} className="text-slate-400 mr-2"/>
               <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer">
                   <option value="All">All Days</option>
                   {days.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
           </div>
           
           <button onClick={() => exportToCSV(events, 'nid-program', notify)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden xl:inline">Export</span></button>
           {isAdmin && (
             <>
               <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleBulkUpload}/>
               <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden xl:inline">Import</span></button>
             </>
           )}
           <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2 shadow-sm">
               <button onClick={() => setViewMode('timeline')} className={`p-1.5 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Timeline View"><List size={16}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
           </div>
           <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={16}/> Add Activity</button>
        </div>
      </div>
      
      {viewMode === 'timeline' ? (
        <div className="flex-1 overflow-auto p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {(filterDay === 'All' ? days : [filterDay]).map(day => (
            <div key={day} className="space-y-6">
              <h3 className="text-xl font-black text-blue-900 border-b-2 border-blue-100 pb-2 flex items-center gap-2"><Calendar size={20}/>{safeStr(day)}</h3>
              <div className="space-y-6 border-l-2 border-slate-100 ml-3 pl-6">
              {filteredEvents.filter(e => safeStr(e.day).trim() === day).sort((a,b)=>safeStr(a.time).localeCompare(safeStr(b.time))).map(e => (
                <div key={e.id} className="relative group">
                    <div className={`absolute -left-[35px] top-1.5 w-4 h-4 rounded-full border-4 ${e.isHeader ? 'bg-blue-600 border-blue-200' : 'bg-white border-blue-500'}`}></div>
                    <div className="text-[10px] font-bold text-blue-600 mb-1 tracking-widest bg-blue-50 inline-block px-2 py-0.5 rounded-md border border-blue-100">{safeStr(e.time)}</div>
                    <h4 className={`text-slate-800 ${e.isHeader ? 'font-black text-lg text-blue-900' : 'font-bold text-sm'}`}>{safeStr(e.activity)}</h4>
                    
                    {(e.lead || e.venue) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {e.lead && <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${getColorClass(e.lead)}`}><Users size={10}/> {safeStr(e.lead)}</span>}
                            {e.venue && <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest"><MapPin size={10}/> {safeStr(e.venue)}</span>}
                        </div>
                    )}
                    {e.remarks && <p className="text-xs text-slate-500 mt-2 bg-yellow-50 border-l-2 border-yellow-300 pl-2 py-1 italic">{safeStr(e.remarks)}</p>}
                    
                    <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(e)} className="p-1 bg-white border rounded shadow-sm text-slate-300 hover:text-blue-500"><Edit2 size={12}/></button>
                        {isAdmin && <button onClick={() => remove(e.id)} className="p-1 bg-white border rounded shadow-sm text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>}
                    </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white rounded-b-3xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
              <tr>
                 <SortableHeader label="Day & Time" sortKey="time" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Activity" sortKey="activity" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Lead" sortKey="lead" currentSort={sortConfig} requestSort={requestSort} />
                 <th className="p-4">Remarks</th>
                 <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedEvents.map(e => (
                <tr key={e.id} className={`hover:bg-slate-50/80 transition-colors group ${e.isHeader ? 'bg-blue-50/30' : ''}`}>
                  <td className="p-4 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{safeStr(e.day)}</div>
                    <div className="text-[10px] font-bold text-blue-600 tracking-widest mt-1 bg-blue-50 border border-blue-100 inline-block px-2 py-0.5 rounded-md">{safeStr(e.time)}</div>
                  </td>
                  <td className="p-4">
                    <div className={`${e.isHeader ? 'font-black text-blue-900 text-base' : 'font-bold text-slate-800'}`}>{safeStr(e.activity)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      {e.lead && <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${getColorClass(e.lead)}`}><Users size={10}/> {safeStr(e.lead)}</span>}
                      {e.venue && <span className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest mt-1"><MapPin size={10}/> {safeStr(e.venue)}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    {e.remarks && <span className="text-xs text-slate-500 bg-yellow-50 border-l-2 border-yellow-300 pl-2 py-1 italic block">{safeStr(e.remarks)}</span>}
                  </td>
                  <td className="p-4 text-right">
                     <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEditModal(e)} className="p-2 bg-white rounded border shadow-sm text-slate-300 hover:text-blue-500"><Edit2 size={16}/></button>
                       {isAdmin && <button onClick={() => remove(e.id)} className="p-2 bg-white rounded border shadow-sm text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             const data = { 
                day: fd.get('day') || '', time: fd.get('time') || '', activity: fd.get('activity') || '', 
                lead: fd.get('lead') || '', venue: fd.get('venue') || '', remarks: fd.get('remarks') || '',
                isHeader: fd.get('isHeader') === 'on'
             };
             if (editingItem) update(editingItem.id, data); else add(data);
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit Event' : 'Add Event'}</h3>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Day</label>
                <input name="day" list="dayOptions" defaultValue={editingItem?.day} placeholder="e.g. Day 1" required className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium"/>
                <datalist id="dayOptions">
                    <option value="Day 0"/><option value="Day 1"/><option value="Day 2"/><option value="Day 3"/>
                </datalist>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                 <input type="checkbox" name="isHeader" id="isHeader" defaultChecked={editingItem?.isHeader} className="w-4 h-4 text-blue-600"/>
                 <label htmlFor="isHeader" className="text-sm font-bold text-slate-700">Highlight as Section Header?</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input name="time" type="time" defaultValue={editingItem?.time} className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium"/>
                <input name="venue" placeholder="Venue" defaultValue={editingItem?.venue} className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium"/>
              </div>
              <input name="activity" placeholder="Activity Name" defaultValue={editingItem?.activity} required className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium"/>
              
              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Lead / Focal</label>
                 <select name="lead" defaultValue={editingItem?.lead || ""} className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 bg-white">
                    <option value="">No Lead Assigned</option>
                    {teamMembers.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                 </select>
              </div>

              {isAdmin && <input name="remarks" defaultValue={editingItem?.remarks} placeholder="Admin Remarks (Optional)" className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium bg-slate-50 text-slate-700"/>}
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: SPEAKER MANAGER ---
const SpeakerManager = ({ dataObj, isAdmin, notify }) => {
  const { data: speakers = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const [filterDay, setFilterDay] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  const filteredSpeakers = speakers.filter(s => {
      const matchDay = filterDay === 'All' || safeStr(s.assignedDay || 'Day 1').trim().toLowerCase() === filterDay.toLowerCase();
      const matchStatus = filterStatus === 'All' || safeStr(s.status).trim().toLowerCase() === filterStatus.toLowerCase();
      const matchSearch = safeStr(s.name).toLowerCase().includes(searchTerm.toLowerCase()) || 
                          safeStr(s.org).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          safeStr(s.role).toLowerCase().includes(searchTerm.toLowerCase());
      return matchDay && matchStatus && matchSearch;
  });

  const { items: sortedSpeakers, requestSort, sortConfig } = useSortableData(filteredSpeakers, { key: 'name', direction: 'ascending' });

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      let count = 0;
      csvData.forEach(row => {
        const name = row.name || row['full name'];
        if(name) {
          add({
            name: name,
            role: row.designation || row.role || '',
            org: row.institution || row.org || row.organization || '',
            country: row.country || row.nation || 'Philippines',
            photo: row.photo || '',
            email: row.email || '',
            status: row.status || 'Invited',
            assignedDay: row['Assigned Day'] || row.Day || 'Day 1',
            assignment: row.Assignment || 'TBD',
            remarks: row.remarks || row.Notes || '',
            order: Date.now() + count
          });
          count++;
        }
      });
      notify(`Imported ${count} speakers!`, 'success');
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
         <div><h2 className="text-3xl font-black text-slate-800">Speakers & VIPs</h2><p className="text-slate-500">Total VIPs: {speakers.length}</p></div>
         <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl max-w-[200px] mr-1">
                <Search size={16} className="text-slate-400 mr-2 shrink-0"/>
                <input placeholder="Search VIPs..." className="bg-transparent outline-none text-sm font-medium w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 mr-1">
                <Filter size={14} className="text-slate-400 mr-2"/>
                <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer max-w-[120px] truncate">
                    <option value="All">All Days</option>
                    {SPEAKER_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            
            {viewMode === 'table' && (
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 mr-1">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer max-w-[100px]">
                        <option value="All">All Status</option>
                        <option value="Invited">Invited</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Declined">Declined</option>
                    </select>
                </div>
            )}

            <button onClick={() => exportToCSV(speakers, 'nid-speakers', notify)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden xl:inline">Export</span></button>
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleBulkUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden xl:inline">Import</span></button>
              </>
            )}
            
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2 shadow-sm">
               <button onClick={() => {setViewMode('board'); setFilterStatus('All');}} className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Board View"><Columns size={16}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
            </div>
            
            <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={18}/> Add VIP</button>
         </div>
      </div>
      
      {viewMode === 'board' ? (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-6 h-full min-w-[1400px]">
            {(filterDay === 'All' ? SPEAKER_DAYS : [filterDay]).map(day => {
              const columnSpeakers = filteredSpeakers.filter(s => safeStr(s.assignedDay || 'Day 1').trim() === day).sort((a,b) => (a.order || 0) - (b.order || 0));
              
              return (
              <div key={day} 
                   className="flex-1 bg-slate-100/70 rounded-3xl p-4 flex flex-col border border-slate-200"
                   onDragOver={e => e.preventDefault()} 
                   onDrop={e => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData('speakerId');
                      if (!id) return;
                      
                      let newOrder = 1000;
                      if (columnSpeakers.length > 0) {
                          newOrder = Number(columnSpeakers[columnSpeakers.length - 1].order || 0) + 1000;
                      }
                      
                      update(id, { assignedDay: day, order: newOrder ?? Date.now() });
                   }}>
                 <div className="flex justify-between items-center mb-4 px-2 font-black text-slate-500 text-xs uppercase tracking-widest">
                    <span>{day}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full border shadow-sm">{columnSpeakers.length}</span>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                    {columnSpeakers.map(s => (
                      <div key={s.id} 
                           draggable={true} 
                           onDragStart={e => e.dataTransfer.setData('speakerId', s.id)} 
                           onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                           onDrop={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              const draggedId = e.dataTransfer.getData('speakerId');
                              if (!draggedId || draggedId === s.id) return;

                              const targetIndex = columnSpeakers.findIndex(sp => sp.id === s.id);
                              let newOrder;
                              if (targetIndex === 0) {
                                  newOrder = Number(s.order || 0) - 1000;
                              } else {
                                  const prevOrder = Number(columnSpeakers[targetIndex - 1].order || 0);
                                  newOrder = (prevOrder + Number(s.order || 0)) / 2;
                              }

                              update(draggedId, { assignedDay: day, order: newOrder ?? Date.now() });
                           }}
                           className={`bg-white p-4 rounded-2xl shadow-sm flex flex-col gap-3 relative group transition-all cursor-grab active:cursor-grabbing hover:shadow-xl hover:-translate-y-1
                                      ${safeStr(s.status).trim() === 'Confirmed' ? 'border-2 border-green-200' : safeStr(s.status).trim() === 'Declined' ? 'border border-red-200' : 'border border-slate-200'}`}>
                          
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button onClick={() => openEditModal(s)} className="p-1.5 bg-white border rounded-lg shadow-sm text-slate-400 hover:text-blue-600"><Edit2 size={12}/></button>
                              {isAdmin && <button onClick={() => remove(s.id)} className="p-1.5 bg-white border rounded-lg shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={12}/></button>}
                          </div>

                          <div className="flex items-center gap-3 pr-12">
                              <div className="relative shrink-0">
                                  {s.photo ? (
                                      <img src={s.photo} alt={s.name} className="w-12 h-12 rounded-full border-2 border-slate-100 object-cover bg-slate-50" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=e0e7ff&color=4f46e5`; }} />
                                  ) : (
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border ${getColorClass(s.name)}`}>{safeStr(s.name).charAt(0)}</div>
                                  )}
                                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${safeStr(s.status).trim() === 'Confirmed' ? 'bg-green-500' : safeStr(s.status).trim() === 'Declined' ? 'bg-red-500' : 'bg-slate-300'}`} title={`Status: ${s.status}`}></div>
                              </div>
                              <div className="flex-1 min-w-0 pointer-events-none">
                                  <h4 className="font-bold text-slate-800 text-sm truncate leading-tight">{safeStr(s.name)}</h4>
                                  <p className="text-[11px] font-bold text-indigo-600 truncate mt-0.5">{safeStr(s.role)}</p>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-widest truncate mt-0.5 flex items-center gap-1">
                                      <span title={s.country}>{ASEAN_COUNTRIES.find(c => c.name === s.country)?.flag || '🌐'}</span>
                                      <span className="truncate">{safeStr(s.org)}</span>
                                  </p>
                              </div>
                          </div>

                          {isAdmin && s.remarks && (
                             <div className="pt-2 border-t border-slate-50 text-[10px] text-slate-500 italic flex items-start gap-1">
                                 <AlertCircle size={12} className="shrink-0 mt-0.5 text-slate-400"/>
                                 <span className="line-clamp-2">{s.remarks}</span>
                             </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1 gap-2">
                              <span className="text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-1.5 rounded-md border border-slate-100 flex-1 truncate text-center" title={s.assignment}>{safeStr(s.assignment)}</span>
                              <select value={safeStr(s.status).trim() || 'Invited'} onChange={(e) => update(s.id, { status: e.target.value })}
                                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer transition-colors w-24 text-center shrink-0
                                  ${safeStr(s.status).trim() === 'Confirmed' ? 'bg-green-50 border-green-200 text-green-700' : safeStr(s.status).trim() === 'Declined' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                  <option value="Invited">Invited</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Declined">Declined</option>
                              </select>
                          </div>
                      </div>
                    ))}
                 </div>
              </div>
            )})}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white rounded-3xl border border-slate-200 shadow-sm mb-10">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
              <tr>
                 <SortableHeader label="Speaker Name" sortKey="name" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Institution / Org" sortKey="org" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Assignment" sortKey="assignment" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} className="w-40" />
                 {isAdmin && <th className="p-4">Remarks</th>}
                 <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSpeakers.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 flex items-center gap-3">
                    {s.photo ? (
                        <img src={s.photo} alt={s.name} className="w-10 h-10 rounded-full border object-cover shrink-0 bg-slate-50" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=e0e7ff&color=4f46e5`; }} />
                    ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border shrink-0 ${getColorClass(s.name)}`}>{safeStr(s.name).charAt(0)}</div>
                    )}
                    <div>
                      <div className="font-bold text-slate-800">{safeStr(s.name)}</div>
                      <div className="text-xs font-bold text-indigo-600">{safeStr(s.role)}</div>
                    </div>
                  </td>
                  <td className="p-4">
                     <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span className="text-sm" title={s.country}>{ASEAN_COUNTRIES.find(c => c.name === s.country)?.flag || '🌐'}</span>
                        <span className="truncate">{safeStr(s.org)}</span>
                     </div>
                  </td>
                  <td className="p-4">
                     <div className="text-xs font-bold text-slate-700">{s.assignment || 'TBD'}</div>
                     <div className="text-[10px] font-bold text-slate-400">{s.assignedDay || 'Day 1'}</div>
                  </td>
                  <td className="p-4">
                    <select value={safeStr(s.status).trim() || 'Invited'} onChange={(e) => update(s.id, { status: e.target.value })} 
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors w-full
                        ${safeStr(s.status).trim() === 'Confirmed' ? 'bg-green-50 border-green-200 text-green-600' : safeStr(s.status).trim() === 'Declined' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <option value="Invited">Invited</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Declined">Declined</option>
                    </select>
                  </td>
                  {isAdmin && <td className="p-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={s.remarks}>{s.remarks}</td>}
                  <td className="p-4 text-right">
                     <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEditModal(s)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                       {isAdmin && <button onClick={() => remove(s.id)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>}
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             const data = { 
                name: fd.get('name') || '', 
                role: fd.get('role') || '', 
                org: fd.get('org') || '', 
                country: fd.get('country') || 'Philippines', 
                photo: fd.get('photo') || '', 
                email: fd.get('email') || '', 
                assignedDay: fd.get('assignedDay') || 'Day 1', 
                assignment: fd.get('assignment') || 'TBD',
                remarks: fd.get('remarks') || '', 
                status: editingItem?.status || 'Invited',
                order: editingItem?.order ?? Date.now()
             };
             if (editingItem) update(editingItem.id, data); else add(data);
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit Speaker' : 'Add VIP Speaker'}</h3>
              
              <div className="space-y-3">
                  <input name="name" defaultValue={editingItem?.name} placeholder="Full Name" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                  <input name="role" defaultValue={editingItem?.role} placeholder="Designation / Title" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                  <input name="org" defaultValue={editingItem?.org} placeholder="Institution / Organization" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                  
                  <select name="country" defaultValue={editingItem?.country || 'Philippines'} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium text-slate-700 bg-white">
                      {ASEAN_COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.flag} {c.name}</option>)}
                  </select>
                  
                  <div className="relative">
                      <ImageIcon size={16} className="absolute left-4 top-5 text-slate-400"/>
                      <input name="photo" defaultValue={editingItem?.photo} placeholder="Photo URL (Optional)" className="w-full p-4 pl-12 border border-slate-200 rounded-2xl outline-none font-medium"/>
                  </div>

                  <div className="relative">
                      <Mail size={16} className="absolute left-4 top-5 text-slate-400"/>
                      <input name="email" defaultValue={editingItem?.email} placeholder="Email Address (Private)" className="w-full p-4 pl-12 border border-slate-200 rounded-2xl outline-none font-medium"/>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Assigned Day</label>
                    <select name="assignedDay" defaultValue={editingItem?.assignedDay || 'Day 1'} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium mt-1">
                        {SPEAKER_DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Role / Session</label>
                    <select name="assignment" defaultValue={editingItem?.assignment || 'TBD'} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium mt-1">
                        {SPEAKER_ASSIGNMENTS.map(a => <option key={a}>{a}</option>)}
                    </select>
                 </div>
              </div>

              {isAdmin && <input name="remarks" defaultValue={editingItem?.remarks} placeholder="Admin Remarks (Optional)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium bg-slate-50 text-slate-700"/>}
              
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-colors">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: GUEST MANAGER (Sectoral View) ---
const GuestManager = ({ attendeesObj, isAdmin }) => {
  const { data: attendees = [], add, update, remove } = attendeesObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Aggregate sectoral data robustly
  const predefinedSectors = SECTORS.map(sector => {
      const existing = attendees.find(a => a.sector === sector && a.target !== undefined);
      const legacyInvited = attendees.filter(a => a.sector === sector && a.target === undefined).length;
      const legacyConfirmed = attendees.filter(a => a.sector === sector && safeStr(a.status).trim() === 'Confirmed' && a.target === undefined).length;

      return existing || { 
          id: `temp-${sector}`, 
          sector, 
          target: 0, 
          invited: legacyInvited, 
          confirmed: legacyConfirmed, 
          isNew: true 
      };
  });

  // Include any custom sectors added dynamically
  const customSectors = attendees.filter(a => a.target !== undefined && !SECTORS.includes(a.sector));
  const sectorData = [...predefinedSectors, ...customSectors];

  const { items: sortedSectors, requestSort, sortConfig } = useSortableData(sectorData);

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  const totalTarget = sectorData.reduce((acc, curr) => acc + (Number(curr.target)||0), 0);
  const totalInvited = sectorData.reduce((acc, curr) => acc + (Number(curr.invited)||0), 0);
  const totalConfirmed = sectorData.reduce((acc, curr) => acc + (Number(curr.confirmed)||0), 0);

  return (
    <div className="h-full flex flex-col gap-6 bg-white rounded-3xl border shadow-sm overflow-hidden">
       <div className="p-8 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800">Sectoral Guest Breakdown</h2>
            <p className="text-slate-500">Track target allocations vs actual confirmations</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-xl border shadow-sm">
                 <div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Target</span><span className="font-black text-slate-800">{totalTarget}</span></div>
                 <div className="w-px h-8 bg-slate-200"></div>
                 <div><span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Invited</span><span className="font-black text-blue-700">{totalInvited}</span></div>
                 <div className="w-px h-8 bg-slate-200"></div>
                 <div><span className="text-[10px] font-bold text-green-400 uppercase tracking-widest block">Confirmed</span><span className="font-black text-green-700">{totalConfirmed}</span></div>
             </div>
             
             <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
                 <Plus size={18}/> Add Sector
             </button>

             <a href="https://docs.google.com/spreadsheets/u/0/" target="_blank" rel="noreferrer" className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-3 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 hover:bg-emerald-100 transition-colors">
                 <ExternalLink size={18}/> Master DB
             </a>
          </div>
       </div>
       <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
                <tr>
                   <SortableHeader label="Sector" sortKey="sector" currentSort={sortConfig} requestSort={requestSort} />
                   <SortableHeader label="Target Allocation" sortKey="target" currentSort={sortConfig} requestSort={requestSort} className="text-center" />
                   <SortableHeader label="Total Invited" sortKey="invited" currentSort={sortConfig} requestSort={requestSort} className="text-center" />
                   <SortableHeader label="Confirmed Attendees" sortKey="confirmed" currentSort={sortConfig} requestSort={requestSort} className="text-center" />
                   <th className="p-5 text-center">Confirmation Progress</th>
                   <th className="p-5 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {sortedSectors.map(g => {
                  const rate = g.target > 0 ? Math.round((g.confirmed / g.target) * 100) : 0;
                  return (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors group">
                     <td className="p-6">
                         <span className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest inline-block border ${getColorClass(g.sector)}`}>{safeStr(g.sector)}</span>
                     </td>
                     <td className="p-6 text-center">
                         <span className="font-black text-slate-700 text-lg">{g.target}</span>
                     </td>
                     <td className="p-6 text-center">
                         <span className="font-black text-blue-700 text-lg">{g.invited}</span>
                     </td>
                     <td className="p-6 text-center">
                         <span className="font-black text-green-700 text-lg">{g.confirmed}</span>
                     </td>
                     <td className="p-6 text-center">
                         <div className="flex items-center justify-center gap-3">
                            <div className="w-32 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                               <div className={`h-full ${rate >= 100 ? 'bg-green-500' : rate >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(rate, 100)}%` }}></div>
                            </div>
                            <span className="text-xs font-black text-slate-500 w-10">{rate}%</span>
                         </div>
                     </td>
                     <td className="p-6 text-right">
                         <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(g)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                            {isAdmin && !g.isNew && <button onClick={() => remove(g.id)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>}
                         </div>
                     </td>
                  </tr>
                )})}
             </tbody>
          </table>
       </div>

       {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
             <form onSubmit={e => {
               e.preventDefault();
               const fd = new FormData(e.target);
               const data = { 
                  sector: fd.get('sector') || '',
                  target: Number(fd.get('target')) || 0,
                  invited: Number(fd.get('invited')) || 0,
                  confirmed: Number(fd.get('confirmed')) || 0
               };
               if (editingItem && !editingItem.isNew) update(editingItem.id, data); 
               else add(data);
               setShowModal(false);
             }} className="bg-white p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl">
                <h3 className="text-xl font-bold">{editingItem && !editingItem.isNew ? 'Edit Sector Forms' : 'Add Guest Sector'}</h3>
                
                <div>
                   <label className="text-xs font-bold text-slate-400 uppercase ml-1">Sector Name</label>
                   <input name="sector" defaultValue={editingItem?.sector} required className="w-full p-4 mt-1 border border-slate-200 rounded-2xl outline-none font-medium"/>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Target</label>
                      <input name="target" type="number" defaultValue={editingItem?.target} className="w-full p-4 mt-1 border border-slate-200 rounded-2xl outline-none font-black text-center"/>
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Invited</label>
                      <input name="invited" type="number" defaultValue={editingItem?.invited} className="w-full p-4 mt-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-2xl outline-none font-black text-center"/>
                   </div>
                   <div>
                      <label className="text-xs font-bold text-slate-400 uppercase ml-1">Confirmed</label>
                      <input name="confirmed" type="number" defaultValue={editingItem?.confirmed} className="w-full p-4 mt-1 bg-green-50 text-green-700 border border-green-200 rounded-2xl outline-none font-black text-center"/>
                   </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-colors">Save Sector</button>
                  <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                </div>
             </form>
          </div>
       )}
    </div>
  );
};

// --- COMPONENT: MEETING TRACKER ---
const MeetingTracker = ({ dataObj, isAdmin, notify }) => {
  const { data: meetings = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  const filteredMeetings = meetings.filter(m => 
      safeStr(m.title).toLowerCase().includes(searchTerm.toLowerCase()) || 
      safeStr(m.date).includes(searchTerm)
  );

  const { items: sortedMeetings, requestSort, sortConfig } = useSortableData(filteredMeetings, { key: 'date', direction: 'descending' });

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      let count = 0;
      csvData.forEach(row => {
        const title = row.title || row['title of meeting'];
        if(title) {
          add({
            date: row.date || '',
            title: title,
            attendees: row.attendees || row['attendance sheet'] || '',
            minutesLink: row.minuteslink || row.link || '',
            remarks: row.remarks || row.Notes || ''
          });
          count++;
        }
      });
      notify(`Imported ${count} meetings!`, 'success');
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-8 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
        <div><h2 className="text-2xl font-black text-slate-800">Meeting Tracker</h2><p className="text-slate-500">Minutes & Attendance Log</p></div>
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl max-w-[200px] mr-1">
                <Search size={16} className="text-slate-400 mr-2 shrink-0"/>
                <input placeholder="Search title/date..." className="bg-transparent outline-none text-sm font-medium w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
            
            <button onClick={() => exportToCSV(meetings, 'nid-meetings', notify)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden xl:inline">Export</span></button>
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleBulkUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden xl:inline">Import</span></button>
              </>
            )}
            
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 mr-2 shadow-sm">
               <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Grid View"><Grid size={16}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-slate-100 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
            </div>
            
            <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={16}/> Log Meeting</button>
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {sortedMeetings.map(m => (
             <div key={m.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative group flex flex-col">
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(m)} className="p-2 bg-white border rounded shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                  {isAdmin && <button onClick={() => remove(m.id)} className="p-2 bg-white border rounded shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>}
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                 <Calendar size={16} className="text-indigo-500"/>
                 <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md">{safeStr(m.date)}</span>
              </div>
              
              <h3 className="font-bold text-slate-800 text-lg mb-3 leading-tight flex-1">{safeStr(m.title)}</h3>
              
              <div className="flex items-start gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                 <Users size={14} className="text-slate-400 mt-1 shrink-0"/>
                 <p className="text-xs font-medium text-slate-600 leading-relaxed line-clamp-3">{safeStr(m.attendees)}</p>
              </div>

              {isAdmin && m.remarks && <p className="text-xs text-slate-500 mb-4 bg-yellow-50 border-l-2 border-yellow-300 pl-2 py-1 italic">{safeStr(m.remarks)}</p>}
              
              {m.minutesLink ? (
                <a href={m.minutesLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 py-3 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100 mt-auto">
                   <LinkIcon size={16}/> Open Minutes Docs
                </a>
              ) : <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center py-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-auto">No Document Link</div>}
           </div>
         ))}
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white rounded-b-3xl">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
              <tr>
                 <SortableHeader label="Date" sortKey="date" currentSort={sortConfig} requestSort={requestSort} />
                 <SortableHeader label="Meeting Title" sortKey="title" currentSort={sortConfig} requestSort={requestSort} />
                 <th className="p-4">Attendees</th>
                 <th className="p-4">Minutes Link</th>
                 {isAdmin && <th className="p-4">Remarks</th>}
                 <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMeetings.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 whitespace-nowrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md">{safeStr(m.date)}</span>
                  </td>
                  <td className="p-4 font-bold text-slate-800">{safeStr(m.title)}</td>
                  <td className="p-4">
                    <div className="text-xs font-medium text-slate-600 line-clamp-2 max-w-sm">{safeStr(m.attendees)}</div>
                  </td>
                  <td className="p-4">
                    {m.minutesLink ? (
                      <a href={m.minutesLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                        <LinkIcon size={12}/> View Docs
                      </a>
                    ) : <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">None</span>}
                  </td>
                  {isAdmin && <td className="p-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={m.remarks}>{m.remarks}</td>}
                  <td className="p-4 text-right">
                     <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => openEditModal(m)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                       {isAdmin && <button onClick={() => remove(m.id)} className="p-2 bg-white rounded border shadow-sm text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             const data = { 
                 date: fd.get('date') || '', title: fd.get('title') || '', 
                 attendees: fd.get('attendees') || '', minutesLink: fd.get('minutesLink') || '',
                 remarks: fd.get('remarks') || ''
             };
             if (editingItem) update(editingItem.id, data); else add(data);
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit Meeting' : 'Log New Meeting'}</h3>
              <input name="date" type="date" defaultValue={editingItem?.date} required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium text-slate-700"/>
              <input name="title" defaultValue={editingItem?.title} placeholder="Meeting Title" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
              <textarea name="attendees" defaultValue={editingItem?.attendees} placeholder="Attendees (Comma separated)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none h-24 resize-none font-medium"></textarea>
              <input name="minutesLink" defaultValue={editingItem?.minutesLink} placeholder="URL Link to Minutes Document" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium text-blue-600"/>
              {isAdmin && <input name="remarks" defaultValue={editingItem?.remarks} placeholder="Admin Remarks (Optional)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium bg-slate-50 text-slate-700"/>}
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-colors">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: BUDGET MANAGER (Admin Only) ---
const BudgetManager = ({ dataObj, notify }) => {
    const { data: budget = [], add, update, remove } = dataObj;
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);

    const filteredBudget = budget.filter(b => {
        const matchStatus = filterStatus === 'All' || safeStr(b.status).trim().toLowerCase() === filterStatus.toLowerCase();
        const matchSearch = safeStr(b.item).toLowerCase().includes(searchTerm.toLowerCase());
        return matchStatus && matchSearch;
    });

    const { items: sortedBudget, requestSort, sortConfig } = useSortableData(filteredBudget, { key: 'amount', direction: 'descending' });

    const totalSpent = filteredBudget.reduce((a, b) => a + Number(b.amount || 0), 0);
    const overallSpent = budget.reduce((a, b) => a + Number(b.amount || 0), 0);

    const handleBulkUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvData = parseCSV(event.target.result);
          let count = 0;
          csvData.forEach(row => {
            const item = row.item || row['budget item'];
            if(item) {
              add({
                item: item,
                amount: Number(row.amount?.replace(/[^0-9.-]+/g,"")) || 0,
                status: row.status || 'Pending',
                remarks: row.remarks || ''
              });
              count++;
            }
          });
          notify(`Imported ${count} budget items!`, 'success');
        };
        reader.readAsText(file);
    };

    const openEditModal = (item = null) => {
        setEditingItem(item);
        setShowModal(true);
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="bg-white rounded-3xl border shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="p-8 border-b flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-50/50">
                    <div><h2 className="text-2xl font-black text-slate-800">Event Budget</h2><p className="text-slate-500">Financial Tracking (Admin Only)</p></div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl max-w-[200px] mr-1">
                            <Search size={16} className="text-slate-400 mr-2 shrink-0"/>
                            <input placeholder="Search items..." className="bg-transparent outline-none text-sm font-medium w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                        </div>
                        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 mr-2">
                            <Filter size={14} className="text-slate-400 mr-2"/>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer">
                                <option value="All">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Paid">Paid</option>
                            </select>
                        </div>
                        <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleBulkUpload}/>
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden md:inline">Import</span></button>
                        <button onClick={() => exportToCSV(budget, 'nid-budget', notify)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden md:inline">Export</span></button>
                        <button onClick={() => openEditModal()} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-green-700 transition-colors"><Plus size={16}/> Add Expense</button>
                    </div>
                </div>
                
                <div className="p-8 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-sm relative overflow-hidden">
                            <div className="absolute right-0 top-0 opacity-10"><DollarSign size={100}/></div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">Total Budget Allocation</div>
                            <div className="text-4xl font-black text-green-900">₱{overallSpent.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto px-8 pb-8">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10">
                            <tr>
                                <SortableHeader label="Item / Expense" sortKey="item" currentSort={sortConfig} requestSort={requestSort} className="rounded-tl-xl" />
                                <SortableHeader label="Amount" sortKey="amount" currentSort={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} requestSort={requestSort} />
                                <th className="p-4 text-right rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedBudget.map(b => (
                                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4 font-bold text-slate-800 text-base">
                                        {safeStr(b.item)}
                                        {b.remarks && <div className="text-xs font-medium text-slate-400 mt-1">{safeStr(b.remarks)}</div>}
                                    </td>
                                    <td className="p-4 font-black text-slate-700">₱{Number(b.amount || 0).toLocaleString()}</td>
                                    <td className="p-4">
                                        <select value={safeStr(b.status).trim() || 'Pending'} onChange={(e) => update(b.id, { status: e.target.value })} 
                                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border outline-none cursor-pointer transition-colors
                                            ${safeStr(b.status).trim() === 'Paid' ? 'bg-green-50 border-green-200 text-green-600' : safeStr(b.status).trim() === 'Approved' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                                            <option value="Pending">Pending</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Paid">Paid</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-right">
                                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={() => openEditModal(b)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                                         <button onClick={() => remove(b.id)} className="p-2 bg-white rounded border shadow-sm text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                       </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <form onSubmit={e => {
                    e.preventDefault();
                    const fd = new FormData(e.target);
                    const data = { 
                        item: fd.get('item') || '', amount: Number(fd.get('amount')) || 0, 
                        status: fd.get('status') || 'Pending', remarks: fd.get('remarks') || ''
                    };
                    if (editingItem) update(editingItem.id, data); else add(data);
                    setShowModal(false);
                }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
                    <h3 className="text-xl font-bold text-green-900">{editingItem ? 'Edit Expense' : 'Log Expense'}</h3>
                    <input name="item" defaultValue={editingItem?.item} placeholder="Expense Item" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                    <div className="relative">
                        <span className="absolute left-4 top-4 font-black text-slate-400">₱</span>
                        <input name="amount" defaultValue={editingItem?.amount} type="number" placeholder="Amount" required className="w-full p-4 pl-10 border border-slate-200 rounded-2xl outline-none font-black text-slate-700"/>
                    </div>
                    <select name="status" defaultValue={editingItem?.status || 'Pending'} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-bold text-slate-600">
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                    </select>
                    <input name="remarks" defaultValue={editingItem?.remarks} placeholder="Notes / Remarks" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                    <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-green-700 transition-colors">Save</button>
                        <button type="button" onClick={()=>setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                    </div>
                </form>
                </div>
            )}
        </div>
    );
};

// --- SETTINGS PANEL ---
const SettingsPanel = ({ onBackup, onReset, notify }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className="bg-white rounded-3xl border shadow-sm p-8 max-w-2xl mx-auto mt-10 relative">
       <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><Settings className="text-slate-400"/> System Settings</h2>
       <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50 flex justify-between items-center">
             <div><h3 className="font-bold text-blue-900">System Backup</h3><p className="text-sm text-blue-700/70">Download a complete snapshot of all data.</p></div>
             <button onClick={onBackup} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Database size={18}/> Backup JSON</button>
          </div>
          <div className="p-6 rounded-2xl border border-red-100 bg-red-50/50 flex justify-between items-center">
             <div><h3 className="font-bold text-red-900">Factory Reset</h3><p className="text-sm text-red-700/70">Wipe all current data. Cannot be undone.</p></div>
             <button onClick={() => setShowConfirm(true)} className="bg-white border-2 border-red-100 text-red-600 px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-50 transition-colors"><RotateCcw size={18}/> Reset System</button>
          </div>
       </div>
       {showConfirm && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full">
               <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4"><Lock size={24}/></div>
               <h3 className="text-xl font-black mb-2">Security Check</h3>
               <p className="text-slate-500 text-sm mb-6">Enter admin password to confirm reset.</p>
               <form onSubmit={e => {
                  e.preventDefault();
                  if(e.target.pwd.value === 'admin2026') { onReset(); setShowConfirm(false); notify("System reset successful", "success"); }
                  else notify("Incorrect password", "error");
               }}>
                  <input name="pwd" type="password" placeholder="Admin Password" autoFocus className="w-full p-4 border rounded-xl mb-4 outline-none font-bold"/>
                  <div className="flex gap-2">
                     <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-colors">Confirm Reset</button>
                     <button type="button" onClick={() => setShowConfirm(false)} className="px-4 py-3 text-slate-500 font-bold transition-colors hover:text-slate-800">Cancel</button>
                  </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
};

// --- COMPONENT: RISKS ---
const Risks = ({ tasks = [], manualRisks = [], setManualRisks, notify }) => {
    const overdue = tasks.filter(t => safeStr(t.status).trim() === 'Overdue');
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-6 h-full overflow-y-auto pb-10">
            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl shadow-sm flex justify-between items-center">
                <h2 className="text-3xl font-black text-red-800 mb-2 flex items-center"><AlertTriangle className="mr-3" /> Risk Register</h2>
                <button onClick={() => setShowModal(true)} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-red-700 transition-colors"><Plus size={16}/> Add Manual Risk</button>
            </div>
            
            {overdue.map(t => (
                <div key={t.id} className="bg-white p-6 rounded-2xl border-l-8 border-red-500 shadow-sm flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">{safeStr(t.name)} is <span className="text-red-600">Overdue</span></h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Assigned to: {Array.isArray(t.assignedTo) ? t.assignedTo.join(', ') : safeStr(t.assignedTo)}</p>
                    </div>
                    <AlertCircle className="text-red-200 opacity-50" size={40}/>
                </div>
            ))}
            
            {manualRisks.map(r => (
               <div key={r.id} className="bg-white p-6 rounded-2xl border-l-8 border-orange-500 shadow-sm flex justify-between items-center">
                  <div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">{safeStr(r.name)}</h3>
                      <p className="text-sm font-medium text-slate-500">{safeStr(r.desc)}</p>
                  </div>
                  <AlertTriangle className="text-orange-200 opacity-50" size={30}/>
               </div>
            ))}

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <form onSubmit={e => {
                    e.preventDefault();
                    setManualRisks({ name: e.target.name.value, desc: e.target.desc.value, type: 'Manual' });
                    setShowModal(false);
                    notify("Risk added successfully", "success");
                }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
                    <h3 className="text-xl font-bold text-red-900">Add Manual Risk</h3>
                    <input name="name" placeholder="Risk Title" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                    <input name="desc" placeholder="Description/Mitigation" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                    <button type="submit" className="w-full bg-red-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-red-700 transition-colors">Save Risk</button>
                    <button type="button" onClick={()=>setShowModal(false)} className="w-full text-slate-500 p-2 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                </form>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP ---
const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [toast, setToast] = useState(null);

  // Initialize Data Hooks
  const tasksHook = useDataSync('tasks', INITIAL_TASKS);
  const speakersHook = useDataSync('speakers', INITIAL_SPEAKERS);
  const attendeesHook = useDataSync('attendees', INITIAL_ATTENDEES);
  const orgHook = useDataSync('org', INITIAL_ORG);
  const programHook = useDataSync('program', INITIAL_PROGRAM);
  const risksHook = useDataSync('risks', []);
  const budgetHook = useDataSync('budget', INITIAL_BUDGET);
  const meetingsHook = useDataSync('meetings', INITIAL_MEETINGS);

  const todayStr = new Date().toISOString().split('T')[0];
  const globalProcessedTasks = useMemo(() => {
     if(!tasksHook.data) return [];
     return tasksHook.data.map(t => {
         if (safeStr(t.status).trim() !== 'Complete' && t.endDate && t.endDate < todayStr) {
             return { ...t, status: 'Overdue' };
         }
         return t;
     });
  }, [tasksHook.data, todayStr]);

  const notify = (message, type = 'info') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
  };

  const teamMembers = useMemo(() => {
    if (!orgHook.data) return [];
    const names = orgHook.data.map(m => safeStr(m.name).trim());
    return [...new Set(names)].sort();
  }, [orgHook.data]);

  const handleBackup = () => {
    const allData = {
        tasks: tasksHook.data,
        speakers: speakersHook.data,
        attendees: attendeesHook.data,
        org: orgHook.data,
        program: programHook.data,
        risks: risksHook.data,
        budget: budgetHook.data,
        meetings: meetingsHook.data,
        timestamp: new Date().toISOString()
    };
    downloadBackup(allData);
    notify("Backup downloaded successfully", "success");
  };

  const handleReset = () => {
      tasksHook.reset();
      speakersHook.reset();
      attendeesHook.reset();
      orgHook.reset();
      programHook.reset();
      risksHook.reset();
      budgetHook.reset();
      meetingsHook.reset();
  };

  const menu = [
    { id: 'home', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'tasks', icon: CheckSquare, label: 'Task Board' },
    { id: 'org', icon: Users, label: 'Org Structure' },
    { id: 'program', icon: Calendar, label: 'Program' },
    { id: 'speakers', icon: Mic2, label: 'Speakers & VIPs' },
    { id: 'guests', icon: UserCheck, label: 'Guest List' },
    { id: 'meetings', icon: Video, label: 'Meetings' },
    { id: 'risks', icon: AlertTriangle, label: 'Risks' },
  ];

  if(isAdmin) {
      menu.push({ id: 'budget', icon: DollarSign, label: 'Budget' });
      menu.push({ id: 'settings', icon: Settings, label: 'Settings' });
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-blue-100 overflow-hidden">
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="w-20 md:w-64 bg-[#0f172a] text-white flex flex-col shrink-0 transition-all duration-300 shadow-2xl z-20">
        <div className="p-8 font-black text-2xl tracking-tighter bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent cursor-pointer" onClick={()=>setActiveTab('home')}>NID 2026</div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar-dark">
           {menu.map(m => {
             const Icon = m.icon;
             return (
               <button key={m.id} onClick={() => setActiveTab(m.id)} className={`w-full flex items-center p-3.5 rounded-2xl transition-all duration-200 group ${activeTab === m.id ? 'bg-blue-600 shadow-xl shadow-blue-600/20 text-white' : 'hover:bg-slate-800/50 text-slate-400 hover:text-white'}`}>
                  <Icon size={20} className={activeTab === m.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
                  <span className="hidden md:block ml-3 font-bold text-sm tracking-wide">{m.label}</span>
               </button>
             );
           })}
        </nav>
        <div className="p-4 border-t border-slate-800/50">
          <button onClick={() => { if(isAdmin) { setIsAdmin(false); setActiveTab('home'); notify("Logged out of Admin mode"); } else setShowLogin(true); }} className={`w-full p-4 rounded-2xl transition-all duration-200 flex items-center ${isAdmin ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
             {isAdmin ? <Unlock size={18}/> : <Lock size={18}/>}
             <span className="hidden md:block ml-3 text-[10px] font-black uppercase tracking-widest">{isAdmin ? 'Logout' : 'Admin Access'}</span>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {!isFirebaseConfigured && (
           <div className="bg-orange-500 text-white text-[10px] font-black tracking-widest text-center py-1.5 px-4 uppercase animate-pulse">Demo Mode: Connect Firebase Config in code for Live Sync</div>
        )}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50/50 custom-scrollbar">
           <div className="max-w-7xl mx-auto h-full relative">
              <div className={`h-full ${activeTab === 'home' ? 'block animate-fade-in' : 'hidden'}`}>
                  <DashboardHome tasks={globalProcessedTasks} setActiveTab={setActiveTab} speakers={speakersHook.data} attendees={attendeesHook.data} budget={budgetHook.data} isAdmin={isAdmin} />
              </div>
              <div className={`h-full ${activeTab === 'tasks' ? 'block animate-fade-in' : 'hidden'}`}>
                  <TaskManager dataObj={{...tasksHook, data: globalProcessedTasks}} isAdmin={isAdmin} committees={INITIAL_COMMITTEES} teamMembers={teamMembers} notify={notify}/>
              </div>
              <div className={`h-full ${activeTab === 'org' ? 'block animate-fade-in' : 'hidden'}`}>
                  <OrgChart dataObj={orgHook} isAdmin={isAdmin} notify={notify} />
              </div>
              <div className={`h-full ${activeTab === 'program' ? 'block animate-fade-in' : 'hidden'}`}>
                  <ProgramManager dataObj={programHook} teamMembers={teamMembers} isAdmin={isAdmin} notify={notify} />
              </div>
              <div className={`h-full ${activeTab === 'speakers' ? 'block animate-fade-in' : 'hidden'}`}>
                  <SpeakerManager dataObj={speakersHook} isAdmin={isAdmin} notify={notify} />
              </div>
              <div className={`h-full ${activeTab === 'guests' ? 'block animate-fade-in' : 'hidden'}`}>
                  <GuestManager attendeesObj={attendeesHook} isAdmin={isAdmin} notify={notify} />
              </div>
              <div className={`h-full ${activeTab === 'meetings' ? 'block animate-fade-in' : 'hidden'}`}>
                  <MeetingTracker dataObj={meetingsHook} isAdmin={isAdmin} notify={notify} />
              </div>
              <div className={`h-full ${activeTab === 'risks' ? 'block animate-fade-in' : 'hidden'}`}>
                  <Risks tasks={globalProcessedTasks} manualRisks={risksHook.data} setManualRisks={risksHook.add} notify={notify} />
              </div>
              <div className={`h-full ${activeTab === 'budget' && isAdmin ? 'block animate-fade-in' : 'hidden'}`}>
                  <BudgetManager dataObj={budgetHook} notify={notify} />
              </div>
              <div className={`h-full ${activeTab === 'settings' && isAdmin ? 'block animate-fade-in' : 'hidden'}`}>
                  <SettingsPanel onBackup={handleBackup} onReset={handleReset} notify={notify} />
              </div>
           </div>
        </div>
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-sm relative border border-slate-200 animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowLogin(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors"><X size={24}/></button>
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6"><Lock size={32}/></div>
              <h2 className="text-3xl font-black mb-2 text-slate-800 tracking-tight text-center">Admin Access</h2>
              <form onSubmit={(e) => {
                 e.preventDefault();
                 if(e.target.password.value === 'admin2026') { setIsAdmin(true); setShowLogin(false); notify("Logged in as Admin", "success"); }
                 else notify('Incorrect password', 'error');
              }} className="space-y-4">
                 <input type="password" name="password" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-lg" placeholder="Enter password" autoFocus/>
                 <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all">Authenticate</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
