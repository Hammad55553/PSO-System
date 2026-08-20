import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Link, Navigate, useNavigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Menu, X, Wifi, WifiOff, Box, Hash, Loader2 } from 'lucide-react';
import Calculator from './components/Calculator';

import Sidebar from './components/Sidebar';
import LoadingProgress from './components/LoadingProgress';

// PERFORMANCE: Pages are lazy-loaded so the initial bundle stays small and
// each screen's code (POS ~94KB, Settings ~112KB, etc.) is only fetched when
// the user actually navigates to it. This dramatically speeds up first paint.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Inventory = lazy(() => import('./pages/Inventory'));
const POS = lazy(() => import('./pages/POS'));
const SalesHistory = lazy(() => import('./pages/SalesHistory'));
const ShiftManagement = lazy(() => import('./pages/ShiftManagement'));
const CreditManagement = lazy(() => import('./pages/CreditManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const ProfitMastery = lazy(() => import('./pages/ProfitMastery'));
const ProductInsights = lazy(() => import('./pages/ProductInsights'));
const OrderManagement = lazy(() => import('./pages/OrderManagement'));
const BillManagement = lazy(() => import('./pages/BillManagement'));
const ExpiryManagement = lazy(() => import('./pages/ExpiryManagement'));
const ShortageBook = lazy(() => import('./pages/ShortageBook'));
const ExpenseTracker = lazy(() => import('./pages/ExpenseTracker'));
const SupplierManagement = lazy(() => import('./pages/SupplierManagement'));
const Trash = lazy(() => import('./pages/Trash'));
const StockRecords = lazy(() => import('./pages/StockRecords'));

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
import { setOrders } from './store/slices/ordersSlice';
import { processSyncQueue } from './utils/offlineSync';
import Login from './pages/Login';
const Register = lazy(() => import('./pages/Register'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
import { toggleCalculator, openCalculator, closeCalculator } from './store/slices/uiSlice';

// Lightweight fallback shown while a lazy page chunk is loading.
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', width: '100%' }}>
    <Loader2 size={40} color="#2563eb" className="animate-spin" />
  </div>
);

import welcomeSound from './assets/Welcome.mp3';

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const isAdmin = user?.role === 'admin';

  // SECURITY: Never trust localStorage alone for auth. On mount (and whenever
  // Supabase reports an auth change) verify there is a real, valid session and
  // that the profile is still active + that the cached role matches the DB.
  // If anything is off, force logout. This closes the "set pso_user in console
  // to become admin" bypass — the DB is the source of truth.
  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // No valid Supabase session but local state says logged in -> purge.
      if (!session?.user) {
        if (isAuthenticated) dispatch(logout());
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .single();

      if (cancelled) return;

      // Profile missing, disabled, or role tampered with -> purge.
      if (error || !profile || profile.status !== 'active' ||
          (user && user.role !== profile.role)) {
        dispatch(logout());
      }
    };

    verifySession();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') dispatch(logout());
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const isCalculatorOpen = useSelector(state => state.ui.isCalculatorOpen);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  // Percentage loader state for the heavy initial data load (8 tables).
  const [loadProgress, setLoadProgress] = useState(0);
  const [showInitialLoader, setShowInitialLoader] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // WELCOME AUDIO LOGIC
  const playWelcome = () => {
    try {
      const audio = new Audio(welcomeSound);
      audio.volume = 0.8;
      
      const startPlay = () => {
        audio.play().then(() => {
          console.log("Welcome sound played successfully.");
        }).catch(e => {
          // If still blocked, wait for first real interaction
          const playOnInteraction = () => {
            audio.play().catch(() => {});
            window.removeEventListener('mousedown', playOnInteraction);
            window.removeEventListener('keydown', playOnInteraction);
            window.removeEventListener('touchstart', playOnInteraction);
          };
          window.addEventListener('mousedown', playOnInteraction);
          window.addEventListener('keydown', playOnInteraction);
          window.addEventListener('touchstart', playOnInteraction);
        });
      };

      startPlay();
    } catch (e) {
      // Silent fail
    }
  };

  // Play on LOGIN
  useEffect(() => {
    if (isAuthenticated) {
      playWelcome();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      playWelcome(); // Play on Reconnect
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let channels = [];

    const fetchData = async (withProgress = false) => {
        if (!isAuthenticated) return;
        setIsSyncing(true);

        // Show the percentage loader only for the heavy initial load, not for
        // background realtime refreshes (those should be silent).
        if (withProgress) {
            setShowInitialLoader(true);
            setLoadProgress(0);
        }

        // Each of the 8 table fetches bumps the percentage as it finishes, so
        // the user sees real progress (e.g. 12% → 25% → …) instead of a frozen
        // spinner. We still run them in parallel for speed.
        const TOTAL_STEPS = 8;
        let done = 0;
        const tick = () => {
            done += 1;
            if (withProgress) setLoadProgress(Math.round((done / TOTAL_STEPS) * 100));
        };
        const track = (p) => p.then((r) => { tick(); return r; });

        try {
            // 1. Initial Fetch (parallel, but each reports progress on finish)
            const [inv, cust, sales, shifts, short, exp, sup, ord] = await Promise.all([
                track(supabase.from('inventory').select('*').is('deleted_at', null)),
                track(supabase.from('customers').select('*').is('deleted_at', null)),
                track(supabase.from('sales').select('*, sale_items(*)').is('deleted_at', null)),
                track(supabase.from('shifts').select('*')),
                track(supabase.from('shortage').select('*')),
                track(supabase.from('expenses').select('*')),
                track(supabase.from('suppliers').select('*').is('deleted_at', null)),
                track(supabase.from('orders').select('*').is('deleted_at', null))
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
            if (typeof ord !== 'undefined' && ord.data) dispatch(setOrders(ord.data.sort((a,b) => new Date(b.created_at)-new Date(a.created_at))));

        } catch (err) {
            console.error(err);
        } finally {
            setIsSyncing(false);
            if (withProgress) {
                setLoadProgress(100);
                // Hold at 100% briefly so the fill animation completes, then hide.
                setTimeout(() => setShowInitialLoader(false), 400);
            }
        }
    };

    // PERFORMANCE: A single sale can fire several postgres_changes events in a
    // burst (sales + sale_items + inventory stock update). Previously each event
    // triggered a full re-fetch of every table, hammering Supabase bandwidth and
    // egress. Debounce so a burst of changes results in ONE refetch ~800ms later.
    let debounceTimer = null;
    const debouncedFetch = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchData(), 800);
    };

    if (isAuthenticated) {
        // OFFLINE-FIRST: If we already have cached data in Redux (restored from
        // localStorage on reload), show it INSTANTLY and refresh silently in the
        // background — no full-screen loader, no waiting. The percentage loader
        // only appears on a genuine cold start (empty cache / first ever login).
        const hasCachedData =
            (store.getState().inventory?.items?.length || 0) > 0 ||
            (store.getState().sales?.history?.length || 0) > 0;

        fetchData(!hasCachedData);
        processSyncQueue();

        const mainChannel = supabase.channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, debouncedFetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, debouncedFetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, debouncedFetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, debouncedFetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shortage' }, debouncedFetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, debouncedFetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, debouncedFetch)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, debouncedFetch)
            .subscribe();

        channels.push(mainChannel);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(debounceTimer);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        dispatch(toggleCalculator());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Login />} />
          </Routes>
        </Suspense>
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

      {!isBillingMode && (
        <>
          <div 
            className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`} 
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </>
      )}

      <main className="main-area">
        {!isBillingMode && (
          <header className="app-header no-print">
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {isMobile && !isBillingMode && (
                <button 
                  className="erp-btn-icon"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{ border: 'none', background: '#f1f5f9', color: '#1e293b' }}
                >
                  <Menu size={20} />
                </button>
              )}
              
              {/* HYBRID CONNECTION STATUS */}
              <div className="header-status-badges" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isOnline ? '#dcfce7' : '#fee2e2', padding: '6px 12px', borderRadius: '4px', border: `1px solid ${isOnline ? '#166534' : '#991b1b'}` }}>
                {isOnline ? <Wifi size={14} color="#166534" /> : <WifiOff size={14} color="#991b1b" />}
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#166534' }}>{isOnline ? 'CLOUD SYNC: ACTIVE' : 'OFFLINE MODE: LOCAL SAVE'}</span>
              </div>

              {isOnline && (
                <div className="header-status-badges" style={{ background: '#0ea5e9', border: 'none', borderRadius: '4px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'white' }}>
                  <div style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>LIVE CLOUD SYNC: ACTIVE</span>
                </div>
              )}

              <button 
                onClick={() => dispatch(openCalculator())}
                style={{ 
                  background: '#10b981', 
                  border: 'none', 
                  color: 'white', 
                  padding: '6px 12px', 
                  borderRadius: '4px', 
                  fontWeight: 900, 
                  fontSize: '0.7rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Hash size={14} /> CALCULATOR (F3)
              </button>
            </div>

            <div className="flex items-center gap-6" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div className="text-right header-user-info">
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
        )}

        <div className="view-container">
          <Suspense fallback={<PageLoader />}>
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
            <Route path="/trash" element={<Trash />} />
            <Route path="/stock-records" element={<StockRecords />} />
            <Route path="/profit" element={isAdmin ? <ProfitMastery /> : <Navigate to="/" />} />
            <Route path="/insights/:productName" element={<ProductInsights />} />

            {/* ADMIN ONLY ROUTES */}
            <Route path="/returns" element={<SalesHistory isReturnsPage={true} />} />
            <Route path="/users" element={isAdmin ? <UserManagement /> : <Navigate to="/" />} />
            <Route path="/settings" element={isAdmin ? <Settings /> : <Navigate to="/" />} />
          </Routes>
          </Suspense>
        </div>
      </main>

      <Calculator isOpen={isCalculatorOpen} onClose={() => dispatch(closeCalculator())} />

      {/* Percentage loader for the heavy initial data load (8 tables) */}
      {showInitialLoader && (
        <LoadingProgress progress={loadProgress} label="Loading clinic data" fullscreen />
      )}

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
