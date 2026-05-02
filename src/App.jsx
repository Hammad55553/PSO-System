import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Link, Navigate, useNavigate } from 'react-router-dom';
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
import { processSyncQueue } from './utils/offlineSync';
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
  
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [targetPath, setTargetPath] = useState(null);
  const [pinError, setPinError] = useState(false);
  const [attempts, setAttempts] = useState(10);

  const handleProtectedNavigation = (e, path) => {
    // Only ask for PIN if we are currently in billing mode (POS/Returns)
    if (isBillingMode) {
      e.preventDefault();
      setTargetPath(path);
      setShowPinModal(true);
    } else {
      navigate(path);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('bilal_vet_terminal_pin') || '1234';
    if (pinInput === storedPin) {
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      setAttempts(10);
      navigate(targetPath);
    } else {
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);
      setPinError(true);

      if (newAttempts <= 0) {
        toast.error("TOO MANY FAILED ATTEMPTS - LOGGING OUT", { duration: 5000 });
        dispatch(logout());
      } else {
        toast.error(`SECURITY ALERT: WRONG PIN! ${newAttempts} attempts remaining.`, { duration: 4000 });
      }

      setPinInput('');
    }
  };

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
                const activeShift = shifts.data.find(s => s.status === 'active' && s.staff_id === user.uid);
                const history = shifts.data
                    .filter(s => s.status !== 'active' && (isAdmin || s.staff_id === user.uid))
                    .sort((a,b) => new Date(b.start_time)-new Date(a.start_time));
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
        processSyncQueue();

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
      <style>{`
          @keyframes shake {
              10%, 90% { transform: translate3d(-1px, 0, 0); }
              20%, 80% { transform: translate3d(2px, 0, 0); }
              30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
              40%, 60% { transform: translate3d(4px, 0, 0); }
          }
      `}</style>
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
              <div 
                onClick={(e) => handleProtectedNavigation(e, '/')}
                style={{ cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', fontWeight: 800, fontSize: '0.8rem', background: '#eff6ff', padding: '6px 12px', borderRadius: '6px' }}
              >
                <LayoutDashboard size={18} /> DASHBOARD / MENU
              </div>
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
              <p className="text-[10px] font-800 text-slate-500" style={{ marginBottom: '2px' }}>OPERATOR: {user?.role?.toUpperCase()}</p>
              <p style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b', textTransform: 'capitalize' }}>{user?.name}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center font-900 shadow-xl border border-white/20" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: 'white' }}>
                {user?.name?.charAt(0)?.toUpperCase()}
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

      {/* SAFETY LOCK MODAL */}
      {showPinModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                  <div style={{ width: '60px', height: '60px', background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <Box size={30} color="#6366f1" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>Terminal Security Lock</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '25px' }}>Enter Terminal PIN to unlock the system dashboard.</p>
                  
                  <form onSubmit={handlePinSubmit}>
                      <input 
                          type="password" 
                          autoFocus
                          placeholder="PIN"
                          style={{ 
                              width: '100%', 
                              padding: '15px', 
                              textAlign: 'center', 
                              fontSize: '1.5rem', 
                              fontWeight: 900, 
                              letterSpacing: '8px', 
                              border: pinError ? '2px solid #ef4444' : '2px solid #e2e8f0', 
                              borderRadius: '12px', 
                              marginBottom: '10px', 
                              outline: 'none',
                              animation: pinError ? 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' : 'none',
                              background: pinError ? '#fef2f2' : 'white'
                          }}
                          value={pinInput}
                          onChange={(e) => {
                              setPinInput(e.target.value);
                              if (pinError) setPinError(false);
                          }}
                          maxLength={4}
                      />
                      {pinError && (
                          <div style={{ marginBottom: '15px' }}>
                              <p style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, marginBottom: '2px' }}>WRONG SECURITY PIN</p>
                              <p style={{ color: '#ef4444', fontSize: '0.65rem', fontWeight: 900 }}>{attempts} ATTEMPTS REMAINING</p>
                          </div>
                      )}
                      <div style={{ display: 'flex', gap: '10px' }}>
                          <button type="button" onClick={() => setShowPinModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>CANCEL</button>
                          <button type="submit" style={{ flex: 1, padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>UNLOCK</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
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
