import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '../supabase';
import { Users, CheckCircle, XCircle, Shield, Trash2, Loader2, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement = () => {
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');
            
            if (error) throw error;
            setUsers(data);
        } catch (error) {
            toast.error("Failed to load staff list");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleTogglePermission = async (user, permission) => {
        if (!isAdmin) {
            toast.error("Access Denied: Admin only.");
            return;
        }
        const currentPerms = user.permissions || ['pos', 'inventory', 'credit', 'reports'];
        const newPerms = currentPerms.includes(permission)
            ? currentPerms.filter(p => p !== permission)
            : [...currentPerms, permission];
        
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ permissions: newPerms })
                .eq('id', user.id);
            
            if (error) throw error;
            toast.success(`Updated ${permission} access for ${user.name}`);
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to update permissions");
        }
    };

    const PERMISSIONS = [
        { id: 'pos', label: 'Sale Terminal' },
        { id: 'inventory', label: 'Stock / Inventory' },
        { id: 'credit', label: 'Customer Accounts' },
        { id: 'reports', label: 'Registry Logs' },
        { id: 'profit', label: 'Profit Mastery' },
        { id: 'shortage', label: 'Shortage Book' },
        { id: 'expenses', label: 'Expense Tracker' },
        { id: 'suppliers', label: 'Suppliers' },
        { id: 'users', label: 'Team Management' },
        { id: 'settings', label: 'System Setup' }
    ];

    const handleUpdateStatus = async (userId, newStatus) => {
        if (!isAdmin) {
            toast.error("Access Denied: Admin only.");
            return;
        }
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', userId);
            
            if (error) throw error;
            toast.success(`User marked as ${newStatus}`);
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to update user status");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!isAdmin) {
            toast.error("Access Denied: Admin only.");
            return;
        }
        if (!window.confirm("Delete this user profile? (Note: This doesn't delete their Auth account)")) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);
            
            if (error) throw error;
            toast.success("User profile deleted");
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to delete profile");
        }
    };

    const handleResetPassword = async (email) => {
        if (!window.confirm(`Send password reset link to ${email}?`)) return;
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            toast.success(`Reset link sent to ${email}`);
        } catch (error) {
            toast.error("Failed to send reset link");
        }
    };

    return (
        <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: window.innerWidth <= 768 ? '10px' : '20px' }}>
            <header style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0', 
                display: 'flex', 
                flexDirection: window.innerWidth <= 600 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 600 ? 'flex-start' : 'center', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                gap: '15px'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <Shield size={24} color="#6366f1" />
                        <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.5rem', fontWeight: 950, color: '#1e293b' }}>TEAM ACCESS CONTROL</h2>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Manage operator privileges and feature restrictions.</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px', width: window.innerWidth <= 600 ? '100%' : 'auto', justifyContent: 'center' }}>
                    <Users size={20} color="#6366f1" />
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>{users.length} STAFF MEMBERS</span>
                </div>
            </header>

            {window.innerWidth <= 1024 ? (
                /* Mobile/Tablet Card View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>
                            <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#6366f1' }} />
                        </div>
                    ) : users.map(u => (
                        <div key={u.id} className="pos-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.1rem' }}>{u.name}</div>
                                    <div style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>{u.email}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '6px', background: u.role === 'admin' ? '#eef2ff' : '#f8fafc', color: u.role === 'admin' ? '#4f46e5' : '#64748b', fontSize: '0.7rem', fontWeight: 900, border: '1px solid currentColor' }}>
                                        {u.role.toUpperCase()}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#f59e0b' }}></div>
                                        <span style={{ fontWeight: 800, fontSize: '0.7rem', color: u.status === 'active' ? '#059669' : '#d97706' }}>
                                            {u.status?.toUpperCase() || 'PENDING'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>Feature Permissions</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {PERMISSIONS.map(p => {
                                        const isActive = (u.permissions || []).includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                disabled={u.role === 'admin'}
                                                onClick={() => handleTogglePermission(u, p.id)}
                                                style={{ 
                                                    padding: '8px 12px', 
                                                    borderRadius: '8px', 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 900, 
                                                    cursor: u.role === 'admin' ? 'default' : 'pointer',
                                                    background: isActive ? '#eef2ff' : '#f8fafc',
                                                    color: isActive ? '#6366f1' : '#94a3b8',
                                                    border: `1px solid ${isActive ? '#6366f1' : '#e2e8f0'}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {isActive ? <CheckCircle size={12} /> : <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #cbd5e1' }}></div>}
                                                {p.label.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', pt: '15px', borderTop: '1px solid #f1f5f9', justifyContent: 'flex-end' }}>
                                {u.status === 'pending' && (
                                    <button onClick={() => handleUpdateStatus(u.id, 'active')} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}>
                                        APPROVE
                                    </button>
                                )}
                                <button
                                    onClick={() => handleResetPassword(u.email)}
                                    style={{ padding: '12px', color: '#6366f1', background: '#eef2ff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                                >
                                    <Key size={18} />
                                </button>
                                {isAdmin && u.role !== 'admin' && (
                                    <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '12px', color: '#ef4444', background: '#fff1f1', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Desktop Table View */
                <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid #f1f5f9' }}>
                            <tr>
                                <th style={{ padding: '20px 25px', fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Operator Details</th>
                                <th style={{ padding: '20px 25px', fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Role & Status</th>
                                <th style={{ padding: '20px 25px', fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Feature Permissions (Toggle to Change)</th>
                                <th style={{ padding: '20px 25px', fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px' }}>
                                        <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: '#6366f1' }} />
                                    </td>
                                </tr>
                            ) : users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '20px 25px' }}>
                                        <div style={{ fontWeight: 900, color: '#1e293b', fontSize: '1rem' }}>{u.name}</div>
                                        <div style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>{u.email}</div>
                                    </td>
                                    <td style={{ padding: '20px 25px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <span style={{ width: 'fit-content', padding: '4px 10px', borderRadius: '6px', background: u.role === 'admin' ? '#eef2ff' : '#f8fafc', color: u.role === 'admin' ? '#4f46e5' : '#64748b', fontSize: '0.7rem', fontWeight: 900, border: '1px solid currentColor' }}>
                                                {u.role.toUpperCase()}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#f59e0b' }}></div>
                                                <span style={{ fontWeight: 800, fontSize: '0.7rem', color: u.status === 'active' ? '#059669' : '#d97706' }}>
                                                    {u.status?.toUpperCase() || 'PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 25px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {PERMISSIONS.map(p => {
                                                const isActive = (u.permissions || []).includes(p.id);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        disabled={u.role === 'admin'}
                                                        onClick={() => handleTogglePermission(u, p.id)}
                                                        style={{ 
                                                            padding: '8px 14px', 
                                                            borderRadius: '10px', 
                                                            fontSize: '0.65rem', 
                                                            fontWeight: 900, 
                                                            cursor: u.role === 'admin' ? 'default' : 'pointer',
                                                            background: isActive ? '#eef2ff' : '#f8fafc',
                                                            color: isActive ? '#6366f1' : '#94a3b8',
                                                            border: `1px solid ${isActive ? '#6366f1' : '#e2e8f0'}`,
                                                            transition: 'all 0.2s',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            boxShadow: isActive ? '0 4px 6px -1px rgba(99, 102, 241, 0.1)' : 'none'
                                                        }}
                                                    >
                                                        {isActive ? <CheckCircle size={12} /> : <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #cbd5e1' }}></div>}
                                                        {p.label.toUpperCase()}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                            {u.status === 'pending' && (
                                                <button onClick={() => handleUpdateStatus(u.id, 'active')} style={{ padding: '10px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
                                                    APPROVE
                                                </button>
                                            )}
                                            {u.status === 'active' && u.role !== 'admin' && (
                                                <button onClick={() => handleUpdateStatus(u.id, 'pending')} style={{ padding: '8px 12px', background: 'white', color: '#f59e0b', border: '1px solid #fbbf24', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }}>
                                                    SUSPEND
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleResetPassword(u.email)}
                                                title="Reset Password"
                                                style={{ padding: '10px', color: '#6366f1', background: '#eef2ff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                                            >
                                                <Key size={18} />
                                            </button>
                                            {isAdmin && u.role !== 'admin' && (
                                                <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '10px', color: '#ef4444', background: '#fff1f1', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
        </div>
    );
};

export default UserManagement;
