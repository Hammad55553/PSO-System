import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Package,
    AlertCircle,
    ShoppingCart,
    ArrowUpRight,
    Users,
    BarChart3,
    DollarSign,
    CreditCard,
    ChevronRight,
    Search,
    Calendar,
    ClipboardList,
    Trash2
} from 'lucide-react';

const Dashboard = () => {
    const dispatch = useDispatch();
    const { history } = useSelector(state => state.sales);
    const { items } = useSelector(state => state.inventory);
    const { activeShift } = useSelector(state => state.shift);
    const customers = useSelector(state => state.customers.list);
    const user = useSelector(state => state.auth.user);
    const isAdmin = user?.role === 'admin';

    // 1. DATA PROCESSING FOR CHARTS
    const filteredHistory = useMemo(() => 
        isAdmin ? history : history.filter(s => (s.seller_name || s.sellerName) === user?.name || s.seller_id === user?.uid)
    , [history, isAdmin, user]);

    const totalSales = useMemo(() => filteredHistory.reduce((acc, s) => acc + s.total, 0), [filteredHistory]);
    const totalReceivables = useMemo(() => customers.reduce((acc, c) => acc + (c.balance || 0), 0), [customers]);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = useMemo(() => filteredHistory.filter(s => new Date(s.created_at || s.date).toISOString().split('T')[0] === today), [filteredHistory, today]);
    const todayRevenue = useMemo(() => todaySales.reduce((acc, s) => acc + s.total, 0), [todaySales]);

    // Revenue Trend (Last 7 Days)
    const revenueTrend = useMemo(() => {
        const days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return days.map(day => {
            const daySales = filteredHistory.filter(s => new Date(s.created_at || s.date).toISOString().split('T')[0] === day);
            return {
                day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: daySales.reduce((sum, s) => sum + s.total, 0)
            };
        });
    }, [filteredHistory]);

    // Payment Distribution
    const paymentStats = useMemo(() => {
        const stats = { Cash: 0, Credit: 0, Card: 0 };
        filteredHistory.forEach(s => {
            if (stats[s.paymentMethod] !== undefined) stats[s.paymentMethod] += s.total;
            else stats['Cash'] += s.total; // Default/Fallback
        });
        const total = Object.values(stats).reduce((a, b) => a + b, 0) || 1;
        return Object.entries(stats).map(([label, value]) => ({
            label,
            value,
            percent: (value / total) * 100
        }));
    }, [filteredHistory]);

    // Profit Calculation Logic
    const calculateProfit = (salesList) => {
        if (!salesList) return 0;
        return salesList.reduce((acc, sale) => {
            const saleProfit = (sale.items || sale.sale_items || []).reduce((sum, item) => {
                const buyPrice = item.buy_price || item.buyPrice || 0;
                return sum + (((item.price || 0) - buyPrice) * (item.quantity || 0));
            }, 0);
            return acc + (saleProfit - (sale.discount || 0));
        }, 0);
    };

    const totalProfit = isAdmin ? calculateProfit(history) : 0;
    const maxRevenue = Math.max(...revenueTrend.map(d => d.revenue)) || 1000;

    return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '25px', backgroundColor: '#f4f7fa', color: '#1e293b' }}>
            
            {/* 1. TOP PREMIUM HEADER */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}
            >
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-0.8px' }}>
                        Command Terminal <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 800, verticalAlign: 'middle', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', marginLeft: '10px' }}>PRO EDITION</span>
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>
                        Welcome back, <span style={{ color: '#0f172a', fontWeight: 900 }}>{user?.name || 'Administrator'}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: '10px', background: activeShift ? '#10b981' : '#f59e0b', borderRadius: '5px', height: '10px' }}></div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{activeShift ? 'LIVE OPERATIONS' : 'TERMINAL IDLE'}</span>
                    </div>
                </div>
            </motion.header>

            {/* 2. STATS OVERVIEW CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                {[
                    { label: isAdmin ? 'TOTAL CLINIC REVENUE' : 'MY REVENUE', value: `Rs ${totalSales.toLocaleString()}`, color: '#6366f1', icon: <DollarSign size={20} />, sub: isAdmin ? 'Global gross billing' : 'Total cumulative sales' },
                    ...(isAdmin ? [{ label: 'NET CLINIC PROFIT', value: `Rs ${totalProfit.toLocaleString()}`, color: '#059669', icon: <TrendingUp size={20} />, sub: 'After cost & discounts' }] : []),
                    { label: "TODAY'S TURNOVER", value: `Rs ${todayRevenue.toLocaleString()}`, color: '#10b981', icon: <BarChart3 size={20} />, sub: `${todaySales.length} Transactions completed` },
                    ...(isAdmin ? [{ label: 'TOTAL TAX COLLECTED', value: `Rs ${filteredHistory.reduce((s, x) => s + (x.tax || 0), 0).toLocaleString()}`, color: '#06b6d4', icon: <DollarSign size={20} />, sub: 'GST/Tax accumulation' }] : []),
                    { label: 'ACTIVE UDHAAR', value: `Rs ${totalReceivables.toLocaleString()}`, color: '#f59e0b', icon: <Users size={20} />, sub: 'Outstanding patient balance' },
                    { label: 'INVENTORY HEALTH', value: `${items.length} SKUs`, color: '#ec4899', icon: <Package size={20} />, sub: `${items.filter(i => i.stock < 10).length} Items low stock` }
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -5 }}
                        style={{ background: 'white', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', position: 'relative', overflow: 'hidden' }}
                    >
                        <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, color: stat.color }}>{stat.icon}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ background: `${stat.color}15`, padding: '8px', borderRadius: '10px' }}>{React.cloneElement(stat.icon, { color: stat.color, size: 18 })}</div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</span>
                        </div>
                        <h3 style={{ fontSize: '1.65rem', fontWeight: 950, color: '#0f172a' }}>{stat.value}</h3>
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '5px', fontWeight: 700 }}>{stat.sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* 3. CHARTING SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '25px', marginBottom: '30px' }}>
                
                {/* REVENUE BAR CHART */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ background: 'white', borderRadius: '24px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', position: 'relative' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                        <div>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingUp size={20} color="#6366f1" /> Revenue Volatility Trend
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Interactive performance monitoring for last 7 days</p>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '8px 15px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 900, color: '#6366f1', border: '1px solid #e2e8f0' }}>7-DAY PULSE</div>
                    </div>

                    <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '20px', paddingBottom: '30px', position: 'relative' }}>
                        {/* Grid Lines */}
                        {[0, 1, 2, 3].map((_, i) => (
                            <div key={i} style={{ position: 'absolute', bottom: `${(i + 1) * 25}%`, left: 0, right: 0, borderTop: '1px dashed #f1f5f9', zIndex: 0 }}></div>
                        ))}

                        {revenueTrend.map((data, i) => {
                            const isToday = i === 6;
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '15px', position: 'relative', zIndex: 1 }}>
                                    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', height: '100%', alignItems: 'flex-end' }}>
                                        <motion.div 
                                            initial={{ height: 0 }}
                                            animate={{ height: `${(data.revenue / maxRevenue) * 100}%` }}
                                            transition={{ duration: 1, delay: i * 0.1, ease: "circOut" }}
                                            whileHover={{ scaleX: 1.1, filter: 'brightness(1.1)' }}
                                            style={{ 
                                                width: '65%', 
                                                maxWidth: '50px',
                                                background: isToday 
                                                    ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' 
                                                    : 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)', 
                                                borderRadius: '10px 10px 6px 6px',
                                                boxShadow: isToday 
                                                    ? '0 10px 15px -3px rgba(16, 185, 129, 0.3)' 
                                                    : '0 10px 15px -3px rgba(99, 102, 241, 0.2)',
                                                position: 'relative',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {/* Tooltip on Hover */}
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                whileHover={{ opacity: 1, y: -5 }}
                                                style={{ 
                                                    position: 'absolute', 
                                                    top: '-45px', 
                                                    left: '50%', 
                                                    transform: 'translateX(-50%)', 
                                                    background: '#1e293b', 
                                                    color: 'white', 
                                                    padding: '6px 12px', 
                                                    borderRadius: '8px', 
                                                    fontSize: '0.75rem', 
                                                    fontWeight: 900,
                                                    whiteSpace: 'nowrap',
                                                    pointerEvents: 'none',
                                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                                                    zIndex: 10
                                                }}
                                            >
                                                Rs {data.revenue.toLocaleString()}
                                                <div style={{ position: 'absolute', bottom: '-4px', left: '50%', width: '8px', height: '8px', background: '#1e293b', transform: 'translateX(-50%) rotate(45deg)' }}></div>
                                            </motion.div>

                                            {/* Glow effect for today */}
                                            {isToday && (
                                                <div style={{ position: 'absolute', inset: 0, background: 'inherit', borderRadius: 'inherit', filter: 'blur(10px)', opacity: 0.4, zIndex: -1 }}></div>
                                            )}
                                        </motion.div>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: isToday ? '#10b981' : '#64748b', textTransform: 'uppercase' }}>{data.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* PAYMENT DISTRIBUTION DONUT */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ background: 'white', borderRadius: '24px', padding: '30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
                >
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginBottom: '5px' }}>Settlement Distribution</h4>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '30px' }}>Breakdown of transaction channels</p>

                    <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 30px' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                            {paymentStats.map((stat, i) => {
                                let offset = 0;
                                for(let j=0; j<i; j++) offset += paymentStats[j].percent;
                                return (
                                    <motion.circle
                                        key={i}
                                        cx="50" cy="50" r="40"
                                        fill="transparent"
                                        stroke={stat.label === 'Cash' ? '#10b981' : stat.label === 'Credit' ? '#f59e0b' : '#6366f1'}
                                        strokeWidth="10"
                                        strokeDasharray={`${stat.percent} 100`}
                                        strokeDashoffset={-offset}
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                    />
                                );
                            })}
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 950, color: '#1e293b' }}>{filteredHistory.length}</span>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>TOTAL TX</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {paymentStats.map((stat, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stat.label === 'Cash' ? '#10b981' : stat.label === 'Credit' ? '#f59e0b' : '#6366f1' }}></div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{stat.label} Settlement</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#64748b' }}>{stat.percent.toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* 4. MODULAR FEED SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '25px' }}>
                
                {/* RECENT SETTLEMENTS */}
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h5 style={{ fontWeight: 950, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ClipboardList size={20} color="#6366f1" /> RECENT SETTLEMENTS
                        </h5>
                        <button style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            VIEW ALL <ChevronRight size={14} />
                        </button>
                    </div>
                    <div style={{ padding: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <tbody>
                                {filteredHistory.slice(0, 6).map((sale, i) => (
                                    <motion.tr 
                                        key={sale.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        style={{ background: '#fcfdfe' }}
                                    >
                                        <td style={{ padding: '15px', borderRadius: '12px 0 0 12px', fontWeight: 800, fontSize: '0.85rem', color: '#6366f1' }}>#{sale.id}</td>
                                        <td style={{ padding: '15px' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{sale.customer_name || 'Walking Patient'}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={10} />
                                                {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', color: '#475569' }}>
                                                {sale.payment_method.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'right', borderRadius: '0 12px 12px 0', fontWeight: 950, fontSize: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' }}>
                                                Rs {sale.total.toLocaleString()}
                                                {isAdmin && (
                                                    <button 
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Delete this transaction permanently?')) {
                                                                const { deleteSale } = await import('../store/slices/salesSlice');
                                                                
                                                                dispatch(deleteSale(sale.id));
                                                                if (navigator.onLine) {
                                                                    try {
                                                                        await supabase.from('sales').delete().eq('id', sale.id);
                                                                        toast.success('Transaction Purged');
                                                                    } catch (err) { console.error(err); }
                                                                }
                                                            }
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'none'}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ALERTS & INVENTORY PULSE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ background: '#fff1f1', borderRadius: '24px', padding: '25px', border: '1px solid #fee2e2' }}>
                        <h5 style={{ color: '#991b1b', fontWeight: 950, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <AlertCircle size={20} /> DEPLETION ALERTS
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {items.filter(i => i.stock <= 10).slice(0, 4).map((item, i) => (
                                <div key={i} style={{ background: 'white', padding: '12px 15px', borderRadius: '14px', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b' }}>{item.name}</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 950, color: '#ef4444' }}>{item.stock}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: '#1e293b', borderRadius: '24px', padding: '25px', color: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                            <div style={{ background: 'rgba(56, 189, 248, 0.2)', padding: '10px', borderRadius: '12px' }}><Package size={22} color="#38bdf8" /></div>
                            <div>
                                <h6 style={{ fontWeight: 950, fontSize: '0.9rem', letterSpacing: '0.5px' }}>PLATFORM NODE</h6>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800 }}>BILAL VET MEDICAL RMS v2.4</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ opacity: 0.6 }}>Active SKUs</span>
                                <span style={{ fontWeight: 800 }}>{items.length} Registered</span>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ opacity: 0.6 }}>System Uptime</span>
                                <span style={{ fontWeight: 800, color: '#10b981' }}>99.9% ONLINE</span>
                             </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;

