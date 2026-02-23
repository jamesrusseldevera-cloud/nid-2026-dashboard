import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, CheckSquare, Users, Calendar, Mic2, DollarSign, 
  AlertTriangle, Menu, X, Clock, CheckCircle2, AlertCircle, 
  UserCheck, Lock, Unlock, Plus, Trash2, Edit2, ArrowRight, 
  Search, BarChart3, Filter, List, Columns, Save, Wifi, WifiOff, Table,
  Download, Upload, FileText, MapPin, Image as ImageIcon, Grid, Mail,
  Video, Link as LinkIcon, PieChart as PieChartIcon, Settings, Database, RotateCcw,
  CalendarClock, Hourglass
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, writeBatch 
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
const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert("No data available to export.");
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

// --- INITIAL DATA CONSTANTS ---
const INITIAL_COMMITTEES = [ "Executive Committee", "Programs", "Admin and Coordination", "Procurement and Logistics", "Media and Publicity", "Filipinnovation Awards" ];

const SECTORS = [
  "Startup/MSME", "Development Partner", "National Govt Agency", 
  "Academe/Research", "NEDA Regional", "NEDA Central", 
  "Resource Speaker", "HABI Mentor"
];

const SPEAKER_DAYS = ["Day 0", "Day 1", "Day 2 (Morning)", "Day 2 (Afternoon)"];
const SPEAKER_ASSIGNMENTS = [
  "TBD", 
  "Opening Remarks", 
  "Closing Remarks", 
  "Scene Setter", 
  "Panelist", 
  "Moderator", 
  "Message from the President", 
  "Keynote Speech", 
  "Message of Support", 
  "Others"
];

const ASEAN_COUNTRIES = [
  { name: "Philippines", flag: "🇵🇭" },
  { name: "Singapore", flag: "🇸🇬" },
  { name: "Malaysia", flag: "🇲🇾" },
  { name: "Indonesia", flag: "🇮🇩" },
  { name: "Thailand", flag: "🇹🇭" },
  { name: "Viet Nam", flag: "🇻🇳" },
  { name: "Brunei Darussalam", flag: "🇧🇳" },
  { name: "Cambodia", flag: "🇰🇭" },
  { name: "Lao PDR", flag: "🇱🇦" },
  { name: "Myanmar", flag: "🇲🇲" },
  { name: "Timor-Leste", flag: "🇹🇱" },
  { name: "International / Other", flag: "🌐" }
];

