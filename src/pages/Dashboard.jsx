import React from 'react';
import { useSelector } from 'react-redux';
import {
    TrendingUp,
    Package,
    AlertCircle,
    ShoppingCart,
    ArrowUpRight,
    ArrowDownRight,
    ClipboardList,
    Wallet,
    Users,
    Box,
    BarChart3
} from 'lucide-react';

const Dashboard = () => {
    const { history } = useSelector(state => state.sales);
    const { items } = useSelector(state => state.inventory);
    const { activeShift } = useSelector(state => state.shift);
    const customers = useSelector(state => state.customers.list);

    // Advanced Metrics
    const totalSales = history.reduce((acc, sale) => acc + sale.total, 0);
    const totalReceivables = customers.reduce((acc, c) => acc + c.balance, 0);
    const lowStockItems = items.filter(item => item.stock <= 10);
    const recentSales = history.slice(0, 5);

    // Today's Stats
    const today = new Date().toLocaleDateString();
    const todaySales = history.filter(s => new Date(s.date).toLocaleDateString() === today);
    const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);

    // Top Selling Products Calculation
    const productSalesCount = {};
    history.forEach(sale => {
        sale.items.forEach(item => {
            productSalesCount[item.name] = (productSalesCount[item.name] || 0) + item.quantity;
        });
    });
    const topProducts = Object.entries(productSalesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    return (
        <div style={{ height: '100%', overflowY: 'auto', paddingBottom: '40px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Management Dashboard</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Daily operations summary and financial health indicators.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ background: 'white', padding: '8px 15px', borderRadius: '4px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeShift ? 'var(--accent-green)' : 'var(--accent-red)' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{activeShift ? 'Terminal #01 Active' : 'Terminal Locked'}</span>
                    </div>
                </div>
            </header>

            {/* Primary KPI Grid (Candela Style) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '25px' }}>

                <div style={{ background: 'white', padding: '20px', borderRadius: '4px', border: '1px solid var(--border)', borderTop: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>GROSS REVENUE (ALL TIME)</span>
                        <TrendingUp size={16} color="var(--primary)" />
                    </div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Rs {totalSales.toLocaleString()}</h3>
                    <p style={{ fontSize: '0.7rem', marginTop: '5px', color: 'var(--accent-green)', fontWeight: 700 }}>Total Invoiced Volume</p>
                </div>

                <div style={{ background: 'white', padding: '20px', borderRadius: '4px', border: '1px solid var(--border)', borderTop: '4px solid #f97316' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>TOTAL RECEIVABLES (KHATTA)</span>
                        <Users size={16} color="#f97316" />
                    </div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f97316' }}>Rs {totalReceivables.toLocaleString()}</h3>
                    <p style={{ fontSize: '0.7rem', marginTop: '5px', color: 'var(--text-muted)', fontWeight: 700 }}>Pending Payments from Clients</p>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '4px', border: '1px solid var(--border)', borderTop: '4px solid var(--accent-green)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>TODAY'S SALES</span>
                        <BarChart3 size={16} color="var(--accent-green)" />
                    </div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-green)' }}>Rs {todayRevenue.toLocaleString()}</h3>
                    <p style={{ fontSize: '0.7rem', marginTop: '5px', color: 'var(--text-muted)', fontWeight: 700 }}>{todaySales.length} Transactions Created Today</p>
                </div>

                <div style={{ background: activeShift ? '#ecfdf5' : '#fff1f1', padding: '20px', borderRadius: '4px', border: '1px solid var(--border)', borderTop: activeShift ? '4px solid var(--accent-green)' : '4px solid var(--accent-red)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>CASH IN HAND (SHIFT)</span>
                        <Wallet size={16} color={activeShift ? 'var(--accent-green)' : 'var(--accent-red)'} />
                    </div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Rs {(activeShift?.openingCash + activeShift?.sales - activeShift?.expenses || 0).toLocaleString()}</h3>
                    <p style={{ fontSize: '0.7rem', marginTop: '5px', color: 'var(--text-muted)', fontWeight: 700 }}>Net Cash in Active Drawer</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '20px' }}>

                {/* Left Side: Recent Activity & Top Selling */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Recent Invoices */}
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', background: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Recent Terminal Invoices</span>
                            <a href="/history" style={{ fontSize: '0.7rem', color: 'var(--primary)', textDecoration: 'none' }}>View Full History →</a>
                        </div>
                        <table className="erp-table">
                            <thead>
                                <tr>
                                    <th>Inv #</th>
                                    <th>Customer</th>
                                    <th>Method</th>
                                    <th>Value</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentSales.map(sale => (
                                    <tr key={sale.id}>
                                        <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.75rem' }}>{sale.id}</td>
                                        <td style={{ fontSize: '0.8rem' }}>{sale.customerName}</td>
                                        <td><span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{sale.paymentMethod}</span></td>
                                        <td style={{ fontWeight: 800, fontSize: '0.85rem' }}>Rs {sale.total.toLocaleString()}</td>
                                        <td><span className={`badge ${sale.status === 'Paid' ? 'badge-green' : 'badge-red'}`}>{sale.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Today's Fast Moving Items */}
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', background: '#f8fafc' }}>Top Selling Products (Quantity Based)</div>
                        <div style={{ padding: '15px' }}>
                            {topProducts.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No sales recorded yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {topProducts.map(([name, qty], index) => (
                                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <span style={{ width: '20px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>#{index + 1}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{name}</span>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{qty} Units</span>
                                                </div>
                                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                                                    <div style={{ height: '100%', background: 'var(--primary)', borderRadius: '3px', width: `${(qty / topProducts[0][1]) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Alerts & Stock Watch */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Reorder Alerts */}
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', background: '#fff1f1', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={16} />
                            Critical Stock Watchlist
                        </div>
                        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {lowStockItems.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>All products are sufficiently stocked.</p>
                            ) : (
                                lowStockItems.map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #fee2e2', background: '#fffcfc', borderRadius: '4px' }}>
                                        <div style={{ maxWidth: '140px' }}>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.category}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent-red)' }}>{item.stock}</span>
                                            <p style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>LEFT</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* System Info */}
                    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '4px', padding: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ width: '35px', height: '35px', background: 'var(--primary)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <Box size={20} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 800 }}>VET SMART ERP</p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Version 1.0.4 r2</p>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Database Index:</span>
                                <span style={{ color: '#0ea5e9', fontWeight: 900 }}>ENTERPRISE_CLOUD_V2</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span>Active Node:</span>
                                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>BILAL-VET-HQ-01</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
