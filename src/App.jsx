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

// Safe string converter to prevent "Objects as React child" errors
const safeStr = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return "[Object]";
    }
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
  { id: '1', name: "PPT for Filipinnovation Awardees", assignedTo: "Art", committee: "Filipinnovation Awards", status: "Not Started", priority: "High", startDate: "2026-04-01", endDate: "2026-04-10" },
  { id: '2', name: "Cash advance processing", assignedTo: "Art", committee: "Procurement and Logistics", status: "In Progress", priority: "Medium", startDate: "2026-03-01", endDate: "2026-03-05" },
  { id: '3', name: "Finalize Budget", assignedTo: "Art", committee: "Procurement and Logistics", status: "Complete", priority: "Low", startDate: "2026-02-15", endDate: "2026-02-20" },
  { id: '4', name: "Prizes Procurement", assignedTo: "Art", committee: "Procurement and Logistics", status: "Overdue", priority: "Critical", startDate: "2026-01-15", endDate: "2026-01-25" },
  { id: '5', name: "Special Order Issuance", assignedTo: "Jerome", committee: "Admin and Coordination", status: "In Progress", priority: "High", startDate: "2026-01-20", endDate: "2026-01-30" },
  { id: '6', name: "Challenges per theme definition", assignedTo: "Ijy", committee: "Programs", status: "Not Started", priority: "Medium", startDate: "2026-03-10", endDate: "2026-03-20" },
  { id: '7', name: "Design Thinking Activities Flow", assignedTo: "Gina", committee: "Programs", status: "In Progress", priority: "High", startDate: "2026-03-25", endDate: "2026-04-05" },
  { id: '8', name: "Floor Layout Plan", assignedTo: "Art", committee: "Admin and Coordination", status: "Complete", priority: "Medium", startDate: "2026-02-01", endDate: "2026-02-10" },
  { id: '9', name: "Invitation of Filipinnovation Mentors", assignedTo: "SPID", committee: "Filipinnovation Awards", status: "Not Started", priority: "Medium", startDate: "2026-02-05", endDate: "2026-02-25" },
];

const INITIAL_SPEAKERS = [
  { id: '1', name: "H.E. Nguyen Manh Hung", role: "Minister of Sci & Tech", org: "Govt of Viet Nam", status: "Confirmed", photo: "", email: "minister.hung@gov.vn" },
  { id: '2', name: "Mr. Bambang Brodjonegoro", role: "Dean and CEO", org: "ADBI", status: "Invited", photo: "", email: "bambang@adbi.org" },
  { id: '3', name: "Ms. Erika Fille Legara", role: "Director, CAIR", org: "AIM", status: "Confirmed", photo: "", email: "erika.legara@aim.edu" },
  { id: '4', name: "Mr. Naoto Kanehira", role: "Sr. Digital Dev. Specialist", org: "World Bank", status: "Invited", photo: "", email: "nkanehira@worldbank.org" },
  { id: '5', name: "Mr. Jack Madrid", role: "President & CEO", org: "IBPAP", status: "Confirmed", photo: "", email: "jack.madrid@ibpap.org" },
  { id: '6', name: "Prof. Ho Teck Hua", role: "Founding Exec. Chairman", org: "AI Singapore", status: "Invited", photo: "", email: "th.ho@aisingapore.org" },
  { id: '7', name: "Dr. Mercedita A. Sombilla", role: "Center Director", org: "SEARCA", status: "Confirmed", photo: "", email: "msombilla@searca.org" },
  { id: '8', name: "Dr. Majah-Leah V. Ravago", role: "Center Director", org: "SEAMEO INNOTECH", status: "Invited", photo: "", email: "mlravago@innotech.org" },
  { id: '9', name: "Dr. Fernando B. Garcia Jr.", role: "Center Director", org: "SEAMEO TROPMED", status: "Invited", photo: "", email: "fgarcia@tropmed.org" },
  { id: '10', name: "Ms. Yvonne Pinto", role: "Director General", org: "IRRI", status: "Invited", photo: "", email: "y.pinto@irri.org" },
  { id: '11', name: "Mr. James W. Correia", role: "Capacity Building Assoc.", org: "ADBI", status: "Invited", photo: "", email: "jcorreia@adbi.org" },
  { id: '12', name: "Mr. Dominic Ligot", role: "Chair, AI Ethics", org: "PH AI Business Assoc.", status: "Confirmed", photo: "", email: "doc.ligot@ph-ai.org" },
];

