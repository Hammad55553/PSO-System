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
        <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <header style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>TEAM ACCESS CONTROL</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Approve new registrations and manage operator privileges.</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={20} color="var(--primary)" />
                    <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>{users.length} TOTAL USERS</span>
                </div>
            </header>

            <div className="pos-card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ padding: '15px 25px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>OPERATOR NAME</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>EMAIL</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>ROLE</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>STATUS</th>
                                <th style={{ padding: '15px 25px', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '100px' }}>
                                        <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto', color: 'var(--primary)' }} />
                                    </td>
                                </tr>
                            ) : users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px 25px', fontWeight: 800 }}>{u.name}</td>
                                    <td style={{ padding: '15px 25px', color: '#64748b', fontWeight: 600 }}>{u.email}</td>
                                    <td style={{ padding: '15px 25px' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '4px', background: u.role === 'admin' ? '#eff6ff' : '#f8fafc', color: u.role === 'admin' ? '#2563eb' : '#64748b', fontSize: '0.7rem', fontWeight: 900, border: '1px solid currentColor' }}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px 25px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#f59e0b' }}></div>
                                            <span style={{ fontWeight: 800, fontSize: '0.75rem', color: u.status === 'active' ? '#10b981' : '#f59e0b' }}>
                                                {u.status?.toUpperCase() || 'PENDING'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 25px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                            {u.status === 'pending' && (
                                                <button onClick={() => handleUpdateStatus(u.id, 'active')} style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }}>
                                                    APPROVE
                                                </button>
                                            )}
                                            {u.status === 'active' && u.role !== 'admin' && (
                                                <button onClick={() => handleUpdateStatus(u.id, 'pending')} style={{ padding: '8px 12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', fontSize: '0.7rem' }}>
                                                    SUSPEND
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleResetPassword(u.email)}
                                                title="Reset Password"
                                                style={{ padding: '8px', color: '#6366f1', background: '#eef2ff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteUser(u.id)} style={{ padding: '8px', color: '#ef4444', background: '#fff1f1', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
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
