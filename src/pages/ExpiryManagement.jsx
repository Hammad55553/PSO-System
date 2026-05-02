import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
    Calendar, 
    AlertTriangle, 
    Clock, 
    CheckCircle, 
    Trash2, 
    Filter,
    Search,
    ShieldAlert
} from 'lucide-react';

const ExpiryManagement = () => {
    const { user } = useSelector(state => state.auth);
    const { items } = useSelector(state => state.inventory);
    const isAdmin = user?.role === 'admin';
    const [searchTerm, setSearchTerm] = React.useState('');
    const [activeTab, setActiveTab] = React.useState('All'); // All, Critical, Pre-Critical

    const processedItems = useMemo(() => {
        return items.filter(item => {
            if (!item.expiry) return activeTab === 'All';
            
            const expiryDate = new Date(item.expiry);
            const today = new Date();
            const days = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            const criticalLimit = item.critical_days || 60;
            const preCriticalLimit = 120;

            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesTab = true;
            if (activeTab === 'Critical') {
                matchesTab = days <= criticalLimit;
            } else if (activeTab === 'Pre-Critical') {
                matchesTab = days > criticalLimit && days <= preCriticalLimit;
            }

            return matchesSearch && matchesTab;
        }).sort((a, b) => {
            const daysA = Math.ceil((new Date(a.expiry) - new Date()) / (1000 * 60 * 60 * 24));
            const daysB = Math.ceil((new Date(b.expiry) - new Date()) / (1000 * 60 * 60 * 24));
            return daysA - daysB;
        });
    }, [items, searchTerm, activeTab]);

    const stats = {
        critical: items.filter(i => i.expiry && Math.ceil((new Date(i.expiry) - new Date()) / (1000 * 60 * 60 * 24)) <= (i.critical_days || 60)).length,
        preCritical: items.filter(i => {
            if (!i.expiry) return false;
            const days = Math.ceil((new Date(i.expiry) - new Date()) / (1000 * 60 * 60 * 24));
            return days > (i.critical_days || 60) && days <= 120;
        }).length
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px', backgroundColor: '#f8fafc' }}>
            
            {/* 1. HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <ShieldAlert size={28} color="#ef4444" /> EXPIRY CONTROL CENTER
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>Monitor drug shelf-life and manage expiring inventory.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ textAlign: 'right', padding: '0 20px', borderRight: '1px solid #e2e8f0' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>CRITICAL (60D)</p>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#ef4444' }}>{stats.critical}</h4>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>PRE-CRITICAL (120D)</p>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#f59e0b' }}>{stats.preCritical}</h4>
                    </div>
                </div>
            </header>

            {/* 2. FILTERS */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#64748b' }} />
                    <input 
                        type="text" 
                        placeholder="Search medicine..." 
                        style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {['All', 'Critical', 'Pre-Critical'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === tab ? '#1e293b' : '#f1f5f9',
                                color: activeTab === tab ? 'white' : '#64748b',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. EXPIRY LIST */}
            <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ overflowY: 'auto', height: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>MEDICINE NAME</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>STOCK</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>EXPIRY DATE</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>TIME LEFT</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>STATUS</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedItems.map((item, idx) => (
                                <motion.tr 
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    style={{ borderBottom: '1px solid #f1f5f9' }}
                                >
                                    <td style={{ padding: '15px 20px' }}>
                                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{item.category}</div>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontWeight: 900, color: '#1e293b' }}>{item.stock} Units</td>
                                    <td style={{ padding: '15px 20px', fontWeight: 700, color: '#64748b' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={14} /> {item.expiry || 'NOT SET'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        {(() => {
                                            const days = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                                            const isCritical = days <= (item.critical_days || 60);
                                            const isPreCritical = days <= 120;
                                            return (
                                                <div style={{ 
                                                    fontWeight: 900, 
                                                    color: isCritical ? '#ef4444' : isPreCritical ? '#f59e0b' : '#059669',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {days <= 0 ? 'EXPIRED' : `${days} Days Left`}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        {(() => {
                                            const days = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
                                            const isCritical = days <= (item.critical_days || 60);
                                            const isPreCritical = days <= 120;
                                            return (
                                                <span style={{ 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 900, 
                                                    padding: '4px 10px', 
                                                    borderRadius: '20px',
                                                    background: isCritical ? '#fee2e2' : isPreCritical ? '#fef3c7' : '#ecfdf5',
                                                    color: isCritical ? '#991b1b' : isPreCritical ? '#92400e' : '#065f46',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}>
                                                    {isCritical ? <AlertTriangle size={12} /> : isPreCritical ? <Clock size={12} /> : <CheckCircle size={12} />}
                                                    {isCritical ? 'CRITICAL' : isPreCritical ? 'PRE-CRITICAL' : 'SAFE'}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                        {isAdmin && (
                                            <button style={{ background: '#fff1f1', border: '1px solid #fee2e2', padding: '8px', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }} title="Remove from Stock">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                    {processedItems.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '100px 0' }}>
                            <CheckCircle size={60} color="#cbd5e1" style={{ marginBottom: '20px' }} />
                            <h3 style={{ color: '#94a3b8', fontWeight: 800 }}>All good! No expiring items found.</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpiryManagement;
