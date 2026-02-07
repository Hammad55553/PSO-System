import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
    BarChart3,
    TrendingUp,
    PieChart,
    Download,
    Calendar,
    ChevronRight,
    FileText,
    Save,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    Search
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const Reports = () => {
    const { history } = useSelector(state => state.sales);
    const { items } = useSelector(state => state.inventory);
    const { activeShift } = useSelector(state => state.shift);
    const { user } = useSelector(state => state.auth);

    const [isSaving, setIsSaving] = useState(false);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    // Data Calculation Methods
    const filteredSales = history.filter(s => new Date(s.date).toISOString().split('T')[0] === dateFilter);
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalTransactions = filteredSales.length;

    // Category Breakdown
    const categoryStats = {};
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            categoryStats[item.category] = (categoryStats[item.category] || 0) + (item.price * item.quantity);
        });
    });

    // Top Selling in filtered period
    const productStats = {};
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            productStats[item.name] = (productStats[item.name] || 0) + item.quantity;
        });
    });
    const topSelling = Object.entries(productStats).sort(([, a], [, b]) => b - a).slice(0, 5);

    const handleSaveReport = async () => {
        setIsSaving(true);
        try {
            const reportData = {
                reportDate: dateFilter,
                generatedBy: user.name,
                generatedAt: new Date().toISOString(),
                metrics: {
                    revenue: totalRevenue,
                    transactions: totalTransactions,
                    topProducts: topSelling,
                    categoryBreakdown: categoryStats
                },
                type: 'Daily Summary'
            };

            await addDoc(collection(db, "reports"), reportData);
            toast.success(`Report for ${dateFilter} archived successfully!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to archive report to Firebase.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <header style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={24} color="var(--primary)" /> ANALYTICAL INTELLIGENCE
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generate, audit, and archive business performance reports.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                        <input
                            type="date"
                            className="erp-input"
                            style={{ paddingLeft: '40px', fontWeight: 800 }}
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleSaveReport}
                        disabled={isSaving || filteredSales.length === 0}
                        className="btn-erp btn-erp-primary"
                        style={{ padding: '0 20px', gap: '10px' }}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        ARCHIVE TO CLOUD
                    </button>
                </div>
            </header>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px', flex: 1, overflow: 'hidden' }}>

                {/* Left: Summary Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

                    <div className="pos-card" style={{ padding: '25px', borderTop: '4px solid var(--primary)' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '10px' }}>REPORT PERIOD REVENUE</span>
                        <h3 style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--text-main)' }}>Rs {totalRevenue.toLocaleString()}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', color: '#10b981', fontSize: '0.75rem', fontWeight: 800 }}>
                            <TrendingUp size={14} />
                            <span>{totalTransactions} TOTAL TRANSACTIONS</span>
                        </div>
                    </div>

                    <div className="pos-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 800 }}>CATEGORY MIX</h4>
                            <PieChart size={16} color="#64748b" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Object.entries(categoryStats).map(([cat, val]) => (
                                <div key={cat}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                        <span>{cat}</span>
                                        <span>Rs {val.toLocaleString()}</span>
                                    </div>
                                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                                        <div style={{ height: '100%', background: 'var(--primary)', borderRadius: '3px', width: `${(val / totalRevenue) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            {Object.keys(categoryStats).length === 0 && (
                                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '20px' }}>No category data for this date.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Detailed Analysis */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '15px 25px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 900 }}>TRANSACTIONAL AUDIT LIST</h4>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>DATE: {dateFilter}</span>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table className="erp-table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th>INVOICE #</th>
                                    <th>CLIENT</th>
                                    <th>ITEMS</th>
                                    <th>METHOD</th>
                                    <th style={{ textAlign: 'right' }}>NET VALUE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSales.map(sale => (
                                    <tr key={sale.id}>
                                        <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{sale.id}</td>
                                        <td style={{ fontWeight: 700 }}>{sale.customerName || 'Walking Client'}</td>
                                        <td style={{ fontSize: '0.75rem' }}>{sale.items.length} SKUs</td>
                                        <td>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px' }}>
                                                {sale.paymentMethod.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 900 }}>Rs {sale.total.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {filteredSales.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                <FileText size={40} opacity={0.2} />
                                                <p style={{ fontWeight: 600 }}>No transactional records found for selected period.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ padding: '20px 25px', background: '#f8fafc', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8' }}>AVG TRANSACTION</p>
                                <p style={{ fontSize: '0.9rem', fontWeight: 900 }}>Rs {totalTransactions ? (totalRevenue / totalTransactions).toFixed(0) : 0}</p>
                            </div>
                        </div>
                        <button className="btn-erp" style={{ background: 'white' }}>
                            <Download size={16} /> DOWNLOAD PDF SUMMARY
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Reports;