const INITIAL_ORG = [
  { id: '1', role: "Event Director", name: "Diane Gail L. Maharjan", division: "OED", level: 1 },
  { id: '2', role: "Event Lead", name: "James De Vera", division: "ICPD", level: 2 },
  { id: '3', role: "Event Co-Lead", name: "Jovs Laureta", division: "ICPD", level: 2 }
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

// --- COMPONENT: DASHBOARD HOME ---
const DashboardHome = ({ tasks = [], setActiveTab, speakers = [], attendees = [] }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Complete').length;
  const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
  const confirmedSpeakers = speakers.filter(s => s.status === 'Confirmed').length;
  const confirmedGuests = attendees.filter(a => a.status === 'Confirmed').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter(t => t.endDate === todayStr && t.status !== 'Complete');

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
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
         <h3 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
            <Clock className="text-blue-500" size={20}/> Tasks Due Today ({dueTodayTasks.length})
         </h3>
         {dueTodayTasks.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dueTodayTasks.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer" onClick={() => setActiveTab('tasks')}>
                        <div>
                           <div className="font-bold text-slate-700">{safeStr(t.name)}</div>
                           <div className="text-xs text-slate-400 font-medium mt-1">{safeStr(t.committee)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <div className="flex -space-x-2">
                                {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white text-blue-600 flex items-center justify-center text-[10px] font-black" title={a}>{safeStr(a).charAt(0)}</div>
                                )) : <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white text-blue-600 flex items-center justify-center text-[10px] font-black">{safeStr(t.assignedTo).charAt(0)}</div>}
                           </div>
                           <span className="text-[10px] uppercase font-black tracking-widest text-orange-500">{safeStr(t.status)}</span>
                        </div>
                    </div>
                ))}
             </div>
         ) : (
             <div className="p-6 text-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                <CheckCircle2 className="mx-auto mb-2 opacity-50" size={24}/>
                <p className="text-sm font-bold">No tasks due today. Stay ahead of schedule!</p>
             </div>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Pending Items', val: totalTasks - completedTasks, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
           { label: 'Critical / Overdue', val: overdueTasks, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
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
const OrgChart = ({ dataObj, isAdmin }) => {
  const { data: members = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('tree');
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
            remarks: row.remarks || row.Notes || ''
          });
          count++;
        }
      });
      alert(`Imported ${count} members successfully!`);
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  return (
    <div className="space-y-8 h-full overflow-y-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 border-slate-200">
        <div><h2 className="text-3xl font-black text-slate-800">Organizational Structure</h2><p className="text-slate-500">Event Leadership & Reporting Hierarchy</p></div>
        <div className="flex gap-2">
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleFileUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> Import CSV</button>
                <button onClick={() => exportToCSV(members, 'nid-org-structure')} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> Export</button>
              </>
            )}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
               <button onClick={() => setViewMode('tree')} className={`p-1.5 rounded-md transition-all ${viewMode === 'tree' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Tree View"><Grid size={16}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
            </div>
            {isAdmin && <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2"><Plus size={18}/> Add Member</button>}
        </div>
      </div>
      
      {viewMode === 'tree' ? (
        <div className="relative pt-6 max-w-5xl mx-auto">
          {/* Central Spine */}
          <div className="absolute left-1/2 top-0 bottom-10 w-1 bg-slate-200 -translate-x-1/2 rounded-full hidden md:block"></div>

          {levels.map((level, i) => {
            const lvMembers = members.filter(m => Number(m.level) === level);
            if (lvMembers.length === 0) return null;
            
            return (
              <div key={level} className="relative z-10 flex flex-col items-center mb-16 group">
                  <div className={`px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-8 shadow-md border-2 border-white relative z-20 
                      ${level === 1 ? 'bg-blue-600 text-white' : level === 2 ? 'bg-indigo-500 text-white' : level === 3 ? 'bg-sky-400 text-white' : 'bg-slate-400 text-white'}`}>
                      Level {level}
                  </div>
                  
                  {lvMembers.length > 1 && (
                      <div className="absolute top-[40px] left-[15%] right-[15%] h-1 bg-slate-200 hidden md:block rounded-full"></div>
                  )}

                  <div className="flex flex-wrap justify-center gap-6 w-full relative z-20">
                      {lvMembers.map(m => (
                          <div key={m.id} className="relative flex flex-col items-center">
                              {lvMembers.length > 1 && <div className="hidden md:block w-1 h-6 bg-slate-200 absolute -top-6 rounded-full"></div>}
                              
                              <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 text-center shadow-sm w-52 hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all group/card relative">
                                  {isAdmin && (
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                       <button onClick={() => openEditModal(m)} className="text-slate-400 hover:text-blue-500 bg-slate-50 border p-1 rounded shadow-sm"><Edit2 size={12}/></button>
                                       <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-red-500 bg-slate-50 border p-1 rounded shadow-sm"><Trash2 size={12}/></button>
                                    </div>
                                  )}
                                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-lg 
                                      ${level === 1 ? 'bg-gradient-to-br from-blue-500 to-blue-700' : level === 2 ? 'bg-gradient-to-br from-indigo-400 to-indigo-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                                      {safeStr(m.name).charAt(0)}
                                  </div>
                                  <h4 className="font-bold text-slate-800 text-sm">{safeStr(m.role)}</h4>
                                  <p className="text-blue-600 text-xs font-bold mt-1 line-clamp-1">{safeStr(m.name)}</p>
                                  <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">{safeStr(m.division)}</div>
                                  {isAdmin && m.remarks && <div className="mt-2 text-[9px] text-slate-400 italic flex items-center justify-center gap-1"><AlertCircle size={10}/> {m.remarks}</div>}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white rounded-2xl border border-slate-200 shadow-sm mt-4">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
              <tr><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4">Division</th><th className="p-4 text-center">Level</th>{isAdmin && <th className="p-4">Remarks</th>}{isAdmin && <th className="p-4 text-right">Actions</th>}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.sort((a,b) => a.level - b.level).map(m => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 font-bold text-slate-800">{safeStr(m.name)}</td>
                  <td className="p-4 text-blue-600 font-bold text-xs">{safeStr(m.role)}</td>
                  <td className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{safeStr(m.division)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${m.level === 1 ? 'bg-blue-100 text-blue-700' : m.level === 2 ? 'bg-indigo-100 text-indigo-700' : m.level === 3 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>Level {m.level}</span>
                  </td>
                  {isAdmin && <td className="p-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={m.remarks}>{m.remarks}</td>}
                  {isAdmin && (
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEditModal(m)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                         <button onClick={() => remove(m.id)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  )}
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
                 level: Number(fd.get('level')) || 3, remarks: fd.get('remarks') || '' 
             };
             if (editingItem) update(editingItem.id, data); else add(data);
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
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
const TaskManager = ({ dataObj, isAdmin, committees = [], teamMembers = [] }) => {
  const { data: tasks = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const [search, setSearch] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]); 
  const fileInputRef = useRef(null);

  const columns = ['Not Started', 'In Progress', 'Complete', 'Overdue'];

  const filteredTasks = tasks.filter(t => 
    safeStr(t.name).toLowerCase().includes(safeStr(search).toLowerCase()) ||
    safeStr(t.committee).toLowerCase().includes(safeStr(search).toLowerCase())
  );

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
      alert(`Imported ${count} tasks successfully!`);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div><h2 className="text-3xl font-black text-slate-800">Task Board</h2><p className="text-slate-500">Track deliverables with multiple owners</p></div>
        <div className="flex flex-wrap gap-2">
           <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl">
             <Search size={16} className="text-slate-400 mr-2"/>
             <input placeholder="Search tasks..." className="bg-transparent outline-none text-sm font-medium w-full" value={search} onChange={e => setSearch(e.target.value)}/>
           </div>
           {isAdmin && (
             <>
               <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleFileUpload}/>
               <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden md:inline">Import</span></button>
               <button onClick={() => exportToCSV(tasks, 'nid-tasks')} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden md:inline">Export</span></button>
             </>
           )}
           <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
               <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Board View"><Columns size={16}/></button>
               <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
           </div>
           {isAdmin && <button onClick={() => { 
             setEditingTask(null); 
             setSelectedAssignees([]); 
             setShowModal(true); 
            }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={18}/> Add Task</button>}
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-6 h-full min-w-[1200px]">
            {columns.map(col => (
              <div key={col} className="flex-1 bg-slate-100/70 rounded-3xl p-4 flex flex-col border border-slate-200"
                   onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col)}>
                 <div className="flex justify-between items-center mb-4 px-2 font-black text-slate-500 text-xs uppercase tracking-widest">
                    <span>{col}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full border shadow-sm">{filteredTasks.filter(t => t.status === col).length}</span>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {filteredTasks.filter(t => t.status === col).map(t => (
                    <div key={t.id} draggable={isAdmin} onDragStart={e => handleDragStart(e, t.id)} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-200 transition-all group relative ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:shadow-xl hover:border-blue-300' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${t.priority === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>{safeStr(t.priority)}</span>
                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
                           {isAdmin && <button onClick={() => { 
                             setEditingTask(t); 
                             setSelectedAssignees(Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]);
                             setShowModal(true); 
                          }} className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-blue-600 shadow-sm"><Edit2 size={12}/></button>}
                           {isAdmin && <button onClick={() => remove(t.id)} className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-red-500 shadow-sm"><Trash2 size={12}/></button>}
                        </div>
                      </div>
                      
                      <div className="font-bold text-slate-800 leading-tight mb-3 text-sm">{safeStr(t.name)}</div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-4">
                          {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 bg-blue-50/50 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold border border-blue-100/50">
                                  <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">{safeStr(a).charAt(0)}</div>
                                  {safeStr(a)}
                              </div>
                          )) : <span className="text-xs text-slate-400">{safeStr(t.assignedTo)}</span>}
                      </div>

                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{safeStr(t.committee)}</div>

                      {isAdmin && t.remarks && (
                         <div className="mt-2 mb-3 pt-3 border-t border-slate-50 text-[10px] text-slate-500 italic flex items-start gap-1">
                             <AlertCircle size={12} className="shrink-0 mt-0.5 text-slate-400"/>
                             <span>{t.remarks}</span>
                         </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                         <select 
                            value={t.status} 
                            onChange={(e) => update(t.id, { status: e.target.value })}
                            className="text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer bg-slate-50 text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-100"
                         >
                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>

                         <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1.5 rounded-md border border-slate-100">
                             <CalendarClock size={12} className="text-blue-400"/> 
                             {getDuration(t.startDate, t.endDate)} Days
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
              <tr><th className="p-4">Task Name & Committee</th><th className="p-4">Assigned To</th><th className="p-4">Priority & Duration</th><th className="p-4 w-40">Status</th>{isAdmin && <th className="p-4">Remarks</th>}{isAdmin && <th className="p-4 text-right">Actions</th>}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{safeStr(t.name)}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{safeStr(t.committee)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-100">{safeStr(a)}</span>
                      )) : <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200">{safeStr(t.assignedTo)}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${t.priority === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>{safeStr(t.priority)}</span>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><CalendarClock size={12}/> {getDuration(t.startDate, t.endDate)}d</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <select value={t.status} onChange={(e) => update(t.id, { status: e.target.value })} className="text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer bg-white text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all hover:bg-slate-50 w-full">
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  {isAdmin && <td className="p-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={t.remarks}>{t.remarks}</td>}
                  {isAdmin && (
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingTask(t); setSelectedAssignees(Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]); setShowModal(true); }} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                        <button onClick={() => remove(t.id)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && isAdmin && (
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
              }} className="space-y-4 overflow-y-auto pr-2">
                 <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Task Name</label><input name="name" defaultValue={editingTask?.name} required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/></div>
                 
                 <div>
                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Assign Team Members</label>
                    <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto">
                        {teamMembers.map(member => (
                            <label key={member} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                <input type="checkbox" checked={selectedAssignees.includes(member)} onChange={() => toggleAssignee(member)} className="rounded text-blue-600 focus:ring-blue-500"/>
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
                 
                 <input name="remarks" defaultValue={editingTask?.remarks} placeholder="Admin Remarks (Optional)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium bg-slate-50 text-slate-700"/>

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
const ProgramManager = ({ dataObj, isAdmin }) => {
  const { data: events = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('timeline');
  const fileInputRef = useRef(null);
  
  const days = useMemo(() => {
    const d = new Set(events.map(e => e.day));
    return Array.from(d).sort();
  }, [events]);

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
      alert(`Imported ${count} agenda items!`);
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
        <div><h2 className="text-2xl font-black text-slate-800">Program Itinerary</h2><p className="text-slate-500">Scheduled Activities & Flow</p></div>
        <div className="flex flex-wrap gap-2">
           {isAdmin && (
             <>
               <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleBulkUpload}/>
               <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden md:inline">Import</span></button>
               <button onClick={() => exportToCSV(events, 'nid-program')} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden md:inline">Export</span></button>
             </>
           )}
           <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
               <button onClick={() => setViewMode('timeline')} className={`p-1.5 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Timeline View"><List size={16}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
           </div>
           {isAdmin && <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2"><Plus size={16}/> Add Activity</button>}
        </div>
      </div>
      
      {viewMode === 'timeline' ? (
        <div className="flex-1 overflow-auto p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {days.map(day => (
            <div key={day} className="space-y-6">
              <h3 className="text-xl font-black text-blue-900 border-b-2 border-blue-100 pb-2 flex items-center gap-2"><Calendar size={20}/>{safeStr(day)}</h3>
              <div className="space-y-6 border-l-2 border-slate-100 ml-3 pl-6">
              {events.filter(e => e.day === day).sort((a,b)=>safeStr(a.time).localeCompare(safeStr(b.time))).map(e => (
                <div key={e.id} className="relative group">
                    <div className={`absolute -left-[35px] top-1.5 w-4 h-4 rounded-full border-4 ${e.isHeader ? 'bg-blue-600 border-blue-200' : 'bg-white border-blue-500'}`}></div>
                    <div className="text-[10px] font-bold text-blue-600 mb-1 tracking-widest bg-blue-50 inline-block px-2 py-0.5 rounded-md">{safeStr(e.time)}</div>
                    <h4 className={`text-slate-800 ${e.isHeader ? 'font-black text-lg text-blue-900' : 'font-bold text-sm'}`}>{safeStr(e.activity)}</h4>
                    
                    {(e.lead || e.venue) && (
                        <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {e.lead && <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><Users size={10}/> {safeStr(e.lead)}</span>}
                            {e.venue && <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded"><MapPin size={10}/> {safeStr(e.venue)}</span>}
                        </div>
                    )}
                    {e.remarks && <p className="text-xs text-slate-500 mt-2 bg-yellow-50 border-l-2 border-yellow-300 pl-2 py-1 italic">{safeStr(e.remarks)}</p>}
                    
                    {isAdmin && (
                        <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(e)} className="p-1 bg-white border rounded shadow-sm text-slate-300 hover:text-blue-500"><Edit2 size={12}/></button>
                            <button onClick={() => remove(e.id)} className="p-1 bg-white border rounded shadow-sm text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                        </div>
                    )}
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
              <tr><th className="p-4">Day & Time</th><th className="p-4">Activity</th><th className="p-4">Lead & Venue</th><th className="p-4">Remarks</th>{isAdmin && <th className="p-4 text-right">Actions</th>}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.sort((a,b) => {
                 if(a.day === b.day) return safeStr(a.time).localeCompare(safeStr(b.time));
                 return safeStr(a.day).localeCompare(safeStr(b.day));
              }).map(e => (
                <tr key={e.id} className={`hover:bg-slate-50/80 transition-colors group ${e.isHeader ? 'bg-blue-50/30' : ''}`}>
                  <td className="p-4 whitespace-nowrap">
                    <div className="font-bold text-slate-800">{safeStr(e.day)}</div>
                    <div className="text-[10px] font-bold text-blue-600 tracking-widest mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded-md">{safeStr(e.time)}</div>
                  </td>
                  <td className="p-4">
                    <div className={`${e.isHeader ? 'font-black text-blue-900' : 'font-bold text-slate-800'}`}>{safeStr(e.activity)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {e.lead && <span className="flex items-center gap-1"><Users size={10}/> {safeStr(e.lead)}</span>}
                      {e.venue && <span className="flex items-center gap-1"><MapPin size={10}/> {safeStr(e.venue)}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    {e.remarks && <span className="text-xs text-slate-500 bg-yellow-50 border-l-2 border-yellow-300 pl-2 py-1 italic block">{safeStr(e.remarks)}</span>}
                  </td>
                  {isAdmin && (
                    <td className="p-4 text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEditModal(e)} className="p-2 bg-white rounded border shadow-sm text-slate-300 hover:text-blue-500"><Edit2 size={16}/></button>
                         <button onClick={() => remove(e.id)} className="p-2 bg-white rounded border shadow-sm text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                       </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showModal && isAdmin && (
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
              <input name="lead" placeholder="Lead Person / Team" defaultValue={editingItem?.lead} className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium"/>
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
const SpeakerManager = ({ dataObj, isAdmin }) => {
  const { data: speakers = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const fileInputRef = useRef(null);

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
      alert(`Imported ${count} speakers!`);
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <div><h2 className="text-3xl font-black text-slate-800">Speakers & VIPs</h2><p className="text-slate-500">Total VIPs: {speakers.length}</p></div>
         <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleBulkUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> <span className="hidden md:inline">Import</span></button>
                <button onClick={() => exportToCSV(speakers, 'nid-speakers')} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> <span className="hidden md:inline">Export</span></button>
              </>
            )}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2 shadow-sm">
               <button onClick={() => setViewMode('board')} className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Board View"><Columns size={16}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
            </div>
            {isAdmin && <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2"><Plus size={18}/> Add VIP</button>}
         </div>
      </div>
      
      {viewMode === 'board' ? (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-6 h-full min-w-[1200px]">
            {SPEAKER_DAYS.map(day => {
              const columnSpeakers = speakers.filter(s => (s.assignedDay || 'Day 1') === day).sort((a,b) => (a.order || 0) - (b.order || 0));
              
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
                 <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {columnSpeakers.map(s => (
                      <div key={s.id} 
                           draggable={isAdmin} 
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
                           className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 relative group transition-all ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:shadow-xl hover:border-blue-300' : ''}`}>
                          
                          {isAdmin && (
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 md:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  <button onClick={() => openEditModal(s)} className="p-1.5 bg-white border rounded-lg shadow-sm text-slate-400 hover:text-blue-600"><Edit2 size={12}/></button>
                                  <button onClick={() => remove(s.id)} className="p-1.5 bg-white border rounded-lg shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={12}/></button>
                              </div>
                          )}

                          <div className="flex items-center gap-3 pr-12">
                              <div className="relative shrink-0">
                                  {s.photo ? (
                                      <img src={s.photo} alt={s.name} className="w-12 h-12 rounded-full border-2 border-slate-100 object-cover bg-slate-50" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=e0e7ff&color=4f46e5`; }} />
                                  ) : (
                                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-500 rounded-full flex items-center justify-center font-black text-lg border-2 border-indigo-100">{safeStr(s.name).charAt(0)}</div>
                                  )}
                                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${s.status === 'Confirmed' ? 'bg-green-500' : s.status === 'Declined' ? 'bg-red-500' : 'bg-slate-300'}`} title={`Status: ${s.status}`}></div>
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
                              <select value={s.status} onChange={(e) => update(s.id, { status: e.target.value })}
                                  className={`text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-md border outline-none cursor-pointer transition-colors w-24 text-center shrink-0
                                  ${s.status === 'Confirmed' ? 'bg-green-50 border-green-200 text-green-700' : s.status === 'Declined' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                  <option>Invited</option><option>Confirmed</option><option>Declined</option>
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
              <tr><th className="p-4">Speaker</th><th className="p-4">Institution & Country</th><th className="p-4">Assignment</th><th className="p-4 w-40">RSVP Status</th>{isAdmin && <th className="p-4">Remarks</th>}{isAdmin && <th className="p-4 text-right">Actions</th>}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {speakers.sort((a,b) => (a.order||0) - (b.order||0)).map(s => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 flex items-center gap-3">
                    {s.photo ? (
                        <img src={s.photo} alt={s.name} className="w-10 h-10 rounded-full border object-cover shrink-0 bg-slate-50" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=e0e7ff&color=4f46e5`; }} />
                    ) : (
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center font-black text-sm border shrink-0">{safeStr(s.name).charAt(0)}</div>
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
                    <select value={s.status} onChange={(e) => update(s.id, { status: e.target.value })} 
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-colors w-full
                        ${s.status === 'Confirmed' ? 'bg-green-50 border-green-200 text-green-600' : s.status === 'Declined' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                        <option>Invited</option><option>Confirmed</option><option>Declined</option>
                    </select>
                  </td>
                  {isAdmin && <td className="p-4 text-xs text-slate-500 italic max-w-[150px] truncate" title={s.remarks}>{s.remarks}</td>}
                  {isAdmin && (
                    <td className="p-4 text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEditModal(s)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                         <button onClick={() => remove(s.id)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                       </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showModal && isAdmin && (
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
           }} className="bg-white p-8 rounded-3xl w-full max-w-md space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: GUEST MANAGER ---
const GuestManager = ({ attendeesObj, isAdmin }) => {
  const { data: attendees = [], add, update, remove } = attendeesObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
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
                org: row.org || row.organization || row.institution || "",
                sector: row.sector || row.stakeholder || "Other",
                status: row.status || 'Invited',
                remarks: row.remarks || row.Notes || ''
            });
            count++;
        }
      });
      alert(`Imported ${count} guests!`);
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  return (
    <div className="h-full flex flex-col gap-6 bg-white rounded-3xl border shadow-sm overflow-hidden">
       <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-slate-800">Master Guest List</h2>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border shadow-sm">Total: {attendees.length}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleFileUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> Import</button>
                <button onClick={() => exportToCSV(attendees, 'nid-guests')} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> Export</button>
                <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2"><Plus size={16}/> Add Guest</button>
              </>
            )}
          </div>
       </div>
       <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10 border-b border-slate-200">
                <tr><th className="p-5">Name / Organization</th><th className="p-5">Sector</th><th className="p-5 w-40">RSVP Status</th>{isAdmin && <th className="p-5">Remarks</th>}{isAdmin && <th className="p-5 w-24 text-right">Actions</th>}</tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {attendees.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors group">
                     <td className="p-5">
                       <div className="font-bold text-slate-800 text-base">{safeStr(g.name)}</div>
                       <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{safeStr(g.org)}</div>
                     </td>
                     <td className="p-5">
                         <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest inline-block">{safeStr(g.sector)}</span>
                     </td>
                     <td className="p-5">
                        <select value={g.status} onChange={(e) => update(g.id, { status: e.target.value })} 
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-md border outline-none cursor-pointer w-full transition-colors
                            ${g.status === 'Confirmed' ? 'bg-green-50 border-green-200 text-green-600' : g.status === 'Declined' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            <option>Invited</option><option>Confirmed</option><option>Declined</option>
                        </select>
                     </td>
                     {isAdmin && <td className="p-5 text-xs text-slate-500 italic max-w-[150px] truncate" title={g.remarks}>{g.remarks}</td>}
                     {isAdmin && (
                         <td className="p-5 text-right">
                           <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(g)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                                <button onClick={() => remove(g.id)} className="p-2 bg-white rounded border shadow-sm text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                           </div>
                         </td>
                     )}
                  </tr>
                ))}
             </tbody>
          </table>
       </div>

       {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             const data = { 
                 name: fd.get('name') || '', org: fd.get('org') || '', 
                 sector: fd.get('sector') || '', remarks: fd.get('remarks') || '',
                 status: editingItem?.status || 'Invited' 
             };
             if (editingItem) update(editingItem.id, data); else add(data);
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold">{editingItem ? 'Edit Guest' : 'Add Guest'}</h3>
              <input name="name" defaultValue={editingItem?.name} placeholder="Full Name" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
              <input name="org" defaultValue={editingItem?.org} placeholder="Organization" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sector Classification</label>
                 <select name="sector" defaultValue={editingItem?.sector} className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium text-slate-700">
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                 </select>
              </div>
              {isAdmin && <input name="remarks" defaultValue={editingItem?.remarks} placeholder="Admin Remarks (Optional)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium bg-slate-50 text-slate-700"/>}
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: MEETING TRACKER ---
const MeetingTracker = ({ dataObj, isAdmin }) => {
  const { data: meetings = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const fileInputRef = useRef(null);

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
      alert(`Imported ${count} meetings!`);
    };
    reader.readAsText(file);
  };

  const openEditModal = (item = null) => {
      setEditingItem(item);
      setShowModal(true);
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-8 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
        <div><h2 className="text-2xl font-black text-slate-800">Meeting Tracker</h2><p className="text-slate-500">Minutes & Attendance Log</p></div>
        <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleBulkUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> Import</button>
                <button onClick={() => exportToCSV(meetings, 'nid-meetings')} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> Export</button>
              </>
            )}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 mr-2 shadow-sm">
               <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Grid View"><Grid size={16}/></button>
               <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-slate-100 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`} title="Table View"><Table size={16}/></button>
            </div>
            {isAdmin && <button onClick={() => openEditModal()} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2"><Plus size={16}/> Log Meeting</button>}
        </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-auto p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {meetings.map(m => (
             <div key={m.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative group flex flex-col">
              {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(m)} className="p-2 bg-white border rounded shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                      <button onClick={() => remove(m.id)} className="p-2 bg-white border rounded shadow-sm text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
              )}
              
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
              <tr><th className="p-4">Date</th><th className="p-4">Meeting Title</th><th className="p-4">Attendees</th><th className="p-4">Minutes Link</th>{isAdmin && <th className="p-4">Remarks</th>}{isAdmin && <th className="p-4 text-right">Actions</th>}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meetings.sort((a,b) => new Date(b.date) - new Date(a.date)).map(m => (
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
                  {isAdmin && (
                    <td className="p-4 text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEditModal(m)} className="p-2 bg-white rounded border shadow-sm text-slate-400 hover:text-blue-500"><Edit2 size={16}/></button>
                         <button onClick={() => remove(m.id)} className="p-2 bg-white rounded border shadow-sm text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                       </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {showModal && isAdmin && (
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
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: BUDGET MANAGER (Admin Only) ---
const BudgetManager = ({ dataObj }) => {
    const { data: budget = [], add, update, remove } = dataObj;
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const fileInputRef = useRef(null);

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
          alert(`Imported ${count} budget items!`);
        };
        reader.readAsText(file);
    };

    const openEditModal = (item = null) => {
        setEditingItem(item);
        setShowModal(true);
    };

    const totalSpent = budget.reduce((a, b) => a + Number(b.amount || 0), 0);

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="bg-white rounded-3xl border shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="p-8 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                    <div><h2 className="text-2xl font-black text-slate-800">Event Budget</h2><p className="text-slate-500">Financial Tracking (Admin Only)</p></div>
                    <div className="flex flex-wrap gap-2">
                        <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onClick={(e) => e.target.value = null} onChange={handleBulkUpload}/>
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Upload size={16}/> Import</button>
                        <button onClick={() => exportToCSV(budget, 'nid-budget')} className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2"><Download size={16}/> Export</button>
                        <button onClick={() => openEditModal()} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2"><Plus size={16}/> Add Expense</button>
                    </div>
                </div>
                
                <div className="p-8 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-sm relative overflow-hidden">
                            <div className="absolute right-0 top-0 opacity-10"><DollarSign size={100}/></div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-green-600 mb-2">Total Budget Allocation</div>
                            <div className="text-4xl font-black text-green-900">₱{totalSpent.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto px-8 pb-8">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10">
                            <tr><th className="p-4 rounded-tl-xl">Item / Expense</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4 text-right rounded-tr-xl">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {budget.map(b => (
                                <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4 font-bold text-slate-800 text-base">
                                        {safeStr(b.item)}
                                        {b.remarks && <div className="text-xs font-medium text-slate-400 mt-1">{safeStr(b.remarks)}</div>}
                                    </td>
                                    <td className="p-4 font-black text-slate-700">₱{Number(b.amount || 0).toLocaleString()}</td>
                                    <td className="p-4">
                                        <select value={b.status} onChange={(e) => update(b.id, { status: e.target.value })} 
                                            className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border outline-none cursor-pointer transition-colors
                                            ${b.status === 'Paid' ? 'bg-green-50 border-green-200 text-green-600' : b.status === 'Approved' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-orange-50 border-orange-200 text-orange-600'}`}>
                                            <option>Pending</option><option>Approved</option><option>Paid</option>
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
                        <option>Pending</option><option>Approved</option><option>Paid</option>
                    </select>
                    <input name="remarks" defaultValue={editingItem?.remarks} placeholder="Notes / Remarks" className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                    <div className="flex gap-2 pt-4">
                        <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-green-700">Save</button>
                        <button type="button" onClick={()=>setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
                    </div>
                </form>
                </div>
            )}
        </div>
    );
};

// --- SETTINGS PANEL ---
const SettingsPanel = ({ onBackup, onReset }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className="bg-white rounded-3xl border shadow-sm p-8 max-w-2xl mx-auto mt-10 relative">
       <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><Settings className="text-slate-400"/> System Settings</h2>
       <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50 flex justify-between items-center">
             <div><h3 className="font-bold text-blue-900">System Backup</h3><p className="text-sm text-blue-700/70">Download a complete snapshot of all data.</p></div>
             <button onClick={onBackup} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><Database size={18}/> Backup JSON</button>
          </div>
          <div className="p-6 rounded-2xl border border-red-100 bg-red-50/50 flex justify-between items-center">
             <div><h3 className="font-bold text-red-900">Factory Reset</h3><p className="text-sm text-red-700/70">Wipe all current data. Cannot be undone.</p></div>
             <button onClick={() => setShowConfirm(true)} className="bg-white border-2 border-red-100 text-red-600 px-5 py-3 rounded-xl font-bold flex items-center gap-2"><RotateCcw size={18}/> Reset System</button>
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
                  if(e.target.pwd.value === 'admin2026') { onReset(); setShowConfirm(false); }
                  else alert('Incorrect password');
               }}>
                  <input name="pwd" type="password" placeholder="Admin Password" autoFocus className="w-full p-4 border rounded-xl mb-4 outline-none font-bold"/>
                  <div className="flex gap-2">
                     <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg">Confirm Reset</button>
                     <button type="button" onClick={() => setShowConfirm(false)} className="px-4 py-3 text-slate-500 font-bold">Cancel</button>
                  </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
};

// --- COMPONENT: RISKS ---
const Risks = ({ tasks = [], manualRisks = [], setManualRisks, isAdmin }) => {
    const overdue = tasks.filter(t => t.status === 'Overdue');
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-6 h-full overflow-y-auto pb-10">
            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl shadow-sm flex justify-between items-center">
                <h2 className="text-3xl font-black text-red-800 mb-2 flex items-center"><AlertTriangle className="mr-3" /> Risk Register</h2>
                {isAdmin && <button onClick={() => setShowModal(true)} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2"><Plus size={16}/> Add Manual Risk</button>}
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

            {showModal && isAdmin && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <form onSubmit={e => {
                    e.preventDefault();
                    setManualRisks({ name: e.target.name.value, desc: e.target.desc.value, type: 'Manual' });
                    setShowModal(false);
                }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
                    <h3 className="text-xl font-bold text-red-900">Add Manual Risk</h3>
                    <input name="name" placeholder="Risk Title" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                    <input name="desc" placeholder="Description/Mitigation" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none font-medium"/>
                    <button type="submit" className="w-full bg-red-600 text-white p-4 rounded-2xl font-black shadow-lg">Save Risk</button>
                    <button type="button" onClick={()=>setShowModal(false)} className="w-full text-slate-500 p-2 font-bold hover:bg-slate-50 rounded-2xl">Cancel</button>
                </form>
                </div>
            )}
        </div>
    );
};

// --- MAIN APP ---
const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  // Defaulting to true so you can use the Add buttons immediately
  const [isAdmin, setIsAdmin] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  // Initialize Data Hooks
  const tasksHook = useDataSync('tasks', INITIAL_TASKS);
  const speakersHook = useDataSync('speakers', INITIAL_SPEAKERS);
  const attendeesHook = useDataSync('attendees', INITIAL_ATTENDEES);
  const orgHook = useDataSync('org', INITIAL_ORG);
  const programHook = useDataSync('program', INITIAL_PROGRAM);
  const risksHook = useDataSync('risks', []);
  const budgetHook = useDataSync('budget', INITIAL_BUDGET);
  const meetingsHook = useDataSync('meetings', INITIAL_MEETINGS);

  // Derive team members for task assignment from the Org Chart data
  const teamMembers = useMemo(() => {
    if (!orgHook.data) return [];
    const names = orgHook.data.map(m => m.name.split(' ')[0]);
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
      alert("System has been reset to demo state.");
  };

  const menu = [
    { id: 'home', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'tasks', icon: CheckSquare, label: 'Task Board' },
    { id: 'org', icon: Users, label: 'Org Structure' },
    { id: 'program', icon: Calendar, label: 'Program' },
    { id: 'speakers', icon: Mic2, label: 'Speakers' },
    { id: 'guests', icon: UserCheck, label: 'Guest List' },
    { id: 'meetings', icon: Video, label: 'Meetings' },
    { id: 'risks', icon: AlertTriangle, label: 'Risks' },
  ];

  if(isAdmin) {
      menu.push({ id: 'budget', icon: DollarSign, label: 'Budget' });
      menu.push({ id: 'settings', icon: Settings, label: 'Settings' });
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-blue-100">
      <div className="w-20 md:w-64 bg-[#0f172a] text-white flex flex-col shrink-0 transition-all duration-300 shadow-2xl z-20">
        <div className="p-8 font-black text-2xl tracking-tighter bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent cursor-pointer" onClick={()=>setActiveTab('home')}>NID 2026</div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
          <button onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)} className={`w-full p-4 rounded-2xl transition-all duration-200 flex items-center ${isAdmin ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
             {isAdmin ? <Unlock size={18}/> : <Lock size={18}/>}
             <span className="hidden md:block ml-3 text-[10px] font-black uppercase tracking-widest">{isAdmin ? 'Logout' : 'Admin Access'}</span>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {!isFirebaseConfigured && (
           <div className="bg-orange-500 text-white text-[10px] font-black tracking-widest text-center py-1.5 px-4 uppercase animate-pulse">Demo Mode: Connect Firebase Config in code for Live Sync</div>
        )}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50/50">
           <div className="max-w-7xl mx-auto h-full">
              {activeTab === 'home' && <DashboardHome tasks={tasksHook.data} setActiveTab={setActiveTab} speakers={speakersHook.data} attendees={attendeesHook.data} />}
              {activeTab === 'tasks' && <TaskManager dataObj={tasksHook} isAdmin={isAdmin} committees={INITIAL_COMMITTEES} teamMembers={teamMembers} />}
              {activeTab === 'org' && <OrgChart dataObj={orgHook} isAdmin={isAdmin} />}
              {activeTab === 'program' && <ProgramManager dataObj={programHook} isAdmin={isAdmin} />}
              {activeTab === 'speakers' && <SpeakerManager dataObj={speakersHook} isAdmin={isAdmin} />}
              {activeTab === 'guests' && <GuestManager attendeesObj={attendeesHook} isAdmin={isAdmin} />}
              {activeTab === 'risks' && <Risks tasks={tasksHook.data} manualRisks={risksHook.data} setManualRisks={risksHook.add} isAdmin={isAdmin} />}
              {activeTab === 'budget' && isAdmin && <BudgetManager dataObj={budgetHook} />}
              {activeTab === 'meetings' && <MeetingTracker dataObj={meetingsHook} isAdmin={isAdmin} />}
              {activeTab === 'settings' && isAdmin && <SettingsPanel onBackup={handleBackup} onReset={handleReset} />}
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
                 if(e.target.password.value === 'admin2026') { setIsAdmin(true); setShowLogin(false); }
                 else alert('Incorrect password');
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
