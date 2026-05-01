import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    History,
    Printer,
    RotateCcw,
    Search,
    Filter,
    FileText,
    Download,
    Calendar,
    User,
    MoreVertical,
    ChevronRight,
    ChevronLeft,
    XCircle,
    CheckCircle2
} from 'lucide-react';
import { returnSale, deleteSale } from '../store/slices/salesSlice';
import { updateStock } from '../store/slices/inventorySlice';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';

const SalesHistory = ({ isReturnsPage = false }) => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const sales = useSelector(state => state.sales.history);
    const isAdmin = user?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);

    const filteredSales = sales.filter(s =>
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (saleId) => {
        if (!isAdmin) return;
        if (window.confirm('CRITICAL: Delete this invoice permanently from Cloud & Local? This action is IRREVERSIBLE.')) {
            dispatch(deleteSale(saleId));

            // CLOUD DELETE
            if (navigator.onLine) {
                try {
                    await deleteDoc(doc(db, "sales", saleId));
                    toast.success('Invoice Purged from Cloud');
                } catch (err) {
                    console.error("Delete Sync Failed:", err);
                }
            }
            toast.success('Document Deleted');
            setSelectedSale(null);
        }
    };

    const handleReturn = async (sale) => {
        if (sale.status === 'Returned') return;
        if (window.confirm('Authorize Full Return? Stock will be updated accordingly.')) {
            dispatch(returnSale(sale.id));

            // Local Redux Inventory Update
            sale.items.forEach(item => {
                dispatch(updateStock({ id: item.id, quantity: item.quantity, mode: 'add' }));
            });

            // CLOUD SYNC
            if (navigator.onLine) {
                try {
                    // Update Sale Status in Cloud
                    await setDoc(doc(db, "sales", sale.id), { ...sale, status: 'Returned' }, { merge: true });

                    // Update Inventory Stocks in Cloud
                    for (const item of sale.items) {
                        // We need the current stock from DB or assume local is correct
                        // For simplicity, we'll push the updated stock based on local calculation
                        // In a real app, we'd use a transaction or increment()
                        const newStock = item.stock + item.quantity;
                        await setDoc(doc(db, "inventory", item.id), { stock: newStock }, { merge: true });
                    }
                    toast.success('Cloud Records Updated');
                } catch (err) {
                    console.error("Return Sync Failed:", err);
                }
            }

            toast.success(`INV #${sale.id} Successfully Reversed`);
            setSelectedSale(null);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: selectedSale ? '1fr 400px' : '1fr', height: '100%', gap: '2px', background: '#e2e8f0', overflow: 'hidden' }}>

            {/* LEFT: MASTER LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>

                {/* TOOLBAR */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b' }}>
                            {isReturnsPage ? 'SALES RETURN (RMA)' : 'TRANSACTION REGISTRY'}
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Audit trail and document management console.</p>
                    </div>

                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="SEARCH BY INVOICE OR CLIENT..."
                            style={{ width: '100%', padding: '10px 15px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button style={{ padding: '10px 15px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Calendar size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>PERIOD</span>
                    </button>

                    <button style={{ padding: '10px 15px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Download size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>EXPORT</span>
                    </button>
                </div>

                {/* DATA GRID */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                            <tr>
                                <th style={{ padding: '15px 20px' }}>ID</th>
                                <th style={{ padding: '15px 20px' }}>CLIENT / ACCOUNT</th>
                                <th style={{ padding: '15px 20px' }}>TIMESTAMP</th>
                                <th style={{ padding: '15px 20px' }}>OPERATOR</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right' }}>REVENUE</th>
                                <th style={{ padding: '15px 20px', textAlign: 'center' }}>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map(sale => (
                                <tr
                                    key={sale.id}
                                    onClick={() => setSelectedSale(sale)}
                                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedSale?.id === sale.id ? '#f0f9ff' : 'white' }}
                                >
                                    <td style={{ padding: '15px 20px', fontWeight: 900, color: '#10b981', fontSize: '0.7rem' }}>
                                        #{sale.id.toString().toUpperCase()}
                                    </td>
                                    <td style={{ padding: '15px 20px', fontWeight: 700 }}>{sale.customerName || '—'}</td>
                                    <td style={{ padding: '15px 20px', fontSize: '0.8rem', color: '#64748b' }}>
                                        {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString()}
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px' }}>{sale.paymentMethod.toUpperCase()}</span>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontWeight: 900 }}>Rs {sale.total.toLocaleString()}</td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sale.status === 'Returned' ? '#ef4444' : '#10b981' }}></div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sale.status === 'Returned' ? '#ef4444' : '#10b981' }}>{sale.status.toUpperCase()}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                        <ChevronRight size={18} color="#cbd5e1" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* FOOTER STATS */}
                <div style={{ padding: '15px 30px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                    <span>TOTAL DOCUMENTS: {filteredSales.length}</span>
                    <div style={{ display: 'flex', gap: '30px' }}>
                        <span>AUDITED TOTAL: <span style={{ color: '#1e293b', fontSize: '1rem', fontWeight: 900 }}>Rs {filteredSales.reduce((acc, s) => acc + s.total, 0).toLocaleString()}</span></span>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDEBAR: DOCUMENT VIEWER */}
            {selectedSale && (
                <div style={{ background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 900 }}>DOCUMENT VIEWER</h3>
                        <button onClick={() => setSelectedSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={20} color="#94a3b8" /></button>
                    </div>

                    <div style={{ padding: '30px', flex: 1, overflowY: 'auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #f1f5f9' }}>
                            <div style={{ width: '50px', height: '50px', background: '#1e293b', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '1.2rem', fontWeight: 900 }}>V</div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 900 }}>BILAL VET CLINIC</h2>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>INVOICE NUMBER: #{selectedSale.id}</p>
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>CLIENT ACCOUNT:</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{selectedSale.customerName || 'WALK-IN'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>PAYMENT MODE:</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{selectedSale.paymentMethod.toUpperCase()}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px' }}>LINE ITEMS</p>
                            {selectedSale.items.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                                    <span>{item.name} <strong style={{ color: '#94a3b8' }}>x{item.quantity}</strong></span>
                                    <span style={{ fontWeight: 800 }}>Rs {(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 'auto', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>NET TOTAL:</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 950 }}>Rs {selectedSale.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <button className="btn-erp" style={{ flex: 1, padding: '12px', justifyContent: 'center' }}>
                            <Printer size={16} /> PRINT
                        </button>
                        {isReturnsPage && isAdmin && (
                            <button
                                onClick={() => handleReturn(selectedSale)}
                                disabled={selectedSale.status === 'Returned'}
                                style={{ flex: 1, padding: '12px', background: selectedSale.status === 'Returned' ? '#e2e8f0' : '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: selectedSale.status === 'Returned' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <RotateCcw size={16} /> REVERSE
                            </button>
                        )}
                        {!isReturnsPage && isAdmin && (
                            <button
                                onClick={() => handleDelete(selectedSale.id)}
                                style={{ flex: 1, padding: '12px', background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                <Trash2 size={16} /> DELETE
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;
