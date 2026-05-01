import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
    const isAdmin = user?.role === 'admin';
    const permissions = user?.permissions || [];
    const hasAccess = (perm) => isAdmin || permissions.includes(perm);

    return (
        <aside className="desktop-sidebar no-print">
            <div className="brand-section">
                <span className="brand-name">BILAL VETERINARY CLINIC</span>
                <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800 }}>PROFESSIONAL RMS v1.0</span>
            </div>

            <nav className="nav-group">
                <div className="nav-label">Core Operations</div>
                <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                </NavLink>

                {hasAccess('pos') && (
                    <>
                        <NavLink to="/pos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <ShoppingCart size={18} />
                            <span>Sale Terminal</span>
                        </NavLink>
                        <NavLink to="/returns" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <RotateCcw size={18} />
                            <span>Returns</span>
                        </NavLink>
                    </>
                )}

                {hasAccess('inventory') && (
                    <>
                        <NavLink to="/inventory" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Package size={18} />
                            <span>Medicine Store</span>
                        </NavLink>
                        <NavLink to="/expiry" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <ShieldAlert size={18} />
                            <span>Expiry Control</span>
                        </NavLink>
                        <NavLink to="/orders" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Truck size={18} />
                            <span>Supply Hub</span>
                        </NavLink>
                        <NavLink to="/suppliers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Users size={18} />
                            <span>Suppliers (Vendors)</span>
                        </NavLink>
                        <NavLink to="/shortage" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
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

                <NavLink to="/bills" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Camera size={18} />
                    <span>Paper Work</span>
                </NavLink>

                <NavLink to="/expenses" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Wallet size={18} />
                    <span>Expense Tracker</span>
                </NavLink>

                <NavLink to="/shift" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Timer size={18} />
                    <span>Day Shift</span>
                </NavLink>

                <div className="nav-label">Reports & Audit</div>
                {hasAccess('reports') && (
                    <>
                        <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <FileText size={18} />
                            <span>Analytic Reports</span>
                        </NavLink>
                        <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <History size={18} />
                            <span>Registry Log</span>
                        </NavLink>
                    </>
                )}

                {hasAccess('profit') && (
                    <NavLink to="/profit" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        <TrendingUp size={18} />
                        <span>Profit Mastery</span>
                    </NavLink>
                )}

                {isAdmin && (
                    <>
                        <div className="nav-label">Management</div>
                        <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Users2 size={18} />
                            <span>Team Access</span>
                        </NavLink>

                        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
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
        </aside>
    );
};

export default Sidebar;
