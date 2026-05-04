import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Trash2, Edit3, UserPlus, Search, Phone, History, ArrowDownCircle, ArrowUpCircle, User, CreditCard, Share2, FileText, Image as ImageIcon, Download, Eye, X, MessageCircle } from 'lucide-react';
import { addCustomer, updateBalance, deleteCustomer, editCustomer } from '../store/slices/customerSlice';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';
import logo from '../assets/Bila_vet.png';

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
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportPreviewMode, setExportPreviewMode] = useState(null); // 'image', 'pdf', 'excel'
    const [khataType, setKhataType] = useState('Client');
    const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', address: '', type: 'Client' });
    const [editData, setEditData] = useState({ id: '', name: '', phone: '', email: '', address: '', type: 'Client' });

    // Financial Overviews
    const totals = React.useMemo(() => {
        if (!customers) return { receivable: 0, payable: 0 };
        return customers.reduce((acc, c) => {
            const type = c.type || 'Client';
            if (type === 'Client') acc.receivable += (c.balance || 0);
            else acc.payable += (c.balance || 0);
            return acc;
        }, { receivable: 0, payable: 0 });
    }, [customers]);

    const filtered = React.useMemo(() => {
        if (!customers) return [];
        return customers.filter(c =>
            (c.type || 'Client') === khataType &&
            (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone?.includes(searchTerm))
        ).sort((a, b) => b.balance - a.balance);
    }, [customers, khataType, searchTerm]);

    const handleDeleteCustomer = async (id) => {
        if (!isAdmin) return;
        if (window.confirm('Are you sure you want to PERMANENTLY delete this customer and all their history?')) {
            try {
                const { error } = await supabase
                    .from('customers')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setSelectedCust(null);
                toast.success('Customer deleted from Supabase');
            } catch (err) {
                toast.error('Delete failed');
            }
        }
    };

    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    name: editData.name,
                    phone: editData.phone,
                    email: editData.email || '',
                    address: editData.address || ''
                })
                .eq('id', editData.id);

            if (error) throw error;
            setIsEditModalOpen(false);
            toast.success('Details updated in Supabase');
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleAction = async (type) => {
        if (!amount || parseFloat(amount) <= 0) return;
        const finalAmount = parseFloat(amount);

        const newBalance = type === 'credit' ? selectedCust.balance + finalAmount : selectedCust.balance - finalAmount;
        const newHistory = [
            { date: new Date().toISOString(), amount: finalAmount, type, note: note || (type === 'credit' ? 'Manual' : 'Payment') },
            ...(selectedCust.history || [])
        ];

        try {
            const { error } = await supabase
                .from('customers')
                .update({ balance: newBalance, history: newHistory })
                .eq('id', selectedCust.id);

            if (error) throw error;
            toast.success(type === 'credit' ? 'Debt recorded' : 'Payment received');
            setAmount('');
            setNote('');
        } catch (err) {
            toast.error('Transaction failed');
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        const customerData = {
            name: newCust.name,
            phone: newCust.phone,
            email: newCust.email || '',
            address: newCust.address || '',
            type: newCust.type,
            balance: 0,
            history: []
        };

        try {
            const { error } = await supabase
                .from('customers')
                .insert([customerData]);

            if (error) throw error;
            toast.success('New account registered in Supabase');
            setIsAddModalOpen(false);
            setNewCust({ name: '', phone: '', email: '', address: '', type: 'Client' });
        } catch (err) {
            toast.error('Registration failed');
        }
    };

    const handleExportWhatsApp = (cust) => {
        const text = `*Bilal Veterinary Clinic - Khata Summary*\n\n*Customer:* ${cust.name}\n*Total Balance:* Rs ${cust.balance.toLocaleString()}\n\n*Last Transactions:*\n${cust.history?.slice(0, 5).map(h => `- ${new Date(h.date).toLocaleDateString()}: Rs ${h.amount} (${h.type})`).join('\n')}\n\n_Please clear your dues at your earliest convenience._`;
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/${cust.phone?.replace(/[^0-9]/g, '')}?text=${encodedText}`, '_blank');
    };

    const handlePrintLedger = () => {
        window.print();
    };

    const handleExportExcel = (cust) => {
        const rows = [
            ["Date", "Description", "Type", "Amount"],
            ...(cust.history || []).map(h => [new Date(h.date).toLocaleDateString(), h.note || '—', h.type.toUpperCase(), h.amount])
        ];
        let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${cust.name}_Ledger.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '15px', overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* Toolbar */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background: 'white', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'linear-gradient(45deg, #6366f1, #4f46e5)', padding: '5px', borderRadius: '8px', color: 'white' }}><CreditCard size={16} /></div>
                        Executive Khata Hub
                    </h2>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Receivables: <span style={{ color: '#ef4444' }}>Rs {totals.receivable.toLocaleString()}</span> | Payables: <span style={{ color: '#10b981' }}>Rs {totals.payable.toLocaleString()}</span></p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => {
                            setNewCust({ ...newCust, type: khataType });
                            setIsAddModalOpen(true);
                        }}
                        style={{ background: '#6366f1', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                        <UserPlus size={16} /> REGISTER NEW {khataType.toUpperCase()}
                    </button>
                )}
            </header>

            {/* TAB SWITCHER */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
                {['Client', 'Company'].map(t => (
                    <button
                        key={t}
                        onClick={() => {
                            setKhataType(t);
                            setSelectedCust(null);
                        }}
                        style={{
                            padding: '6px 18px',
                            borderRadius: '8px',
                            border: khataType === t ? 'none' : '1px solid #e2e8f0',
                            fontWeight: 900,
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            backgroundColor: khataType === t ? '#1e293b' : 'white',
                            color: khataType === t ? 'white' : '#64748b',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t} Accounts
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '15px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {/* Left: Customer Selection Wall */}
                <div style={{ width: '260px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
                    <div className="section-header" style={{ background: '#f8fafc', padding: '10px 15px', fontWeight: 950, color: '#0f172a', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                        {khataType === 'Client' ? 'Client List' : 'Company List'}
                    </div>
                    <div style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                style={{ width: '100%', padding: '8px 10px 8px 35px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600 }}
                                placeholder={`Find ${khataType.toLowerCase()}...`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ overflowY: 'scroll', flex: 1, background: '#fff' }}>
                        {filtered.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setSelectedCust(c)}
                                style={{
                                    padding: '10px 15px',
                                    borderBottom: '1px solid #f8fafc',
                                    cursor: 'pointer',
                                    background: selectedCust?.id === c.id ? '#f1f5f9' : 'transparent'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b' }}>{c.name}</span>
                                    <span style={{ fontWeight: 950, fontSize: '0.75rem', color: c.balance > 0 ? '#ef4444' : '#10b981' }}>
                                        Rs {c.balance.toLocaleString()}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{c.phone}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Account Ledger & Actions */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
                    {selectedCust ? (
                        <>
                            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, flex: 1 }}>
                                <div style={{ padding: '8px 15px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 950, fontSize: '0.95rem' }}>{selectedCust.name}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>#{selectedCust.id.toString().slice(-6).toUpperCase()}</span>
                                        <div style={{ display: 'flex', gap: '4px', marginLeft: '5px' }}>
                                            <button onClick={() => { setEditData({ ...selectedCust }); setIsEditModalOpen(true); }} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', padding: '2px' }}><Edit3 size={12} /></button>
                                            <button onClick={() => handleDeleteCustomer(selectedCust.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>
                                        <span>📞 {selectedCust.phone}</span>
                                        {selectedCust.email && <span style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '10px' }}>📧 {selectedCust.email}</span>}
                                        <span style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '10px', color: selectedCust.balance > 0 ? '#ef4444' : '#10b981', fontWeight: 950 }}>
                                            BAL: Rs {selectedCust.balance.toLocaleString()}
                                        </span>
                                    </div>
                                    {selectedCust.address && (
                                        <div style={{ width: '100%', borderTop: '1px dashed #e2e8f0', paddingTop: '4px', fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>
                                            🏠 {selectedCust.address}
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, overflowY: 'scroll', background: '#fff' }}>
                                    <table className="erp-table">
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'white' }}>
                                            <tr style={{ background: '#f8fafc' }}>
                                                <th style={{ padding: '6px 15px', fontWeight: 900, fontSize: '0.7rem' }}>Date & Time</th>
                                                <th style={{ padding: '6px 15px', fontWeight: 900, fontSize: '0.7rem' }}>Note / Detail</th>
                                                <th style={{ padding: '6px 15px', fontWeight: 900, fontSize: '0.7rem' }}>Debit (+)</th>
                                                <th style={{ padding: '6px 15px', fontWeight: 900, fontSize: '0.7rem' }}>Credit (-)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCust.history.map((h, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '5px 15px', fontSize: '0.65rem', fontWeight: 600 }}>{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td style={{ padding: '5px 15px', fontSize: '0.7rem', fontWeight: 700 }}>{h.note}</td>
                                                    <td style={{ padding: '5px 15px', color: '#ef4444', fontWeight: 900, fontSize: '0.7rem' }}>{h.type === 'credit' ? `Rs ${h.amount.toLocaleString()}` : '-'}</td>
                                                    <td style={{ padding: '5px 15px', color: '#10b981', fontWeight: 900, fontSize: '0.7rem' }}>{h.type === 'payment' ? `Rs ${h.amount.toLocaleString()}` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Action Panel */}
                            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '12px', flexShrink: 0 }}>
                                {isAdmin ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr auto', gap: '15px', height: '100%' }}>
                                        <div>
                                            <label style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>AMOUNT</label>
                                            <input
                                                type="number"
                                                style={{ width: '100%', padding: '10px', fontSize: '1.1rem', fontWeight: 950, color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none' }}
                                                value={amount}
                                                onChange={e => setAmount(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>NOTE / REMARK</label>
                                            <input
                                                style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, outline: 'none', fontSize: '0.8rem' }}
                                                value={note}
                                                onChange={e => setNote(e.target.value)}
                                                placeholder="Transaction reason..."
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <button
                                                onClick={() => handleAction('payment')}
                                                style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '0.65rem' }}
                                            >
                                                <ArrowDownCircle size={16} />
                                                PAYMENT
                                            </button>
                                            <button
                                                onClick={() => handleAction('credit')}
                                                style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', fontSize: '0.65rem' }}
                                            >
                                                <ArrowUpCircle size={16} />
                                                DEBT/BILL
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <button
                                                onClick={() => {
                                                    setIsExportModalOpen(true);
                                                    setExportPreviewMode('pdf');
                                                }}
                                                style={{ background: '#f1f5f9', color: '#6366f1', border: '1px solid #e2e8f0', borderRadius: '10px', height: '100%', padding: '0 15px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                            >
                                                <Share2 size={18} />
                                                <span style={{ fontSize: '0.55rem', fontWeight: 900 }}>SHARE</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.7rem' }}>ADMIN ONLY ACCESS</span>
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

            {/* LEDGER EXPORT MODAL */}
            {isExportModalOpen && selectedCust && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '900px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'grid', gridTemplateColumns: '280px 1fr', height: '85vh' }}>
                        {/* SIDEBAR OPTIONS */}
                        <div style={{ background: '#f8fafc', padding: '30px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Statement Export</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Export ledger for {selectedCust.name}.</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                <button onClick={() => setExportPreviewMode('image')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: exportPreviewMode === 'image' ? '#0f172a' : 'white', color: exportPreviewMode === 'image' ? 'white' : '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, textAlign: 'left' }}>
                                    <MessageCircle size={20} color="#10b981" /> WhatsApp Summary
                                </button>
                                <button onClick={() => setExportPreviewMode('pdf')} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: exportPreviewMode === 'pdf' ? '#0f172a' : 'white', color: exportPreviewMode === 'pdf' ? 'white' : '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, textAlign: 'left' }}>
                                    <FileText size={20} color="#ef4444" /> Print / PDF Ledger
                                </button>
                                <button onClick={() => handleExportExcel(selectedCust)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', fontWeight: 800, textAlign: 'left' }}>
                                    <Download size={20} color="#0ea5e9" /> Download Excel
                                </button>
                            </div>

                            <button onClick={() => setIsExportModalOpen(false)} style={{ width: '100%', padding: '15px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 900, color: '#64748b', cursor: 'pointer', marginTop: '20px' }}>Close Preview</button>
                        </div>

                        {/* PREVIEW AREA */}
                        <div style={{ padding: '40px', overflowY: 'auto', background: '#94a3b8' }}>
                            <div id="ledger-document" style={{ background: 'white', width: '100%', minHeight: '100%', padding: '50px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', position: 'relative', boxSizing: 'border-box' }}>
                                {/* LOGO & HEADER */}
                                <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #0f172a', paddingBottom: '20px' }}>
                                    <img src={logo} alt="Clinic Logo" style={{ height: '70px', marginBottom: '10px' }} />
                                    <h1 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1px' }}>BILAL VETERINARY CLINIC</h1>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Near HBL Bank Khoka Market Hasilpur | 0305-6699899</p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block' }}>ACCOUNT STATEMENT</span>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#1e293b' }}>{selectedCust.name}</h2>
                                        <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>Phone: {selectedCust.phone}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block' }}>NET BALANCE</span>
                                        <h2 style={{ fontSize: '2rem', fontWeight: 950, color: selectedCust.balance > 0 ? '#ef4444' : '#10b981' }}>Rs {selectedCust.balance.toLocaleString()}</h2>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>Generated: {new Date().toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '50px' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900 }}>DATE</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900 }}>DESCRIPTION</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900 }}>DEBIT (+)</th>
                                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900 }}>CREDIT (-)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedCust.history.map((h, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 700 }}>{new Date(h.date).toLocaleDateString()}</td>
                                                <td style={{ padding: '12px', fontSize: '0.8rem' }}>{h.note}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 900, color: '#ef4444' }}>{h.type === 'credit' ? `Rs ${h.amount.toLocaleString()}` : '—'}</td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 900, color: '#10b981' }}>{h.type === 'payment' ? `Rs ${h.amount.toLocaleString()}` : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Thank you for your business. Please clear outstanding dues.</p>
                                    <button
                                        onClick={() => exportPreviewMode === 'image' ? handleExportWhatsApp(selectedCust) : handlePrintLedger()}
                                        style={{ background: '#0f172a', color: 'white', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: 950, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    >
                                        {exportPreviewMode === 'image' ? <MessageCircle size={20} /> : <FileText size={20} />}
                                        {exportPreviewMode === 'image' ? 'SEND VIA WHATSAPP' : 'PRINT / SAVE AS PDF'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Modal */}
            {isAddModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '400px', borderRadius: '4px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', overflow: 'hidden' }}>
                        <div style={{ background: '#6366f1', color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 950 }}>REGISTER {khataType.toUpperCase()} KHATA</h3>
                            <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
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
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>EMAIL ADDRESS</label>
                                <input className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={newCust.email} onChange={e => setNewCust({ ...newCust, email: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>OFFICE / RESIDENTIAL ADDRESS</label>
                                <textarea className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', minHeight: '60px' }} value={newCust.address} onChange={e => setNewCust({ ...newCust, address: e.target.value })} />
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
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>EMAIL ADDRESS</label>
                                <input className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }} value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>OFFICE / RESIDENTIAL ADDRESS</label>
                                <textarea className="erp-input" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', minHeight: '60px' }} value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
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
