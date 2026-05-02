import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Truck, 
    Plus, 
    Search, 
    Phone, 
    Building2, 
    History, 
    DollarSign, 
    ArrowUpRight, 
    ArrowDownRight, 
    Trash2, 
    X, 
    CheckCircle,
    UserPlus
} from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const SupplierManagement = () => {
    const dispatch = useDispatch();
    const suppliers = useSelector(state => state.suppliers.list);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState('purchase'); // purchase or payment

    const [newSupplier, setNewSupplier] = useState({ name: '', contact: '', company: '', balance: '' });
    const [actionData, setActionData] = useState({ amount: '', note: '' });

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalOutstanding = suppliers.reduce((acc, s) => acc + s.balance, 0);

    const handleAddSupplier = async (e) => {
        e.preventDefault();
        if (!newSupplier.name || !newSupplier.company) return toast.error('Name and Company are required');
        const supplier = {
            name: newSupplier.name,
            contact: newSupplier.contact,
            company: newSupplier.company,
            balance: parseFloat(newSupplier.balance) || 0,
            history: newSupplier.balance > 0 ? [{
                date: new Date().toISOString(),
                type: 'Opening Balance',
                amount: parseFloat(newSupplier.balance),
                note: 'Account Created'
            }] : []
        };

        try {
            const { error } = await supabase
                .from('suppliers')
                .insert([supplier]);
            
            if (error) throw error;
            toast.success('Supplier Profile Created in Supabase');
            setNewSupplier({ name: '', contact: '', company: '', balance: '' });
            setIsAddModalOpen(false);
        } catch (err) {
            toast.error('Failed to create supplier');
        }
    };

    const handleAction = async (e) => {
        e.preventDefault();
        if (!actionData.amount) return toast.error('Enter amount');
        
        const amount = parseFloat(actionData.amount);
        const newBalance = actionType === 'purchase' ? selectedSupplier.balance + amount : selectedSupplier.balance - amount;
        const newHistory = [
            {
                date: new Date().toISOString(),
                type: actionType === 'purchase' ? 'Stock Purchase' : 'Payment Made',
                amount: amount,
                note: actionData.note || ''
            },
            ...(selectedSupplier.history || [])
        ];

        try {
            const { error } = await supabase
                .from('suppliers')
                .update({ balance: newBalance, history: newHistory })
                .eq('id', selectedSupplier.id);
            
            if (error) throw error;
            toast.success(actionType === 'purchase' ? 'Purchase Recorded' : 'Payment Recorded');
            setActionData({ amount: '', note: '' });
            setIsActionModalOpen(false);
        } catch (err) {
            toast.error('Failed to update balance');
        }
    };

    const handleDeleteSupplier = async (id) => {
        if (!window.confirm('Delete this supplier?')) return;
        try {
            const { error } = await supabase
                .from('suppliers')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setSelectedSupplier(null);
            toast.success('Supplier Deleted from Supabase');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px', backgroundColor: '#f8fafc' }}>
            
            {/* HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Truck size={28} color="#2563eb" /> SUPPLIER NETWORK
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>Manage vendor relations, procurement khata, and settlement history.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right', paddingRight: '20px', borderRight: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>TOTAL OUTSTANDING</p>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#ef4444' }}>Rs {totalOutstanding.toLocaleString()}</h4>
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <UserPlus size={18} /> NEW SUPPLIER
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '25px', flex: 1, overflow: 'hidden' }}>
                
                {/* SUPPLIER LIST */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
                    <div style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#64748b' }} />
                            <input 
                                type="text" 
                                placeholder="Search by name or company..." 
                                style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', paddingBottom: '20px' }}>
                        {filteredSuppliers.map((sup) => (
                            <motion.div 
                                key={sup.id}
                                layoutId={sup.id}
                                onClick={() => setSelectedSupplier(sup)}
                                style={{ 
                                    background: 'white', 
                                    padding: '20px', 
                                    borderRadius: '16px', 
                                    border: selectedSupplier?.id === sup.id ? '2px solid #2563eb' : '1px solid #e2e8f0', 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: selectedSupplier?.id === sup.id ? '0 10px 15px -3px rgba(37, 99, 235, 0.1)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={24} />
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>PAYABLE BALANCE</p>
                                        <p style={{ fontSize: '1.1rem', fontWeight: 950, color: sup.balance > 0 ? '#ef4444' : '#059669' }}>Rs {sup.balance.toLocaleString()}</p>
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '5px' }}>{sup.name}</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Building2 size={14} /> {sup.company}
                                </p>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                    <Phone size={14} /> {sup.contact || 'No Contact'}
                                </p>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSupplier(sup); setActionType('purchase'); setIsActionModalOpen(true); }}
                                        style={{ flex: 1, padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                                    >+ STOCK</button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSupplier(sup); setActionType('payment'); setIsActionModalOpen(true); }}
                                        style={{ flex: 1, padding: '10px', background: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                                    >PAYMENT</button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* SUPPLIER DETAILS & HISTORY */}
                <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {selectedSupplier ? (
                        <>
                            <div style={{ padding: '25px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h4 style={{ fontSize: '1.3rem', fontWeight: 950, color: '#1e293b' }}>{selectedSupplier.name}</h4>
                                        <p style={{ color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }}>{selectedSupplier.company}</p>
                                    </div>
                                    <button onClick={() => handleDeleteSupplier(selectedSupplier.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            
                            <div style={{ flex: 1, overflowY: 'auto', padding: '25px' }}>
                                <h5 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <History size={18} /> TRANSACTION HISTORY
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {selectedSupplier.history?.map((h, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '15px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: h.type.includes('Payment') ? '#ecfdf5' : '#fff1f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {h.type.includes('Payment') ? <ArrowDownRight size={18} color="#059669" /> : <ArrowUpRight size={18} color="#ef4444" />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{h.type}</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 950, color: h.type.includes('Payment') ? '#059669' : '#ef4444' }}>
                                                        {h.type.includes('Payment') ? '-' : '+'} Rs {h.amount.toLocaleString()}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{h.note || 'No notes'}</p>
                                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, marginTop: '4px' }}>{new Date(h.date).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedSupplier.history || selectedSupplier.history.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                            <History size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                            <p style={{ fontSize: '0.8rem', fontWeight: 800 }}>No transaction history found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px', textAlign: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                <Truck size={40} color="#cbd5e1" />
                            </div>
                            <h3 style={{ color: '#1e293b', fontWeight: 900 }}>Select a Supplier</h3>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginTop: '10px' }}>Click on a supplier from the list to view their full transaction ledger and history.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD SUPPLIER MODAL */}
            {isAddModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '450px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#2563eb', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900 }}>NEW SUPPLIER REGISTRATION</h3>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAddSupplier} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>FULL NAME</label>
                                <input style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }} value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} placeholder="e.g. Ali Ahmed" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>COMPANY / DISTRIBUTOR NAME</label>
                                <input style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }} value={newSupplier.company} onChange={e => setNewSupplier({...newSupplier, company: e.target.value})} placeholder="e.g. GSK Pharma" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CONTACT NUMBER</label>
                                <input style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }} value={newSupplier.contact} onChange={e => setNewSupplier({...newSupplier, contact: e.target.value})} placeholder="e.g. 0300-1234567" />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>OPENING PAYABLE BALANCE (Rs)</label>
                                <input type="number" style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }} value={newSupplier.balance} onChange={e => setNewSupplier({...newSupplier, balance: e.target.value})} placeholder="0.00" />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>
                                CREATE SUPPLIER PROFILE
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ACTION MODAL (PURCHASE/PAYMENT) */}
            {isActionModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '400px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ background: actionType === 'purchase' ? '#ef4444' : '#059669', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900 }}>{actionType === 'purchase' ? 'RECORD PURCHASE' : 'RECORD PAYMENT'}</h3>
                            <button onClick={() => setIsActionModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAction} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>SUPPLIER: {selectedSupplier.name}</p>
                                <p style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>Current Balance: Rs {selectedSupplier.balance.toLocaleString()}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>AMOUNT (Rs)</label>
                                <input 
                                    type="number"
                                    autoFocus
                                    placeholder="0.00" 
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950, color: actionType === 'purchase' ? '#ef4444' : '#059669' }}
                                    value={actionData.amount}
                                    onChange={(e) => setActionData({ ...actionData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>NOTES / INVOICE NO</label>
                                <input 
                                    placeholder="e.g. Invoice #123 or Cash Payment" 
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }}
                                    value={actionData.note}
                                    onChange={(e) => setActionData({ ...actionData, note: e.target.value })}
                                />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '15px', background: actionType === 'purchase' ? '#ef4444' : '#059669', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>
                                {actionType === 'purchase' ? 'ADD TO PAYABLES' : 'REDUCE BALANCE'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SupplierManagement;
