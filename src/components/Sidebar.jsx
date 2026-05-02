import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Lock, X } from 'lucide-react';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    History,
    RotateCcw,
    Settings,
    Stethoscope,
    Users,
    Wallet,
    Users2,
    Timer,
    FileText,
    TrendingUp,
    Truck,
    Camera,
    ShieldAlert,
    BookOpen
} from 'lucide-react';

const Sidebar = () => {
    const { user } = useSelector(state => state.auth);
    const location = useLocation();
    const navigate = useNavigate();
    const [showPinModal, setShowPinModal] = React.useState(false);
    const [pinInput, setPinInput] = React.useState('');
    const [targetPath, setTargetPath] = React.useState(null);

    const isAdmin = user?.role === 'admin';
    const permissions = user?.permissions || [];
    const hasAccess = (perm) => isAdmin || permissions.includes(perm);

    const handleProtectedNavigation = (e, path) => {
        // If we are in POS, ask for PIN
        if (location.pathname.startsWith('/pos') && path !== '/pos') {
            e.preventDefault();
            setTargetPath(path);
            setShowPinModal(true);
        }
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        const storedPin = localStorage.getItem('bilal_vet_terminal_pin') || '1234';
        if (pinInput === storedPin) {
            setShowPinModal(false);
            setPinInput('');
            navigate(targetPath);
        } else {
            toast.error("Invalid Security PIN");
            setPinInput('');
        }
    };

    return (
        <aside className="desktop-sidebar no-print">
            <div className="brand-section">
                <span className="brand-name">BILAL VETERINARY CLINIC</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800 }}>PROFESSIONAL RMS v1.0.2</span>
                    <span style={{ background: '#10b981', color: 'white', fontSize: '0.5rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>LIVE</span>
                </div>
            </div>

            <nav className="nav-group">
                <div className="nav-label">Core Operations</div>
                <NavLink 
                    to="/" 
                    className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                    onClick={(e) => handleProtectedNavigation(e, '/')}
                >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                </NavLink>

                {hasAccess('pos') && (
                    <>
                        <NavLink to="/pos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <ShoppingCart size={18} />
                            <span>Sale Terminal</span>
                        </NavLink>
                        <NavLink to="/returns" onClick={(e) => handleProtectedNavigation(e, '/returns')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <RotateCcw size={18} />
                            <span>Returns</span>
                        </NavLink>
                    </>
                )}

                {hasAccess('inventory') && (
                    <>
                        <NavLink to="/inventory" onClick={(e) => handleProtectedNavigation(e, '/inventory')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Package size={18} />
                            <span>Medicine Store</span>
                        </NavLink>
                        <NavLink to="/expiry" onClick={(e) => handleProtectedNavigation(e, '/expiry')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <ShieldAlert size={18} />
                            <span>Expiry Control</span>
                        </NavLink>
                        <NavLink to="/orders" onClick={(e) => handleProtectedNavigation(e, '/orders')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Truck size={18} />
                            <span>Supply Hub</span>
                        </NavLink>
                        <NavLink to="/suppliers" onClick={(e) => handleProtectedNavigation(e, '/suppliers')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Users size={18} />
                            <span>Suppliers (Vendors)</span>
                        </NavLink>
                        <NavLink to="/shortage" onClick={(e) => handleProtectedNavigation(e, '/shortage')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <BookOpen size={18} />
                            <span>Shortage Book</span>
                        </NavLink>
                    </>
                )}

                <div className="nav-label">Finances & Credit</div>
                {hasAccess('credit') && (
                    <NavLink to="/credit" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        <Users size={18} />
                        <span>Executive Khata</span>
                    </NavLink>
                )}

                <NavLink to="/bills" onClick={(e) => handleProtectedNavigation(e, '/bills')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Camera size={18} />
                    <span>Paper Work</span>
                </NavLink>

                <NavLink to="/expenses" onClick={(e) => handleProtectedNavigation(e, '/expenses')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Wallet size={18} />
                    <span>Expense Tracker</span>
                </NavLink>

                <NavLink to="/shift" onClick={(e) => handleProtectedNavigation(e, '/shift')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Timer size={18} />
                    <span>Day Shift</span>
                </NavLink>

                <div className="nav-label">Reports & Audit</div>
                {hasAccess('reports') && (
                    <>
                        <NavLink to="/reports" onClick={(e) => handleProtectedNavigation(e, '/reports')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <FileText size={18} />
                            <span>Analytic Reports</span>
                        </NavLink>
                        <NavLink to="/history" onClick={(e) => handleProtectedNavigation(e, '/history')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <History size={18} />
                            <span>Registry Log</span>
                        </NavLink>
                    </>
                )}

                {hasAccess('profit') && (
                    <NavLink to="/profit" onClick={(e) => handleProtectedNavigation(e, '/profit')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        <TrendingUp size={18} />
                        <span>Profit Mastery</span>
                    </NavLink>
                )}

                {isAdmin && (
                    <>
                        <div className="nav-label">Management</div>
                        <NavLink to="/users" onClick={(e) => handleProtectedNavigation(e, '/users')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Users2 size={18} />
                            <span>Team Access</span>
                        </NavLink>

                        <NavLink to="/settings" onClick={(e) => handleProtectedNavigation(e, '/settings')} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Settings size={18} />
                            <span>System Setup</span>
                        </NavLink>
                    </>
                )}
             </nav>

            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '35px', height: '35px', borderRadius: '10px', background: 'linear-gradient(45deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: '0.8rem' }}>
                        {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 900, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name || 'Administrator'}</p>
                        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{user?.role || 'Admin'} Account</p>
                    </div>
                </div>
            </div>

            {/* SAFETY LOCK MODAL */}
            {showPinModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '350px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '60px', height: '60px', background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Lock size={30} color="#6366f1" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>Safety Lock Active</h3>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '25px' }}>Enter Terminal PIN to unlock the system dashboard.</p>
                        
                        <form onSubmit={handlePinSubmit}>
                            <input 
                                type="password" 
                                autoFocus
                                placeholder="ENTER 4-DIGIT PIN"
                                style={{ width: '100%', padding: '15px', textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '8px', border: '2px solid #e2e8f0', borderRadius: '12px', marginBottom: '20px', outline: 'none' }}
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                maxLength={4}
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="button" onClick={() => setShowPinModal(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>CANCEL</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>UNLOCK</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
