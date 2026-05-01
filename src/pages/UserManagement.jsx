import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Users, CheckCircle, XCircle, Shield, Trash2, Loader2, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const userList = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setUsers(userList);
        } catch (error) {
            toast.error("Failed to load user list");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleTogglePermission = async (user, permission) => {
        const currentPerms = user.permissions || ['pos', 'inventory', 'credit', 'reports'];
        const newPerms = currentPerms.includes(permission)
            ? currentPerms.filter(p => p !== permission)
            : [...currentPerms, permission];
        
        try {
            await updateDoc(doc(db, "users", user.id), { permissions: newPerms });
            toast.success(`Updated ${permission} access for ${user.name}`);
            fetchUsers();
        } catch (error) {
            toast.error("Failed to update permissions");
        }
    };

    const PERMISSIONS = [
        { id: 'pos', label: 'Billing' },
        { id: 'inventory', label: 'Stock' },
        { id: 'credit', label: 'Accounts' },
        { id: 'reports', label: 'Reports' }
    ];

    const handleUpdateStatus = async (userId, newStatus) => {
        try {
            await updateDoc(doc(db, "users", userId), { status: newStatus });
            toast.success(`User marked as ${newStatus}`);
            fetchUsers();
        } catch (error) {
            toast.error("Failed to update user");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Delete this user account permanently?")) return;
        try {
            await deleteDoc(doc(db, "users", userId));
            toast.success("User deleted");
            fetchUsers();
        } catch (error) {
            toast.error("Failed to delete user");
        }
    };

    const handleResetPassword = async (email) => {
        if (!window.confirm(`Send password reset email to ${email}?`)) return;
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success(`Reset link sent to ${email}`);
        } catch (error) {
            toast.error("Failed to send reset link");
        }
    };

    return (
        <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
            <header style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <Shield size={24} color="#6366f1" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#1e293b' }}>TEAM ACCESS CONTROL</h2>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Manage operator privileges and feature restrictions.</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={20} color="#6366f1" />
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#1e293b' }}>{users.length} STAFF MEMBERS</span>
                </div>
            </header>

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
                                                const isActive = (u.permissions || ['pos', 'inventory', 'credit', 'reports']).includes(p.id);
                                                return (
                                                    <button
                                                        key={p.id}
                                                        disabled={u.role === 'admin'}
                                                        onClick={() => handleTogglePermission(u, p.id)}
                                                        style={{ 
                                                            padding: '6px 12px', 
                                                            borderRadius: '8px', 
                                                            fontSize: '0.7rem', 
                                                            fontWeight: 900, 
                                                            cursor: u.role === 'admin' ? 'default' : 'pointer',
                                                            background: isActive ? '#ecfdf5' : '#f1f5f9',
                                                            color: isActive ? '#059669' : '#94a3b8',
                                                            border: `1px solid ${isActive ? '#10b981' : '#e2e8f0'}`,
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
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
                                            {u.role !== 'admin' && (
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
        </div>
    );
};

export default UserManagement;
