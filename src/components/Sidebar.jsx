import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    History,
    RotateCcw,
    Settings,
    Timer,
    FileText,
    TrendingUp,
    Truck,
    Camera,
    ShieldAlert,
    BookOpen,
    Users,
    Users2,
    Wallet,
    Lock
} from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import toast from 'react-hot-toast';

const Sidebar = () => {
    const { user } = useSelector(state => state.auth);
    const location = useLocation();
    const navigate = useNavigate();
    
    const [showPinModal, setShowPinModal] = React.useState(false);
    const [pinInput, setPinInput] = React.useState('');
    const [targetPath, setTargetPath] = React.useState(null);
    const [pinError, setPinError] = React.useState(false);
    const [attempts, setAttempts] = React.useState(10);
    const dispatch = useDispatch();

    const isAdmin = user?.role === 'admin';
    const permissions = user?.permissions || [];
    const hasAccess = (perm) => isAdmin || permissions.includes(perm);

    const handleNavClick = (path) => {
        // Always ask for PIN when going to Dashboard OR when leaving POS
        if (path === '/' || (location.pathname.startsWith('/pos') && path !== '/pos')) {
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
            setAttempts(10); // Reset attempts on success
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

    const NavItem = ({ to, icon: Icon, label, access }) => {
        if (access && !hasAccess(access)) return null;
        
        const isActive = location.pathname === to;
        
        return (
            <div 
                onClick={() => handleNavClick(to)}
                className={`nav-link ${isActive ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
            >
                <Icon size={18} />
                <span>{label}</span>
            </div>
        );
    };

    return (
        <>
            <style>{`
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>
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
                    <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    
                    {hasAccess('pos') && (
                        <>
                            <NavItem to="/pos" icon={ShoppingCart} label="Sale Terminal" />
                            <NavItem to="/returns" icon={RotateCcw} label="Returns" />
                        </>
                    )}

                    {hasAccess('inventory') && (
                        <>
                            <NavItem to="/inventory" icon={Package} label="Medicine Store" />
                            <NavItem to="/expiry" icon={ShieldAlert} label="Expiry Control" />
                            <NavItem to="/orders" icon={Truck} label="Supply Hub" />
                            <NavItem to="/suppliers" icon={Users} label="Suppliers (Vendors)" />
                            <NavItem to="/shortage" icon={BookOpen} label="Shortage Book" />
                        </>
                    )}

                    <div className="nav-label">Finances & Credit</div>
                    <NavItem to="/credit" icon={Users} label="Executive Khata" access="credit" />
                    <NavItem to="/bills" icon={Camera} label="Paper Work" />
                    <NavItem to="/expenses" icon={Wallet} label="Expense Tracker" />
                    <NavItem to="/shift" icon={Timer} label="Day Shift" />

                    <div className="nav-label">Reports & Audit</div>
                    {hasAccess('reports') && (
                        <>
                            <NavItem to="/reports" icon={FileText} label="Analytic Reports" />
                            <NavItem to="/history" icon={History} label="Registry Log" />
                        </>
                    )}

                    <NavItem to="/profit" icon={TrendingUp} label="Profit Mastery" access="profit" />

                    {isAdmin && (
                        <>
                            <div className="nav-label">Management</div>
                            <NavItem to="/users" icon={Users2} label="Team Access" />
                            <NavItem to="/settings" icon={Settings} label="System Setup" />
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
            </aside>
        </>
    );
};

export default Sidebar;
