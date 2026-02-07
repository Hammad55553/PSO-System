import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Menu, X, Wifi, WifiOff } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import ShiftManagement from './pages/ShiftManagement';
import CreditManagement from './pages/CreditManagement';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

import { db } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { setInventory } from './store/slices/inventorySlice';
import { setCustomers } from './store/slices/customerSlice';
import { setSales } from './store/slices/salesSlice';
import { logout } from './store/slices/authSlice';
import { setShifts } from './store/slices/shiftSlice';
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

    if (navigator.onLine) {
      handleManualSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { items: localInv } = useSelector(state => state.inventory);
  const { list: localCust } = useSelector(state => state.customers);
  const { history: localSales } = useSelector(state => state.sales);
  const { history: localShifts, activeShift: localActiveShift } = useSelector(state => state.shift);

  const handlePushLocalToCloud = async () => {
    if (!window.confirm("This will push all your LOCAL PSO data to Firebase. Continue?")) return;
    setIsSyncing(true);
    try {
      // Push Inventory
      for (const item of localInv) {
        await setDoc(doc(db, "inventory", item.id), item);
      }
      // Push Customers
      for (const cust of localCust) {
        await setDoc(doc(db, "customers", cust.id), cust);
      }
      // Push Sales
      for (const sale of localSales) {
        await setDoc(doc(db, "sales", sale.id), sale);
      }
      // Push Shifts
      for (const s of localShifts) {
        await setDoc(doc(db, "shifts", s.id.toString()), { ...s, status: 'closed' });
      }
      if (localActiveShift) {
        await setDoc(doc(db, "shifts", localActiveShift.id.toString()), { ...localActiveShift, status: 'active' });
      }

      toast.success("All local data migrated to Cloud!");
    } catch (err) {
      console.error(err);
      toast.error("Migration failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      toast.error("Offline mode active.");
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Pull Inventory
      const invSnap = await getDocs(collection(db, "inventory"));
      const cloudInv = invSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      // SPECIAL: If Cloud is empty but Local has data, maybe offer to push?
      if (cloudInv.length === 0 && localInv.length > 0) {
        const wantsPush = window.confirm("Cloud database is empty. Do you want to PUSH your local data to Cloud now?");
        if (wantsPush) {
          await handlePushLocalToCloud();
          setIsSyncing(false);
          return;
        }
      }

      if (cloudInv.length > 0) dispatch(setInventory(cloudInv));

      // 2. Pull Customers
      const custSnap = await getDocs(collection(db, "customers"));
      const cloudCust = custSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (cloudCust.length > 0) dispatch(setCustomers(cloudCust));

      // 3. Pull Recent Sales
      const salesSnap = await getDocs(collection(db, "sales"));
      const cloudSales = salesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      if (cloudSales.length > 0) dispatch(setSales(cloudSales));

      // 4. Pull Shifts
      const shiftSnap = await getDocs(collection(db, "shifts"));
      const allShifts = shiftSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

      const activeShift = allShifts.find(s => s.status === 'active');
      const shiftHistory = allShifts.filter(s => s.status !== 'active')
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

      if (allShifts.length > 0) {
        dispatch(setShifts({ activeShift, history: shiftHistory }));
      }

      toast.success("Cloud Synchronized Successfully");
    } catch (err) {
      console.error(err);
      toast.error("Cloud sync failed.");
    } finally {
      setIsSyncing(false);
    }
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

            {/* CONNECTION STATUS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isOnline ? '#dcfce7' : '#fee2e2', padding: '6px 12px', borderRadius: '4px', border: `1px solid ${isOnline ? '#166534' : '#991b1b'}` }}>
              {isOnline ? <Wifi size={14} color="#166534" /> : <WifiOff size={14} color="#991b1b" />}
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#166534' }}>{isOnline ? 'CLOUD SYNC: ONLINE' : 'LOCAL MODE: OFFLINE'}</span>
            </div>

            {isOnline && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                style={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  opacity: isSyncing ? 0.7 : 1
                }}
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{isSyncing ? 'SYNCING...' : 'FORCE RE-SYNC'}</span>
              </button>
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

            {/* ADMIN ONLY ROUTES */}
            <Route path="/returns" element={isAdmin ? <SalesHistory isReturnsPage={true} /> : <Navigate to="/" />} />
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
