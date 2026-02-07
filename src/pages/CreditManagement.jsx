import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Trash2, Edit3, UserPlus, Search, Phone, History, ArrowDownCircle, ArrowUpCircle, User, CreditCard } from 'lucide-react';
import { addCustomer, updateBalance, deleteCustomer, editCustomer } from '../store/slices/customerSlice';
import toast from 'react-hot-toast';

import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const CreditManagement = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';
    const customers = useSelector(state => state.customers.list);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCust, setSelectedCust] = useState(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newCust, setNewCust] = useState({ name: '', phone: '' });
    const [editData, setEditData] = useState({ id: '', name: '', phone: '' });

    const handleDeleteCustomer = async (id) => {
        if (!isAdmin) return;
        if (window.confirm('Are you sure you want to PERMANENTLY delete this customer and all their history?')) {
            dispatch(deleteCustomer(id));
            if (navigator.onLine) {
                try {
                    await deleteDoc(doc(db, "customers", id));
                    toast.success('Account removed from cloud');
                } catch (err) {
                    console.error(err);
                }
            }
            setSelectedCust(null);
            toast.success('Customer deleted');
        }
    };

    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
        dispatch(editCustomer(editData));
        if (navigator.onLine) {
            try {
                // Merge with existing data to preserve balance/history
                await setDoc(doc(db, "customers", editData.id), { name: editData.name, phone: editData.phone }, { merge: true });
                toast.success('Cloud record updated');
            } catch (err) {
                console.error(err);
            }
        }
        setIsEditModalOpen(false);
        // Refresh selected object if it's the one edited
        if (selectedCust?.id === editData.id) {
            setSelectedCust({ ...selectedCust, ...editData });
        }
        toast.success('Details updated');
    };

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
    );

    const handleAction = async (type) => {
        if (!amount || parseFloat(amount) <= 0) return;
        const finalAmount = parseFloat(amount);

        // Update local Redux first
        dispatch(updateBalance({
            id: selectedCust.id,
            amount: finalAmount,
            type,
            note: note || (type === 'credit' ? 'Manual credit entry' : 'Bill payment')
        }));

        // CLOUD PUSH
        if (navigator.onLine) {
            try {
                // We need the updated customer object from state or recalculate
                const updatedCust = { ...selectedCust };
                if (type === 'credit') updatedCust.balance += finalAmount;
                else if (type === 'payment') updatedCust.balance -= finalAmount;

                updatedCust.history = [
                    { date: new Date().toISOString(), amount: finalAmount, type, note: note || (type === 'credit' ? 'Manual' : 'Payment') },
                    ...(updatedCust.history || [])
                ];

                await setDoc(doc(db, "customers", selectedCust.id), updatedCust);
            } catch (err) {
                console.error("Cloud Sync Failed:", err);
            }
        }

        toast.success(type === 'credit' ? 'Debt recorded successfully' : 'Payment received and updated');
        setAmount('');
        setNote('');
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        const id = Date.now().toString();
        const customerData = { ...newCust, id, balance: 0, history: [] };

        dispatch(addCustomer(customerData));

        // CLOUD PUSH
        if (navigator.onLine) {
            try {
                await setDoc(doc(db, "customers", id), customerData);
            } catch (err) {
                console.error("Cloud Sync Failed:", err);
            }
        }

        toast.success('New customer account registered');
        setIsAddModalOpen(false);
        setNewCust({ name: '', phone: '' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Toolbar */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Customer Credit (Khatta)</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage receivables, track payments, and register new credit accounts.</p>
                </div>
                {isAdmin && (
                    <button className="btn-erp btn-erp-primary" onClick={() => setIsAddModalOpen(true)}>
                        <UserPlus size={16} />
                        Register New Account (Alt+A)
                    </button>
                )}
            </header>

            <div className="pos-layout" style={{ gridTemplateColumns: '280px 1fr' }}>
                {/* Left: Customer Selection Wall */}
                <div className="pos-section">
                    <div className="section-header">Credit Accounts</div>
                    <div style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                            <input
                                className="erp-input"
                                style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.8rem' }}
                                placeholder="Search account..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filtered.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedCust(c)}
                                style={{
                                    padding: '12px 15px',
                                    borderBottom: '1px solid #f1f5f9',
                                    cursor: 'pointer',
                                    background: selectedCust?.id === c.id ? '#eff6ff' : 'transparent',
                                    borderLeft: selectedCust?.id === c.id ? '4px solid var(--primary)' : '4px solid transparent',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.name}</span>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: c.balance > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                                        Rs {c.balance.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Phone size={10} /> {c.phone}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Account Ledger & Actions */}
                <div style={{ display: 'grid', gridTemplateRows: '1fr 180px', gap: '10px' }}>
                    {selectedCust ? (
                        <>
                            <div className="pos-section">
                                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span>Account Statement: {selectedCust.name}</span>
                                        {isAdmin && (
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button
                                                    onClick={() => {
                                                        setEditData({ id: selectedCust.id, name: selectedCust.name, phone: selectedCust.phone });
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#475569' }}
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCustomer(selectedCust.id)}
                                                    style={{ background: '#fff1f1', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: '#dc2626' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.7rem' }}>A/C ID: {selectedCust.id}</span>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    <table className="erp-table">
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                            <tr>
                                                <th>Ref. Date</th>
                                                <th>Description / Note</th>
                                                <th>Debit (+)</th>
                                                <th>Credit (-)</th>
                                                <th style={{ textAlign: 'right' }}>Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCust.history.map((h, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontSize: '0.75rem' }}>{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString()}</td>
                                                    <td>{h.note}</td>
                                                    <td style={{ color: 'var(--accent-red)', fontWeight: h.type === 'credit' ? 700 : 400 }}>
                                                        {h.type === 'credit' ? `Rs ${h.amount.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td style={{ color: 'var(--accent-green)', fontWeight: h.type === 'payment' ? 700 : 400 }}>
                                                        {h.type === 'payment' ? `Rs ${h.amount.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 800 }}>-</td>
                                                </tr>
                                            ))}
                                            {selectedCust.history.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                        No transaction history found for this account.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Action Panel */}
                            <div className="pos-section" style={{ background: '#f8fafc', padding: '15px' }}>
                                {isAdmin ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', height: '100%' }}>
                                        <div style={{ display: 'flex', gap: '15px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>ENTRY AMOUNT (Rs)</label>
                                                <input
                                                    type="number"
                                                    className="erp-input"
                                                    style={{ width: '100%', padding: '10px', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', border: '1px solid var(--border)', borderRadius: '4px' }}
                                                    value={amount}
                                                    onChange={e => setAmount(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div style={{ flex: 1.5 }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>REMARKS / NOTE</label>
                                                <input
                                                    className="erp-input"
                                                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px' }}
                                                    value={note}
                                                    onChange={e => setNote(e.target.value)}
                                                    placeholder="Reason for adjustment..."
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <button
                                                onClick={() => handleAction('payment')}
                                                style={{ background: 'var(--accent-green)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                            >
                                                <ArrowDownCircle size={24} />
                                                <span>RECEIVE PAYMENT</span>
                                            </button>
                                            <button
                                                onClick={() => handleAction('credit')}
                                                style={{ background: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                            >
                                                <ArrowUpCircle size={24} />
                                                <span>ADD DEBT (KHATTA)</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#64748b' }}>
                                        <div style={{ padding: '8px 15px', background: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <CreditCard size={20} />
                                            <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>MANUAL ADJUSTMENT RESTRICTED TO ADMINISTRATORS ONLY</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ gridRow: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid var(--border)', borderRadius: '4px', opacity: 0.5 }}>
                            <User size={64} style={{ marginBottom: '15px' }} />
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Select Customer Account</h3>
                            <p>Search or click on an account from the left to view statement.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Registration Modal */}
            {isAddModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '400px', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>REGISTER NEW CREDIT ACCOUNT</h3>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                        </div>
                        <form onSubmit={handleAddCustomer} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>FULL NAME</label>
                                <input required className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={newCust.name} onChange={e => setNewCust({ ...newCust, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>CONTACT NUMBER</label>
                                <input required className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={newCust.phone} onChange={e => setNewCust({ ...newCust, phone: e.target.value })} />
                            </div>
                            <button type="submit" className="btn-erp btn-erp-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '10px' }}>Register Account</button>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Modal */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '400px', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 800 }}>UPDATE CUSTOMER DETAILS</h3>
                            <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                        </div>
                        <form onSubmit={handleUpdateCustomer} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>FULL NAME</label>
                                <input required className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>CONTACT NUMBER</label>
                                <input required className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                            </div>
                            <button type="submit" className="btn-erp btn-erp-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginTop: '10px' }}>Save Changes</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditManagement;
