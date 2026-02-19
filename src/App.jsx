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
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]).join(",");
  const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(","));
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadBackup = (allData) => {
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(allData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `nid_system_backup_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
};

const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
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

// --- INITIAL DATA ---

const INITIAL_COMMITTEES = [ "Executive Committee", "Programs", "Admin and Coordination", "Procurement and Logistics", "Media and Publicity", "Filipinnovation Awards" ];
const INITIAL_TEAM = [ "Diane", "James", "Jovs", "Art", "Paolo", "Jerome", "Ena", "Ijy", "Gina", "Reg", "Rose", "Cheska", "Camille", "Icon", "Aya", "Jessica", "Flor", "Rog" ];

const SECTORS = [
  "Startup/MSME", "Development Partner", "National Govt Agency", 
  "Academe/Research", "NEDA Regional", "NEDA Central", 
  "Resource Speaker", "HABI Mentor"
];

const INITIAL_ORG = [
  { id: '1', role: "Event Director", name: "Diane Gail L. Maharjan", division: "OED", level: 1 },
  { id: '2', role: "Event Lead", name: "James De Vera", division: "ICPD", level: 2 },
  { id: '3', role: "Event Co-Lead", name: "Jovs Laureta", division: "ICPD", level: 2 },
  { id: '4', role: "Program Lead", name: "Art", division: "ICPD", level: 3 },
  { id: '5', role: "Media Lead", name: "Paolo Mejia", division: "ICPD", level: 3 },
  { id: '6', role: "Admin Lead", name: "Jerome Garcia", division: "ICPD", level: 3 },
  { id: '7', role: "Procurement Lead", name: "Ena", division: "ICPD", level: 3 },
  { id: '8', role: "DT Focal", name: "Ijy", division: "ICPD", level: 3 },
];

const INITIAL_TASKS = [
  { id: '1', name: "PPT for Filipinnovation Awardees", assignedTo: ["Art", "James"], committee: "Filipinnovation Awards", status: "Not Started", priority: "High", startDate: "2026-04-01", endDate: "2026-04-10" },
  { id: '2', name: "Cash advance processing", assignedTo: ["Art"], committee: "Procurement and Logistics", status: "In Progress", priority: "Medium", startDate: "2026-03-01", endDate: "2026-03-05" },
];

const INITIAL_SPEAKERS = [
  { id: '1', name: "H.E. Nguyen Manh Hung", role: "Minister of Sci & Tech", org: "Govt of Viet Nam", status: "Confirmed", photo: "", email: "minister.hung@gov.vn" },
  { id: '2', name: "Ms. Erika Fille Legara", role: "Director, CAIR", org: "AIM", status: "Confirmed", photo: "", email: "erika.legara@aim.edu" },
];

const INITIAL_ATTENDEES = [
  { id: '1', name: "QBO Innovation Hub", org: "QBO", sector: "Startup/MSME", status: "Confirmed" },
];

const INITIAL_PROGRAM = [
  { id: '1', day: "Day 0", time: "09:00", activity: "Call time at NEDA CO", lead: "James", venue: "NEDA CO", remarks: "Assembly" },
  { id: '2', day: "Day 1", time: "09:00", activity: "Opening Ceremonies", lead: "Programs", venue: "Ballroom", remarks: "VIPs present" },
];

const INITIAL_MEETINGS = [
  { id: '1', date: '2025-01-30', title: 'Core Team Kickoff', attendees: 'James, Jovs, Art, Diane', minutesLink: '' },
];

const INITIAL_BUDGET = [
  { id: '1', item: "Venue Rental", amount: 150000, status: "Paid", remarks: "50% Downpayment" },
];

// --- DATA SYNC HOOK ---
const useDataSync = (collectionName, initialData) => {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (items.length > 0) setData(items); 
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

// --- DASHBOARD HOME ---
const DashboardHome = ({ tasks = [], setActiveTab, speakers = [], attendees = [] }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Complete').length;
  const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
  const confirmedSpeakers = speakers.filter(s => s.status === 'Confirmed').length;
  const confirmedGuests = attendees.filter(a => a.status === 'Confirmed').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayTasks = tasks.filter(t => t.endDate === todayStr);

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

  const sectorStats = useMemo(() => {
    return SECTORS.map(sector => {
       const sectorAttendees = attendees.filter(a => a.sector === sector);
       return {
         name: sector,
         invited: sectorAttendees.length,
         confirmed: sectorAttendees.filter(a => a.status === 'Confirmed').length
       };
    });
  }, [attendees]);

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
                    <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all">
                        <div>
                           <div className="font-bold text-slate-700">{safeStr(t.name)}</div>
                           <div className="text-xs text-slate-400 font-medium mt-1">{safeStr(t.committee)}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <div className="flex -space-x-2">
                                {/* [UPDATED] Loop for multiple assignees icons on Dashboard */}
                                {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white text-blue-600 flex items-center justify-center text-[10px] font-black">{safeStr(a).charAt(0)}</div>
                                )) : <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white text-blue-600 flex items-center justify-center text-[10px] font-black">{safeStr(t.assignedTo).charAt(0)}</div>}
                           </div>
                           <span className={`text-[10px] uppercase font-black tracking-widest ${t.status === 'Complete' ? 'text-green-500' : 'text-orange-500'}`}>{safeStr(t.status)}</span>
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

// --- TASK MANAGER ---
const TaskManager = ({ dataObj, isAdmin, committees = [], teamMembers = [] }) => {
  const { data: tasks = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const [filterCom, setFilterCom] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]); // [NEW] Multiple Assignee State
  const fileInputRef = useRef(null);

  const columns = ['Not Started', 'In Progress', 'Complete', 'Overdue'];

  const filteredTasks = tasks.filter(t => 
    (filterCom === 'All' || t.committee === filterCom) &&
    (safeStr(t.name).toLowerCase().includes(safeStr(search).toLowerCase()))
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
        const name = row['Task Name'] || row['Task'] || row['Name'];
        if (name) {
          // [UPDATED] CSV import now parses assignees from comma-separated strings
          const assigneesRaw = row['Assigned To'] || row['Assignee'] || row['Owner'] || '';
          const assigneesArr = assigneesRaw.split(',').map(a => a.trim()).filter(a => a);

          add({
            name: name,
            assignedTo: assigneesArr.length > 0 ? assigneesArr : ['Unassigned'],
            committee: row['Committee'] || row['Team'] || 'General',
            status: row['Status'] || 'Not Started',
            priority: row['Priority'] || 'Medium',
            startDate: row['Start Date'] || row['Start'] || '',
            endDate: row['End Date'] || row['Due Date'] || row['End'] || ''
          });
          count++;
        }
      });
      alert(`Imported ${count} tasks successfully!`);
    };
    reader.readAsText(file);
  };

  const toggleAssignee = (name) => {
    // [NEW] Checklist logic for multiple assignees
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
             <input placeholder="Search tasks..." className="bg-transparent outline-none text-sm" value={search} onChange={e => setSearch(e.target.value)}/>
           </div>
           {isAdmin && (
             <>
               <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload}/>
               <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white border rounded-xl text-slate-500 hover:text-blue-600 transition-colors" title="Import Tasks CSV"><Upload size={18}/></button>
             </>
           )}
           <button onClick={() => { 
             setEditingTask(null); 
             setSelectedAssignees([]); // Clear assignees for new task
             setShowModal(true); 
            }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={18}/> Add Task</button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="flex-1 overflow-x-auto pb-6">
          <div className="flex gap-6 h-full min-w-[1200px]">
            {columns.map(col => (
              <div key={col} className="flex-1 bg-slate-100/50 rounded-3xl p-4 flex flex-col border border-slate-200"
                   onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col)}>
                 <div className="flex justify-between items-center mb-4 px-2 font-black text-slate-500 text-xs uppercase tracking-widest">
                    <span>{col}</span>
                    <span className="bg-white px-2 py-0.5 rounded-full border shadow-sm">{filteredTasks.filter(t => t.status === col).length}</span>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {filteredTasks.filter(t => t.status === col).map(t => (
                      <div key={t.id} draggable onDragStart={e => handleDragStart(e, t.id)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-xl transition-all group relative">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${t.priority === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>{safeStr(t.priority)}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
                             <button onClick={() => { 
                               setEditingTask(t); 
                               setSelectedAssignees(Array.isArray(t.assignedTo) ? t.assignedTo : [t.assignedTo]);
                               setShowModal(true); 
                            }} className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-blue-600"><Edit2 size={12}/></button>
                             {isAdmin && <button onClick={() => remove(t.id)} className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={12}/></button>}
                          </div>
                        </div>
                        <div className="font-bold text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors">{safeStr(t.name)}</div>
                        
                        {/* [NEW] Assignees Avatar Cloud */}
                        <div className="flex flex-wrap gap-1 mb-4">
                            {Array.isArray(t.assignedTo) ? t.assignedTo.map((a, idx) => (
                                <div key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-100">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 text-white flex items-center justify-center text-[7px]">{safeStr(a).charAt(0)}</div>
                                    {safeStr(a)}
                                </div>
                            )) : <span className="text-xs text-slate-400">{safeStr(t.assignedTo)}</span>}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                           <div className="text-[10px] font-bold text-orange-400 bg-orange-50 px-2 py-0.5 rounded flex items-center gap-1">
                               <Hourglass size={10}/> {getDuration(t.startDate, t.endDate)}d
                           </div>
                           <span className="text-[10px] font-bold text-slate-400">{safeStr(t.endDate)}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            ))}
          </div>
        </div>
      ) : null /* List view can follow same logic */}

      {/* [NEW] Updated Task Modal for Multiple Assignees */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <h3 className="text-2xl font-bold mb-6">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const item = {
                  name: fd.get('name'),
                  assignedTo: selectedAssignees.length > 0 ? selectedAssignees : ['Unassigned'],
                  committee: fd.get('committee'),
                  status: editingTask?.status || 'Not Started',
                  priority: fd.get('priority'),
                  startDate: fd.get('startDate'),
                  endDate: fd.get('endDate')
                };
                if(editingTask) update(editingTask.id, item);
                else add(item);
                setShowModal(false);
              }} className="space-y-4 overflow-y-auto pr-2">
                 <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Task Name</label><input name="name" defaultValue={editingTask?.name} required className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/></div>
                 
                 {/* [NEW] Assignee Multi-Select Checklist */}
                 <div>
                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Assign Multiple Team Members</label>
                    <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto">
                        {teamMembers.map(member => (
                            <label key={member} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                <input type="checkbox" checked={selectedAssignees.includes(member)} onChange={() => toggleAssignee(member)} className="rounded border-slate-300"/>
                                {member}
                            </label>
                        ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Committee</label><select name="committee" defaultValue={editingTask?.committee} className="w-full p-4 border border-slate-200 rounded-2xl outline-none">{committees.map(c => <option key={c}>{c}</option>)}</select></div>
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Priority</label><select name="priority" defaultValue={editingTask?.priority || 'Medium'} className="w-full p-4 border border-slate-200 rounded-2xl outline-none"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Start Date</label><input name="startDate" type="date" defaultValue={editingTask?.startDate} className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/></div>
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Due Date</label><input name="endDate" type="date" defaultValue={editingTask?.endDate} className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/></div>
                 </div>
                 <div className="flex gap-2 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg">Save Task</button>
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

// --- PROGRAM MANAGER ---
const ProgramManager = ({ dataObj, isAdmin }) => {
  const { data: events = [], add, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);
  
  const days = useMemo(() => {
    const d = new Set(events.map(e => e.day));
    return Array.from(d).sort();
  }, [events]);

  // [NEW] Bulk Program Upload Logic
  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      csvData.forEach(row => {
        if(row.Activity) {
          add({
            day: row.Day || 'Day 1',
            time: row.Time || '09:00',
            activity: row.Activity,
            lead: row.Lead || '',
            venue: row.Venue || '',
            remarks: row.Remarks || '',
            isHeader: row.isHeader === 'true'
          });
        }
      });
      alert(`Imported ${csvData.length} agenda items!`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
        <div><h2 className="text-2xl font-black text-slate-800">Program Itinerary</h2><p className="text-slate-500">Scheduled Activities</p></div>
        <div className="flex gap-2">
           {isAdmin && (
             <>
               <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleBulkUpload}/>
               <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white border rounded-xl text-slate-500 hover:text-blue-600 transition-colors" title="Bulk Import CSV"><Upload size={18}/></button>
             </>
           )}
           <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2"><Plus size={16}/> Add Activity</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {days.map(day => (
          <div key={day} className="space-y-6">
            <h3 className="text-lg font-black text-blue-900 border-b-2 border-blue-100 pb-2">{safeStr(day)}</h3>
            <div className="space-y-6 border-l-2 border-slate-100 ml-2 pl-6">
              {events.filter(e => e.day === day).sort((a,b)=>safeStr(a.time).localeCompare(safeStr(b.time))).map(e => (
                <div key={e.id} className="relative group">
                    <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-blue-500"></div>
                    <div className="text-[10px] font-bold text-blue-600 mb-1">{safeStr(e.time)}</div>
                    <h4 className="font-bold text-slate-800 text-sm">{safeStr(e.activity)}</h4>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Lead: {safeStr(e.lead)}</p>
                    {isAdmin && <button onClick={() => remove(e.id)} className="absolute top-0 -right-2 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500"><Trash2 size={12}/></button>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- SPEAKER MANAGER ---
const SpeakerManager = ({ dataObj, isAdmin }) => {
  const { data: speakers = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);

  // [NEW] Bulk Speaker Upload Logic
  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      csvData.forEach(row => {
        if(row.Name) {
          add({
            name: row.Name,
            role: row.Role || '',
            org: row.Org || row.Organization || '',
            photo: row.Photo || '',
            email: row.Email || '',
            status: 'Invited'
          });
        }
      });
      alert(`Imported ${csvData.length} speakers!`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
         <div><h2 className="text-3xl font-black text-slate-800">Speakers & VIPs</h2><p className="text-slate-500">Total VIPs: {speakers.length}</p></div>
         <div className="flex gap-2">
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleBulkUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white border rounded-xl text-slate-500 hover:text-blue-600 transition-colors" title="Bulk Import Speakers"><Upload size={18}/></button>
              </>
            )}
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2"><Plus size={18}/> Add VIP</button>
         </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
          {speakers.map(s => (
            <div key={s.id} className="bg-white border rounded-3xl p-6 hover:shadow-xl transition-all relative group">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl">{safeStr(s.name).charAt(0)}</div>
                    <select value={s.status} onChange={(e) => update(s.id, { status: e.target.value })} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border outline-none cursor-pointer"><option>Invited</option><option>Confirmed</option><option>Declined</option></select>
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{safeStr(s.name)}</h3>
                <p className="text-sm text-blue-600 font-bold mb-2">{safeStr(s.role)}</p>
                <div className="text-xs text-slate-400 font-medium">{safeStr(s.org)}</div>
                {isAdmin && <button onClick={() => remove(s.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}
            </div>
          ))}
      </div>
    </div>
  );
};

// --- GUEST MANAGER ---
const GuestManager = ({ attendeesObj, isAdmin }) => {
  const { data: attendees = [], add, update, remove } = attendeesObj;
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      csvData.forEach(row => {
        if(row.Name) { 
            add({
                name: row.Name,
                org: row.Org || "",
                sector: row.Sector || "Other",
                status: 'Invited'
            });
        }
      });
      alert(`Imported ${csvData.length} guests!`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col gap-6 bg-white rounded-3xl border shadow-sm overflow-hidden">
       <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-slate-800">Guest List</h2>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded border">Total: {attendees.length}</div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload}/>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white border rounded-xl text-slate-500 hover:text-blue-600 transition-colors" title="Import CSV"><Upload size={18}/></button>
              </>
            )}
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2"><Plus size={14}/> Add Attendee</button>
          </div>
       </div>
       <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest sticky top-0 z-10">
                <tr><th className="p-5">Name / Organization</th><th className="p-5">Sector</th><th className="p-5">Status</th><th className="p-5 text-right">Actions</th></tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {attendees.map(g => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors group">
                     <td className="p-5">
                       <div className="font-bold text-slate-700">{safeStr(g.name)}</div>
                       <div className="text-xs text-slate-400 font-medium">{safeStr(g.org)}</div>
                     </td>
                     <td className="p-5"><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{safeStr(g.sector)}</span></td>
                     <td className="p-5">
                        <select value={g.status} onChange={(e) => update(g.id, { status: e.target.value })} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border outline-none bg-white"><option>Invited</option><option>Confirmed</option><option>Declined</option></select>
                     </td>
                     <td className="p-5 text-right">
                       <button onClick={() => remove(g.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
       </div>
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
             <button onClick={onBackup} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><Database size={18}/> Backup Data</button>
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

// --- RISKS & BUDGET STUBS (Maintain previous functionality) ---
const Risks = ({ tasks = [] }) => {
    const overdue = tasks.filter(t => t.status === 'Overdue');
    return (
        <div className="space-y-6 h-full overflow-y-auto">
            <div className="bg-red-50 border border-red-100 p-8 rounded-3xl shadow-sm"><h2 className="text-3xl font-black text-red-800 mb-2 flex items-center"><AlertTriangle className="mr-3" /> Risk Register</h2></div>
            {overdue.map(t => (
                <div key={t.id} className="bg-white p-6 rounded-2xl border-l-8 border-red-500 shadow-sm flex justify-between items-center">
                    <div><h3 className="font-bold text-slate-800">{safeStr(t.name)} is Overdue</h3><p className="text-xs text-slate-400">Assigned: {Array.isArray(t.assignedTo) ? t.assignedTo.join(', ') : t.assignedTo}</p></div>
                </div>
            ))}
        </div>
    );
};

const BudgetManager = ({ dataObj }) => {
    const { data: budget = [], add, remove } = dataObj;
    return (
        <div className="h-full flex flex-col gap-6">
            <div className="bg-white rounded-3xl border shadow-sm flex-1 overflow-hidden p-6">
                <h2 className="text-2xl font-black mb-4">Event Budget</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <div className="text-[10px] font-black uppercase text-blue-400">Total Spent</div>
                        <div className="text-3xl font-black text-blue-900">₱{budget.reduce((a,b)=>a+Number(b.amount||0),0).toLocaleString()}</div>
                    </div>
                </div>
                <table className="w-full text-sm">
                    <thead><tr className="text-left text-[10px] uppercase font-black text-slate-400"><th className="pb-4">Item</th><th className="pb-4">Amount</th></tr></thead>
                    <tbody>{budget.map(b=>(<tr key={b.id} className="border-t border-slate-50"><td className="py-3 font-bold">{b.item}</td><td className="py-3 text-slate-500">₱{Number(b.amount||0).toLocaleString()}</td></tr>))}</tbody>
                </table>
            </div>
        </div>
    );
};

// --- MAIN APP ---
const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
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
    { id: 'program', icon: Calendar, label: 'Program' },
    { id: 'speakers', icon: Mic2, label: 'Speakers' },
    { id: 'guests', icon: UserCheck, label: 'Guest List' },
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
              {activeTab === 'tasks' && <TaskManager dataObj={tasksHook} isAdmin={isAdmin} committees={INITIAL_COMMITTEES} teamMembers={INITIAL_TEAM} />}
              {activeTab === 'program' && <ProgramManager dataObj={programHook} isAdmin={isAdmin} />}
              {activeTab === 'speakers' && <SpeakerManager dataObj={speakersHook} isAdmin={isAdmin} />}
              {activeTab === 'guests' && <GuestManager attendeesObj={attendeesHook} isAdmin={isAdmin} />}
              {activeTab === 'risks' && <Risks tasks={tasksHook.data} />}
              {activeTab === 'budget' && isAdmin && <BudgetManager dataObj={budgetHook} />}
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