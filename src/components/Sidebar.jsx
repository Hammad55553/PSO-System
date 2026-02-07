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
    Users2,
    Timer,
    FileText
} from 'lucide-react';

const Sidebar = () => {
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';

    return (
        <aside className="desktop-sidebar no-print">
            <div className="brand-section">
                <span className="brand-name">BILAL VET</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>RMS Console v1.0</span>
            </div>

            <nav className="nav-group">
                <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>

                <NavLink to="/pos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <ShoppingCart size={20} />
                    <span>Sale (F1)</span>
                </NavLink>

                <NavLink to="/inventory" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Package size={20} />
                    <span>Inventory</span>
                </NavLink>

                <NavLink to="/credit" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Users size={20} />
                    <span>Customers</span>
                </NavLink>

                <NavLink to="/shift" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Timer size={20} />
                    <span>Shift</span>
                </NavLink>

                <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <FileText size={20} />
                    <span>Reports</span>
                </NavLink>

                <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    <History size={20} />
                    <span>Registry</span>
                </NavLink>

                {isAdmin && (
                    <>
                        <NavLink to="/returns" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <RotateCcw size={20} />
                            <span>Returns</span>
                        </NavLink>

                        <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Users2 size={20} />
                            <span>Team</span>
                        </NavLink>

                        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            <Settings size={20} />
                            <span>Setup</span>
                        </NavLink>
                    </>
                )}
            </nav>

            <div style={{ marginTop: 'auto', padding: '10px', fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center' }}>
                LUMENSOFT POWERED
            </div>
        </aside>
    );
};

export default Sidebar;
