import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Menu, X, Wifi, WifiOff, Box } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import ShiftManagement from './pages/ShiftManagement';
import CreditManagement from './pages/CreditManagement';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import ProfitMastery from './pages/ProfitMastery';
import ProductInsights from './pages/ProductInsights';
import OrderManagement from './pages/OrderManagement';
import BillManagement from './pages/BillManagement';
import ExpiryManagement from './pages/ExpiryManagement';
import ShortageBook from './pages/ShortageBook';
import ExpenseTracker from './pages/ExpenseTracker';
import SupplierManagement from './pages/SupplierManagement';

import { supabase } from './supabase';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { setInventory } from './store/slices/inventorySlice';
import { setCustomers } from './store/slices/customerSlice';
import { setSales } from './store/slices/salesSlice';
import { logout } from './store/slices/authSlice';
import { setShifts } from './store/slices/shiftSlice';
import { setShortageItems } from './store/slices/shortageSlice';
import { setExpenses } from './store/slices/expensesSlice';
import { setSuppliers } from './store/slices/suppliersSlice';
import Login from './pages/Login';
import Register from './pages/Register';
import UserManagement from './pages/UserManagement';

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const isAdmin = user?.role === 'admin';
  const location = useLocation();
  const isBillingMode = location.pathname === '/pos' || location.pathname === '/returns';
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let channels = [];

    const fetchData = async () => {
        if (!isAuthenticated) return;
        setIsSyncing(true);
        try {
            // 1. Initial Fetch
            const [inv, cust, sales, shifts, short, exp, sup] = await Promise.all([
                supabase.from('inventory').select('*'),
                supabase.from('customers').select('*'),
                supabase.from('sales').select('*, sale_items(*)'),
                supabase.from('shifts').select('*'),
                supabase.from('shortage').select('*'),
                supabase.from('expenses').select('*'),
                supabase.from('suppliers').select('*')
            ]);

            if (inv.data) dispatch(setInventory(inv.data));
            if (cust.data) dispatch(setCustomers(cust.data));
            if (sales.data) dispatch(setSales(sales.data.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))));
            if (shifts.data) {
                const activeShift = shifts.data.find(s => s.status === 'active');
                const history = shifts.data.filter(s => s.status !== 'active').sort((a,b) => new Date(b.start_time)-new Date(a.start_time));
                dispatch(setShifts({ activeShift, history }));
            }
            if (short.data) dispatch(setShortageItems(short.data));
            if (exp.data) dispatch(setExpenses(exp.data));
            if (sup.data) dispatch(setSuppliers(sup.data));

        } catch (err) {
            console.error(err);
        } finally {
            setIsSyncing(false);
        }
    };

    if (isAuthenticated) {
        fetchData();

        const mainChannel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shortage' }, () => fetchData())
            .subscribe();
        
        channels.push(mainChannel);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [isAuthenticated, dispatch]);

  const { items: localInv } = useSelector(state => state.inventory);
  const { list: localCust } = useSelector(state => state.customers);
  const { history: localSales } = useSelector(state => state.sales);
  const { history: localShifts, activeShift: localActiveShift } = useSelector(state => state.shift);
  const { items: localShort } = useSelector(state => state.shortage);
  const { list: localExp } = useSelector(state => state.expenses);
  const { list: localSup } = useSelector(state => state.suppliers);

  const handleManualSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
        // Force Refetch from Supabase
        const [inv, cust, sales] = await Promise.all([
            supabase.from('inventory').select('*'),
            supabase.from('customers').select('*'),
            supabase.from('sales').select('*, sale_items(*)')
        ]);

        if (inv.data) dispatch(setInventory(inv.data));
        if (cust.data) dispatch(setCustomers(cust.data));
        if (sales.data) dispatch(setSales(sales.data.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))));
      
      toast.success("Supabase Sync: Active");
    } catch (err) { console.error(err); }
    finally { setIsSyncing(false); }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </>
    );
  }

  return (
    <div className="app-container">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: '600'
          }
        }}
      />

      {!isBillingMode && <Sidebar />}

      <main className="main-area">
        <header className="app-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {isBillingMode && (
              <Link to="/" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 800, fontSize: '0.8rem', background: '#eff6ff', padding: '6px 12px', borderRadius: '6px' }}>
                <LayoutDashboard size={18} /> DASHBOARD / MENU
              </Link>
            )}

            {/* HYBRID CONNECTION STATUS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isOnline ? '#dcfce7' : '#fee2e2', padding: '6px 12px', borderRadius: '4px', border: `1px solid ${isOnline ? '#166534' : '#991b1b'}` }}>
              {isOnline ? <Wifi size={14} color="#166534" /> : <WifiOff size={14} color="#991b1b" />}
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#166534' }}>{isOnline ? 'CLOUD SYNC: ACTIVE' : 'OFFLINE MODE: LOCAL SAVE'}</span>
            </div>

            {isOnline && (
              <div style={{ background: '#0ea5e9', border: 'none', borderRadius: '4px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'white' }}>
                <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>LIVE CLOUD SYNC: ACTIVE</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="text-right">
              <p className="text-[10px] font-800 text-slate-500">OPERATOR: {user?.role?.toUpperCase()}</p>
              <p className="text-sm font-900 tracking-tight">{user?.name}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-900 shadow-xl border border-white/20" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => dispatch(logout())}
                style={{
                  background: '#fff1f1',
                  border: '1px solid #fee2e2',
                  color: '#ef4444',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                title="Logout from Terminal"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="view-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/shift" element={<ShiftManagement />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/credit" element={<CreditManagement />} />
            <Route path="/history" element={<SalesHistory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/bills" element={<BillManagement />} />
            <Route path="/expiry" element={<ExpiryManagement />} />
            <Route path="/shortage" element={<ShortageBook />} />
            <Route path="/expenses" element={<ExpenseTracker />} />
            <Route path="/suppliers" element={<SupplierManagement />} />
            <Route path="/profit" element={isAdmin ? <ProfitMastery /> : <Navigate to="/" />} />
            <Route path="/insights/:productName" element={<ProductInsights />} />

            {/* ADMIN ONLY ROUTES */}
            <Route path="/returns" element={<SalesHistory isReturnsPage={true} />} />
            <Route path="/users" element={isAdmin ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="/settings" element={isAdmin ? <Settings /> : <Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;