const INITIAL_ATTENDEES = [
  { id: '1', name: "QBO Innovation Hub", org: "QBO", sector: "Startup/MSME", status: "Confirmed" },
  { id: '2', name: "Launchgarage", org: "Launchgarage", sector: "Startup/MSME", status: "Invited" },
  { id: '3', name: "UNDP Philippines", org: "UNDP", sector: "Development Partner", status: "Confirmed" },
  { id: '4', name: "DOST-PCIEERD", org: "DOST", sector: "National Govt Agency", status: "Confirmed" },
  { id: '5', name: "DTI-CIG", org: "DTI", sector: "National Govt Agency", status: "Invited" },
  { id: '6', name: "UP Diliman", org: "UP", sector: "Academe/Research", status: "Confirmed" },
  { id: '7', name: "Ateneo De Manila", org: "ADMU", sector: "Academe/Research", status: "Invited" },
  { id: '8', name: "NEDA Region 1", org: "NRO 1", sector: "NEDA Regional", status: "Confirmed" },
];

const INITIAL_PROGRAM = [
  { id: '1', day: "Day 0", time: "09:00", activity: "Call time at NEDA CO", lead: "James", venue: "NEDA CO", remarks: "Assembly" },
  { id: '2', day: "Day 0", time: "10:00", activity: "Orientation & Briefing", lead: "James", venue: "NEDA CO", remarks: "All Staff" },
  { id: '3', day: "Day 0", time: "14:00", activity: "Hotel Billeting & Check-in", lead: "Admin Team", venue: "Hotel", remarks: "" },
  { id: '4', day: "Day 0", time: "15:00", activity: "Dry Run with Event Consultant", lead: "Jovs/Art", venue: "Ballroom", remarks: "Tech Check" },
  { id: '5', day: "Day 1", time: "04:00", activity: "Technical Run / Ingress", lead: "Jovs/Ena", venue: "Ballroom", remarks: "" },
  { id: '6', day: "Day 1", time: "07:00", activity: "Opening of Registration", lead: "Jerome", venue: "Lobby", remarks: "" },
  { id: '7', day: "Day 1", time: "08:00", activity: "Opening of Exhibits", lead: "Rose", venue: "Hallway", remarks: "" },
  { id: '8', day: "Day 1", time: "09:00", activity: "Opening Ceremonies", lead: "Programs", venue: "Ballroom", remarks: "VIPs present" },
  { id: '9', day: "Day 2", time: "14:00", activity: "Filipinnovation Awards", lead: "Jessica/Icon", venue: "Ballroom", remarks: "" },
];

const INITIAL_MEETINGS = [
  { id: '1', date: '2025-01-30', title: 'Core Team Kickoff', attendees: 'James, Jovs, Art, Diane', minutesLink: 'http://drive.google.com/...' },
  { id: '2', date: '2025-02-15', title: 'Budget Review', attendees: 'Art, Ena, Finance', minutesLink: '' },
];

const INITIAL_BUDGET = [
  { id: '1', item: "Venue Rental", amount: 150000, status: "Paid", remarks: "50% Downpayment" },
  { id: '2', item: "Catering", amount: 200000, status: "Planned", remarks: "Estimated for 300 pax" },
  { id: '3', item: "Sounds & Lights", amount: 80000, status: "Pending", remarks: "Waiting for quotation" },
  { id: '4', item: "Speaker Tokens", amount: 25000, status: "Paid", remarks: "Purchased" },
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

// --- COMPONENTS ---

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
                <p className="text-blue-400 text-2xl font-bold">AI for Growth, Opportunity, and Sustainability</p>
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
                           <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg">{safeStr(t.assignedTo)}</span>
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

      <div className="bg-white p-8 rounded-3xl border shadow-sm">
         <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-800">Real-time Sector Breakdown</h3>
              <p className="text-sm text-slate-400">Guest distribution across sectors</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><div className="w-3 h-3 bg-slate-200 rounded-sm"></div> Invited</div>
               <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> Confirmed</div>
            </div>
         </div>
         <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectorStats} margin={{top: 20, right: 30, left: 20, bottom: 50}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{fontSize: 10, fontWeight: 'bold'}} />
              <YAxis />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}/>
              <Bar dataKey="invited" name="Invited" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="confirmed" name="Confirmed" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

