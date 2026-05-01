import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import UpdateChecker from '../components/UpdateChecker';
import { auth } from '../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Settings as SettingsIcon, Lock, ShieldCheck, Key, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user } = useSelector(state => state.auth);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match!");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("No user found");

            // Firebase requires re-authentication for sensitive operations
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);

            await updatePassword(currentUser, newPassword);

            toast.success("Password updated successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/wrong-password') {
                toast.error("Current password is incorrect.");
            } else {
                toast.error(error.message || "Failed to update password.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <header style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>SYSTEM SETTINGS</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Security and profile configurations for {user?.name}.</p>
                </div>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '10px', borderRadius: '8px' }}>
                    <SettingsIcon size={24} />
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                {/* Side Navigation */}
                <div className="pos-card" style={{ padding: '10px' }}>
                    <button style={{ width: '100%', padding: '12px', background: '#eff6ff', border: 'none', borderRadius: '6px', color: '#2563eb', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <Lock size={18} />
                        Security Settings
                    </button>
                    <button style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', borderRadius: '6px', color: '#64748b', fontWeight: 700, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'not-allowed', marginTop: '10px' }}>
                        <ShieldCheck size={18} />
                        Role Permissions
                    </button>

                    <div style={{ marginTop: '50px' }}>
                        <UpdateChecker />
                    </div>
                </div>

                {/* Main Content */}
                <div className="pos-card" style={{ padding: '30px' }}>
                    <div style={{ marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '5px' }}>Change Access Password</h3>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Update your terminal login credentials. Re-authentication is required.</p>
                    </div>

                    <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Current Password</label>
                            <div style={{ position: 'relative' }}>
                                <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                                <input
                                    type="password"
                                    required
                                    className="erp-input"
                                    style={{ width: '100%', padding: '10px 15px 10px 40px' }}
                                    placeholder="••••••••"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>New Password</label>
                                <input
                                    type="password"
                                    required
                                    className="erp-input"
                                    style={{ width: '100%', padding: '10px 15px' }}
                                    placeholder="Min 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    className="erp-input"
                                    style={{ width: '100%', padding: '10px 15px' }}
                                    placeholder="Re-type new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <AlertCircle size={20} color="#64748b" style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.5 }}>
                                <strong>Important:</strong> Changing your password will affect all devices using this account. Make sure to remember your new credentials.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-erp btn-erp-primary"
                            style={{ padding: '15px', justifyContent: 'center', fontWeight: 900, marginTop: '10px' }}
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : "UPDATE SECURITY CREDENTIALS"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;