const BudgetManager = ({ dataObj }) => {
  const { data: budget = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);

  const total = budget.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const paid = budget.filter(i => i.status === 'Paid').reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const pending = total - paid;

  const chartData = [
    { name: 'Paid', value: paid, color: '#22c55e' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
  ];

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-center items-center">
            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-1">Total Budget</h3>
            <div className="text-4xl font-black text-slate-800">₱{total.toLocaleString()}</div>
         </div>
         <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col justify-center items-center">
            <h3 className="text-green-500 font-bold uppercase text-xs tracking-widest mb-1">Paid / Disbursed</h3>
            <div className="text-4xl font-black text-green-600">₱{paid.toLocaleString()}</div>
         </div>
         <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-center gap-6">
             <div className="h-20 w-20">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={chartData} innerRadius={25} outerRadius={35} paddingAngle={5} dataKey="value">
                     {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Utilization</div>
                <div className="text-2xl font-black text-slate-800">{total > 0 ? Math.round((paid/total)*100) : 0}%</div>
             </div>
         </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm flex-1 flex flex-col overflow-hidden">
         <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
            <h3 className="font-black text-slate-800 text-lg">Expense Tracker</h3>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2"><Plus size={16}/> Add Expense</button>
         </div>
         <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 font-black text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 z-10">
                  <tr><th className="p-4">Item</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Remarks</th><th className="p-4 text-right">Action</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {budget.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 group">
                       <td className="p-4 font-bold text-slate-700">{safeStr(b.item)}</td>
                       <td className="p-4 font-mono text-slate-600">₱{Number(b.amount || 0).toLocaleString()}</td>
                       <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${b.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{safeStr(b.status)}</span></td>
                       <td className="p-4 text-slate-500 italic text-xs">{safeStr(b.remarks)}</td>
                       <td className="p-4 text-right"><button onClick={() => remove(b.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
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
             add({ item: fd.get('item'), amount: Number(fd.get('amount')), status: fd.get('status'), remarks: fd.get('remarks') });
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold">Add Budget Item</h3>
              <input name="item" placeholder="Expense Item" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <input name="amount" type="number" placeholder="Amount (PHP)" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <select name="status" className="w-full p-4 border border-slate-200 rounded-2xl outline-none">
                 <option>Planned</option><option>Pending</option><option>Paid</option>
              </select>
              <input name="remarks" placeholder="Remarks" className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

const MeetingTracker = ({ dataObj }) => {
  const { data: meetings = [], add, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="bg-white rounded-3xl border shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
        <div><h2 className="text-2xl font-black text-slate-800">Meeting Tracker</h2><p className="text-slate-500">Minutes & Attendance</p></div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2"><Plus size={16}/> Log Meeting</button>
      </div>
      <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {meetings.map(m => (
           <div key={m.id} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => remove(m.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>
              <div className="flex items-center gap-2 mb-3">
                 <Calendar size={16} className="text-blue-500"/>
                 <span className="text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded">{safeStr(m.date)}</span>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2 leading-tight">{safeStr(m.title)}</h3>
              <div className="flex items-start gap-2 mb-4">
                 <Users size={16} className="text-slate-400 mt-0.5 shrink-0"/>
                 <p className="text-xs text-slate-500 leading-relaxed">{safeStr(m.attendees)}</p>
              </div>
              {m.minutesLink ? (
                <a href={m.minutesLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
                   <LinkIcon size={14}/> View Minutes
                </a>
              ) : <span className="text-xs italic text-slate-400">No link attached</span>}
           </div>
         ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             add({ date: fd.get('date'), title: fd.get('title'), attendees: fd.get('attendees'), minutesLink: fd.get('minutesLink') });
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold">Log New Meeting</h3>
              <input name="date" type="date" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <input name="title" placeholder="Meeting Title" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <textarea name="attendees" placeholder="Attendees (Comma separated)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none h-24 resize-none"></textarea>
              <input name="minutesLink" placeholder="Link to Minutes (GDrive/Sharepoint)" className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

const SettingsPanel = ({ onBackup, onReset }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="bg-white rounded-3xl border shadow-sm p-8 max-w-2xl mx-auto mt-10 relative">
       <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><Settings className="text-slate-400"/> System Settings</h2>
       
       <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/50 flex justify-between items-center">
             <div>
                <h3 className="font-bold text-blue-900">System Backup</h3>
                <p className="text-sm text-blue-700/70">Download a complete JSON snapshot of all tasks, guests, budgets, and speakers.</p>
             </div>
             <button onClick={onBackup} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700 transition-colors"><Database size={18}/> Backup Data</button>
          </div>

          <div className="p-6 rounded-2xl border border-red-100 bg-red-50/50 flex justify-between items-center">
             <div>
                <h3 className="font-bold text-red-900">Factory Reset</h3>
                <p className="text-sm text-red-700/70">Wipe all current data and restore initial demo content. <br/><span className="font-bold">Cannot be undone.</span></p>
             </div>
             <button onClick={() => setShowConfirm(true)} className="bg-white border-2 border-red-100 text-red-600 px-5 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center gap-2"><RotateCcw size={18}/> Reset System</button>
          </div>
       </div>

       {showConfirm && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95">
               <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4"><Lock size={24}/></div>
               <h3 className="text-xl font-black text-slate-800 mb-2">Security Check</h3>
               <p className="text-slate-500 text-sm mb-6">Enter admin password to confirm factory reset. All data will be permanently lost.</p>
               <form onSubmit={e => {
                  e.preventDefault();
                  if(e.target.pwd.value === 'admin2026') {
                     onReset();
                     setShowConfirm(false);
                  } else {
                     alert('Incorrect password');
                  }
               }}>
                  <input name="pwd" type="password" placeholder="Admin Password" autoFocus className="w-full p-4 border border-slate-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-red-500/20 font-bold"/>
                  <div className="flex gap-2">
                     <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-colors">Confirm Reset</button>
                     <button type="button" onClick={() => setShowConfirm(false)} className="px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                  </div>
               </form>
            </div>
         </div>
       )}
    </div>
  );
};

const TaskManager = ({ dataObj, isAdmin, committees = [], teamMembers = [] }) => {
  const { data: tasks = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewMode, setViewMode] = useState('board');
  const [filterCom, setFilterCom] = useState('All');
  const [search, setSearch] = useState('');
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
          add({
            name: name,
            assignedTo: row['Assigned To'] || row['Assignee'] || row['Owner'] || 'Unassigned',
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div><h2 className="text-3xl font-black text-slate-800">Task Board</h2><p className="text-slate-500">Track and manage deliverables</p></div>
        <div className="flex flex-wrap gap-2">
           <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl">
             <Search size={16} className="text-slate-400 mr-2"/>
             <input placeholder="Search tasks..." className="bg-transparent outline-none text-sm" value={search} onChange={e => setSearch(e.target.value)}/>
           </div>
           <select className="bg-white border p-2 rounded-xl text-sm font-bold text-slate-600 outline-none" value={filterCom} onChange={e => setFilterCom(e.target.value)}>
              <option value="All">All Committees</option>
              {committees.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           <button onClick={() => exportToCSV(filteredTasks, 'nid_tasks')} className="p-2.5 bg-white border rounded-xl text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors"><Download size={18}/></button>
           
           <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload}/>
           <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white border rounded-xl text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors" title="Import Tasks CSV"><Upload size={18}/></button>

           <div className="bg-slate-100 p-1 rounded-xl flex">
             <button onClick={() => setViewMode('board')} className={`p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}><Columns size={18}/></button>
             <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}><List size={18}/></button>
           </div>
           <button onClick={() => { setEditingTask(null); setShowModal(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={18}/> Add Task</button>
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
                          <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${t.priority === 'Critical' ? 'bg-red-50 text-red-600' : t.priority === 'High' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'}`}>{safeStr(t.priority)}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
                             <button onClick={() => { setEditingTask(t); setShowModal(true); }} className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-blue-600 hover:shadow-sm"><Edit2 size={12}/></button>
                             {isAdmin && <button onClick={() => remove(t.id)} className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-red-500 hover:shadow-sm"><Trash2 size={12}/></button>}
                          </div>
                        </div>
                        <div className="font-bold text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors">{safeStr(t.name)}</div>
                        <div className="text-[10px] font-bold text-slate-400 mb-4">{safeStr(t.committee)}</div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                <CalendarClock size={12} className="text-blue-400"/>
                                <span className="font-bold">Start: {safeStr(t.startDate) || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                                <Hourglass size={12} className="text-orange-400"/>
                                <span className="font-bold">Duration: {getDuration(t.startDate, t.endDate)}d</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">{safeStr(t.assignedTo).charAt(0)}</div>
                             <span className="text-[10px] font-bold text-slate-600">{safeStr(t.assignedTo)}</span>
                           </div>
                           <span className="text-[10px] font-bold text-slate-300">{safeStr(t.endDate)}</span>
                        </div>
                      </div>
                    ))}
                    {filteredTasks.filter(t => t.status === col).length === 0 && <div className="h-32 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 text-xs font-bold italic">Drag items here</div>}
                 </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 font-black text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 z-10">
               <tr>
                   <th className="p-4">Task Name</th>
                   <th className="p-4">Assignee</th>
                   <th className="p-4">Committee</th>
                   <th className="p-4">Start Date</th>
                   <th className="p-4">Duration</th>
                   <th className="p-4">Status</th>
                   <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {filteredTasks.map(t => (
                 <tr key={t.id} className="hover:bg-slate-50 group">
                    <td className="p-4 font-bold text-slate-800">{safeStr(t.name)}</td>
                    <td className="p-4 text-slate-500">{safeStr(t.assignedTo)}</td>
                    <td className="p-4 text-slate-400 text-xs">{safeStr(t.committee)}</td>
                    <td className="p-4 text-slate-500 text-xs">{safeStr(t.startDate) || '-'}</td>
                    <td className="p-4"><span className="text-[10px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{getDuration(t.startDate, t.endDate)} days</span></td>
                    <td className="p-4"><span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${t.status === 'Complete' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{safeStr(t.status)}</span></td>
                    <td className="p-4 text-right">
                        <div className="flex justify-end gap-3">
                           <button onClick={() => { setEditingTask(t); setShowModal(true); }} className="text-slate-300 hover:text-blue-600"><Edit2 size={16}/></button>
                           {isAdmin && <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
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
           <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-bold mb-6">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const item = {
                  name: fd.get('name'),
                  assignedTo: fd.get('assignedTo'),
                  committee: fd.get('committee'),
                  status: editingTask?.status || 'Not Started',
                  priority: fd.get('priority'),
                  startDate: fd.get('startDate'),
                  endDate: fd.get('endDate')
                };
                if(editingTask) update(editingTask.id, item);
                else add(item);
                setShowModal(false);
              }} className="space-y-4">
                 <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Task Name</label><input name="name" defaultValue={editingTask?.name} placeholder="Task Name" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/></div>
                 <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Assignee</label><select name="assignedTo" defaultValue={editingTask?.assignedTo} className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500">{teamMembers.map(t => <option key={t}>{t}</option>)}</select></div>
                   <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Committee</label><select name="committee" defaultValue={editingTask?.committee} className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500">{committees.map(c => <option key={c}>{c}</option>)}</select></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Start Date</label><input name="startDate" type="date" defaultValue={editingTask?.startDate} className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/></div>
                    <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Due Date</label><input name="endDate" type="date" defaultValue={editingTask?.endDate} className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/></div>
                 </div>
                 <div><label className="text-xs font-bold uppercase text-slate-400 ml-1">Priority</label><select name="priority" defaultValue={editingTask?.priority || 'Medium'} className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
                 <div className="flex gap-2 pt-4">
                    <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Save Task</button>
                    <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

const OrgChart = ({ dataObj, isAdmin }) => {
  const { data: members = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div><h2 className="text-3xl font-black text-slate-800">Org Structure</h2><p className="text-slate-500">Event Leadership Team</p></div>
        {isAdmin && <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2"><Plus size={18}/> Add Member</button>}
      </div>
      
      <div className="space-y-10">
        {[1, 2, 3, 4].map(level => {
          const lvMembers = members.filter(m => Number(m.level) === level);
          if (lvMembers.length === 0) return null;
          return (
            <div key={level} className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-center">
              {lvMembers.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm relative group">
                  {isAdmin && <button onClick={() => remove(m.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center font-bold text-white ${level === 1 ? 'bg-blue-600' : level === 2 ? 'bg-teal-500' : 'bg-slate-400'}`}>{safeStr(m.name).charAt(0)}</div>
                  <h4 className="font-bold text-slate-800">{safeStr(m.role)}</h4>
                  <p className="text-blue-600 text-sm font-medium">{safeStr(m.name)}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{safeStr(m.division)}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             add({ name: fd.get('name'), role: fd.get('role'), division: fd.get('division'), level: Number(fd.get('level')) });
             setShowModal(false);
           }} className="bg-white p-8 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold">Add Team Member</h3>
              <input name="name" placeholder="Name" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/>
              <input name="role" placeholder="Role (e.g. Lead)" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/>
              <input name="division" placeholder="Division (e.g. ICPD)" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/>
              <select name="level" className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500">
                 <option value="1">Director (Lv 1)</option>
                 <option value="2">Lead (Lv 2)</option>
                 <option value="3">Member (Lv 3)</option>
                 <option value="4">Support (Lv 4)</option>
              </select>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg shadow-blue-500/20">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

const ProgramManager = ({ dataObj, isAdmin }) => {
  const { data: events = [], add, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  
  const days = useMemo(() => {
    const d = new Set(events.map(e => e.day));
    return Array.from(d).sort();
  }, [events]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
        <div><h2 className="text-2xl font-black text-slate-800">Program Itinerary</h2><p className="text-slate-500">Scheduled Activities</p></div>
        <div className="flex gap-2">
           <button onClick={() => exportToCSV(events, 'nid_itinerary')} className="p-2.5 bg-white border rounded-xl text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors" title="Download Itinerary"><Download size={18}/></button>
           <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={16}/> Add Activity</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {days.map(day => (
          <div key={day} className="space-y-6">
            <h3 className="text-lg font-black text-blue-900 border-b-2 border-blue-100 pb-2 flex justify-between items-center">
              {safeStr(day)}
            </h3>
            <div className="space-y-6 border-l-2 border-slate-100 ml-2 pl-6">
              {events.filter(e => e.day === day).sort((a,b)=>safeStr(a.time).localeCompare(safeStr(b.time))).map(e => (
                <div key={e.id} className={`relative group ${e.isHeader ? 'mt-8 mb-4' : ''}`}>
                  {e.isHeader ? (
                    <div className="text-blue-900 font-black text-lg border-b border-blue-100 pb-1 mb-2">{safeStr(e.activity)}</div>
                  ) : (
                    <>
                      <div className="absolute -left-[33px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-blue-500"></div>
                      <div className="flex gap-2 mb-1">
                        <div className="text-[10px] font-bold text-blue-600 bg-blue-50 w-fit px-2 rounded">{safeStr(e.time)}</div>
                        {e.venue && <div className="text-[10px] font-bold text-slate-500 bg-slate-100 w-fit px-2 rounded flex items-center gap-1"><MapPin size={8}/> {safeStr(e.venue)}</div>}
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm leading-tight">{safeStr(e.activity)}</h4>
                      <div className="flex justify-between items-end mt-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Lead: {safeStr(e.lead)}</div>
                        {e.remarks && <div className="text-[10px] text-orange-500 italic bg-orange-50 px-2 rounded">{safeStr(e.remarks)}</div>}
                      </div>
                    </>
                  )}
                  {isAdmin && <button onClick={() => remove(e.id)} className="absolute top-0 -right-2 opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"><Trash2 size={14}/></button>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             add({ 
                day: fd.get('day'), 
                time: fd.get('time'), 
                activity: fd.get('activity'), 
                lead: fd.get('lead'),
                venue: fd.get('venue'),
                remarks: fd.get('remarks'),
                isHeader: fd.get('isHeader') === 'on'
             });
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold">Add Event</h3>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Day</label>
                <input name="day" list="dayOptions" placeholder="e.g. Day 1" required className="w-full p-3 border border-slate-200 rounded-xl outline-none"/>
                <datalist id="dayOptions">
                  <option value="Day 0"/><option value="Day 1"/><option value="Day 2"/>
                </datalist>
              </div>
              <div className="flex items-center gap-2">
                 <input type="checkbox" name="isHeader" id="isHeader" className="w-4 h-4"/>
                 <label htmlFor="isHeader" className="text-sm font-bold text-slate-600">Is this a Section Header?</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input name="time" type="time" className="w-full p-3 border border-slate-200 rounded-xl outline-none"/>
                <input name="venue" placeholder="Venue" className="w-full p-3 border border-slate-200 rounded-xl outline-none"/>
              </div>
              <input name="activity" placeholder="Activity Name" required className="w-full p-3 border border-slate-200 rounded-xl outline-none"/>
              <input name="lead" placeholder="Lead Person" className="w-full p-3 border border-slate-200 rounded-xl outline-none"/>
              <input name="remarks" placeholder="Remarks" className="w-full p-3 border border-slate-200 rounded-xl outline-none"/>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg">Add</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

const GuestManager = ({ attendeesObj, isAdmin }) => {
  const { data: attendees = [], add, update, remove } = attendeesObj;
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = parseCSV(event.target.result);
      csvData.forEach(row => {
        if(row.Name || row.name) { 
            add({
                name: row.Name || row.name || "Unknown",
                org: row.Org || row.org || row.Organization || "",
                sector: row.Sector || row.sector || "Other",
                status: 'Invited'
            });
        }
      });
      alert(`Imported ${csvData.length} attendees!`);
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
            <button onClick={() => exportToCSV(attendees, 'nid_guests')} className="p-2 bg-white border rounded-xl text-slate-500 hover:text-blue-600 transition-colors" title="Download CSV"><Download size={18}/></button>
            <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload}/>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white border rounded-xl text-slate-500 hover:text-blue-600 transition-colors" title="Import CSV"><Upload size={18}/></button>
            <button onClick={() => { setEditingGuest(null); setShowModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={14}/> Add Attendee</button>
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
                     <td className="p-5">
                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">{safeStr(g.sector)}</span>
                     </td>
                     <td className="p-5">
                        <select 
                           value={g.status} 
                           onChange={(e) => update(g.id, { status: e.target.value })}
                           className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border outline-none cursor-pointer hover:brightness-95 transition-all ${g.status === 'Confirmed' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-500'}`}
                        >
                           <option>Invited</option>
                           <option>Confirmed</option>
                           <option>Declined</option>
                        </select>
                     </td>
                     <td className="p-5 text-right">
                       <div className="flex justify-end gap-2">
                          <button onClick={() => { setEditingGuest(g); setShowModal(true); }} className="text-slate-300 hover:text-blue-600 p-2"><Edit2 size={16}/></button>
                          {isAdmin && <button onClick={() => remove(g.id)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>}
                       </div>
                     </td>
                  </tr>
                ))}
                {attendees.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-slate-400 font-bold">No attendees found.</td></tr>}
             </tbody>
          </table>
       </div>

       {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
           <form onSubmit={e => {
             e.preventDefault();
             const fd = new FormData(e.target);
             const item = { 
               name: fd.get('name'), 
               org: fd.get('org'), 
               sector: fd.get('sector'),
               status: 'Invited' 
             };
             if (editingGuest) update(editingGuest.id, item);
             else add(item);
             setShowModal(false);
           }} className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold">{editingGuest ? 'Edit Attendee' : 'Add Attendee'}</h3>
              <input name="name" defaultValue={editingGuest?.name} placeholder="Full Name" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/>
              <input name="org" defaultValue={editingGuest?.org} placeholder="Organization" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"/>
              <div className="space-y-1">
                 <label className="text-xs font-bold uppercase text-slate-400 ml-1">Sector</label>
                 <select name="sector" defaultValue={editingGuest?.sector} className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500">
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                 </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

const SpeakerManager = ({ dataObj, isAdmin }) => {
  const { data: speakers = [], add, update, remove } = dataObj;
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [editingSpeaker, setEditingSpeaker] = useState(null);

  const getStatusColor = (status) => {
      switch(status) {
          case 'Confirmed': return 'bg-green-50 border-green-200';
          case 'Declined': return 'bg-red-50 border-red-200';
          case 'Pending': return 'bg-orange-50 border-orange-200';
          default: return 'bg-white border-slate-200';
      }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
         <div><h2 className="text-3xl font-black text-slate-800">Speakers & VIPs</h2><p className="text-slate-500">Confirmed: {speakers.filter(s => s.status === 'Confirmed').length}</p></div>
         <div className="flex gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}><Grid size={18}/></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}><List size={18}/></button>
            </div>
            <button onClick={() => exportToCSV(speakers, 'nid_speakers')} className="p-2.5 bg-white border rounded-xl text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors"><Download size={18}/></button>
            <button onClick={() => { setEditingSpeaker(null); setShowModal(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus size={18}/> Add VIP</button>
         </div>
      </div>
      
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
            {speakers.map(s => (
            <div key={s.id} className={`border rounded-3xl p-6 hover:shadow-xl transition-all relative group ${getStatusColor(s.status)}`}>
                {isAdmin && <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingSpeaker(s); setShowModal(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                    <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                </div>}
                <div className="flex justify-between items-start mb-4">
                    {s.photo ? (
                        <img src={s.photo} alt={s.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-white"/>
                    ) : (
                        <div className="w-14 h-14 bg-white/50 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl backdrop-blur-sm">{safeStr(s.name).charAt(0)}</div>
                    )}
                    <select value={s.status} onChange={(e) => update(s.id, { status: e.target.value })} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border outline-none cursor-pointer bg-white/80 backdrop-blur-sm ${s.status === 'Confirmed' ? 'text-green-600 border-green-200' : 'text-slate-500'}`}><option>Invited</option><option>Confirmed</option><option>Pending</option><option>Declined</option></select>
                </div>
                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{safeStr(s.name)}</h3>
                <p className="text-sm text-blue-600 font-bold mb-2">{safeStr(s.role)}</p>
                <div className="text-xs text-slate-400 font-medium">{safeStr(s.org)}</div>
                
                {isAdmin && s.email && (
                   <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center text-xs text-slate-500">
                      <Mail size={12} className="mr-2"/> {safeStr(s.email)}
                   </div>
                )}
            </div>
            ))}
        </div>
      ) : (
        <div className="bg-white border rounded-3xl shadow-sm overflow-hidden flex-1 overflow-y-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 font-black text-slate-400 text-[10px] uppercase tracking-widest sticky top-0 z-10">
                    <tr><th className="p-4">Speaker</th><th className="p-4">Role / Org</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {speakers.map(s => (
                        <tr key={s.id} className={`hover:bg-slate-50 group ${s.status === 'Confirmed' ? 'bg-green-50/30' : ''}`}>
                            <td className="p-4 flex items-center gap-3">
                                {s.photo ? <img src={s.photo} className="w-10 h-10 rounded-full object-cover" alt={s.name}/> : <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">{safeStr(s.name).charAt(0)}</div>}
                                <div>
                                    <span className="font-bold text-slate-700 block">{safeStr(s.name)}</span>
                                    {isAdmin && s.email && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Mail size={8}/> {safeStr(s.email)}</span>}
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="text-blue-600 font-bold text-xs">{safeStr(s.role)}</div>
                                <div className="text-slate-400 text-[10px]">{safeStr(s.org)}</div>
                            </td>
                            <td className="p-4">
                                <select value={s.status} onChange={(e) => update(s.id, { status: e.target.value })} className="bg-transparent text-xs font-bold outline-none"><option>Invited</option><option>Confirmed</option><option>Pending</option><option>Declined</option></select>
                            </td>
                            <td className="p-4 text-right">
                                <button onClick={() => { setEditingSpeaker(s); setShowModal(true); }} className="text-slate-300 hover:text-blue-600 mr-2"><Edit2 size={16}/></button>
                                {isAdmin && <button onClick={() => remove(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>}
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
             const item = { 
                name: fd.get('name'), 
                role: fd.get('role'), 
                org: fd.get('org'), 
                photo: fd.get('photo'),
                email: fd.get('email'),
                status: editingSpeaker?.status || 'Invited' 
             };
             if(editingSpeaker) update(editingSpeaker.id, item);
             else add(item);
             setShowModal(false);
           }} className="bg-white p-10 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl">
              <h3 className="text-xl font-bold">{editingSpeaker ? 'Edit Speaker' : 'Add VIP Speaker'}</h3>
              <input name="name" defaultValue={editingSpeaker?.name} placeholder="Name" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <input name="role" defaultValue={editingSpeaker?.role} placeholder="Role/Title" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <input name="org" defaultValue={editingSpeaker?.org} placeholder="Organization" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              {isAdmin && (
                  <div className="relative">
                      <Mail size={16} className="absolute left-4 top-5 text-slate-400"/>
                      <input name="email" defaultValue={editingSpeaker?.email} placeholder="Email Address (Admin Only)" className="w-full p-4 pl-12 border border-slate-200 rounded-2xl outline-none bg-slate-50"/>
                  </div>
              )}
              <input name="photo" defaultValue={editingSpeaker?.photo} placeholder="Photo URL" className="w-full p-4 border border-slate-200 rounded-2xl outline-none"/>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-4 rounded-2xl font-black shadow-lg">Save</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-4 text-slate-500 font-bold">Cancel</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

const Risks = ({ tasks = [], manualRisks = [], setManualRisks, isAdmin }) => {
  const overdueRisks = tasks.filter(t => t.status === 'Overdue');
  return (
    <div className="space-y-6 h-full overflow-y-auto pb-10">
      <div className="bg-red-50 border border-red-100 p-8 rounded-3xl shadow-sm">
        <h2 className="text-3xl font-black text-red-800 mb-2 flex items-center"><AlertTriangle className="mr-3" /> Risk Register</h2>
        <p className="text-red-700/80 text-sm font-medium">Critical schedule and attendance items requiring mitigation strategies.</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {overdueRisks.map(task => (
          <div key={task.id} className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-red-500 flex justify-between items-center group hover:shadow-lg transition-all">
            <div><div className="flex items-center gap-3 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded-full">Schedule Risk</span><h3 className="font-bold text-slate-800 text-lg">{safeStr(task.name)} is Overdue</h3></div><p className="text-sm text-slate-500 font-medium">Assignee: {safeStr(task.assignedTo)} • Committee: {safeStr(task.committee)}</p></div>
            <div className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20">Mitigate</div>
          </div>
        ))}
        {manualRisks.map(risk => (
           <div key={risk.id} className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-orange-500 flex justify-between items-center group hover:shadow-lg transition-all">
             <div><div className="flex items-center gap-3 mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full">{safeStr(risk.type) || 'Manual Risk'}</span><h3 className="font-bold text-slate-800 text-lg">{safeStr(risk.name)}</h3></div><p className="text-sm text-slate-500 font-medium">{safeStr(risk.desc)}</p></div>
             {isAdmin && <button onClick={() => {/* handle remove if needed */}} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>}
           </div>
        ))}
        {overdueRisks.length === 0 && manualRisks.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center gap-4">
             <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center"><CheckCircle2 size={32}/></div>
             <div className="text-slate-400 font-bold text-xl">All systems nominal. No critical risks detected.</div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP ---
const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!document.getElementById('tailwind-script')) {
      const script = document.createElement('script');
      script.id = 'tailwind-script';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

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
        <div className="p-8 font-black text-2xl tracking-tighter bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity" onClick={()=>setActiveTab('home')}>NID 2026</div>
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
              {activeTab === 'org' && <OrgChart dataObj={orgHook} isAdmin={isAdmin} />}
              {activeTab === 'program' && <ProgramManager dataObj={programHook} isAdmin={isAdmin} />}
              {activeTab === 'speakers' && <SpeakerManager dataObj={speakersHook} isAdmin={isAdmin} />}
              {activeTab === 'guests' && <GuestManager attendeesObj={attendeesHook} isAdmin={isAdmin} />}
              {activeTab === 'risks' && <Risks tasks={tasksHook.data} manualRisks={risksHook.data} setManualRisks={risksHook.add} isAdmin={isAdmin} />}
              {activeTab === 'budget' && isAdmin && <BudgetManager dataObj={budgetHook} />}
              {activeTab === 'meetings' && <MeetingTracker dataObj={meetingsHook} />}
              {activeTab === 'settings' && isAdmin && <SettingsPanel onBackup={handleBackup} onReset={handleReset} />}
           </div>
        </div>
      </main>

      {showLogin && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-sm relative border border-slate-200 animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowLogin(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors"><X size={24}/></button>
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-6"><Lock size={32}/></div>
              <h2 className="text-3xl font-black mb-2 text-slate-800 tracking-tight">Admin Access</h2>
              <p className="text-slate-400 text-sm mb-8 font-medium">Verify your credentials to manage project data.</p>
              <form onSubmit={(e) => {
                 e.preventDefault();
                 if(e.target.password.value === 'admin2026') { setIsAdmin(true); setShowLogin(false); }
                 else alert('Incorrect password');
              }} className="space-y-4">
                 <input type="password" name="password" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all font-bold text-lg" placeholder="Enter password" autoFocus/>
                 <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0">Authenticate</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;