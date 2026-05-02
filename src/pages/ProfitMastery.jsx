import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    Calendar,
    ArrowUpRight,
    Search,
    ShoppingBag,
    Briefcase,
    Zap,
    ChevronRight,
    CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabase';

const ProfitMastery = () => {
    const navigate = useNavigate();
    
    // Pulse Animation Styles
    const pulseKeyframes = `
        @keyframes pulse-wave {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.8); }
            70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
    `;

    const { history } = useSelector(state => state.sales);
    const { user } = useSelector(state => state.auth);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    const [selectedProduct, setSelectedProduct] = useState(null);

    if (user?.role !== 'admin') {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ color: '#ef4444', fontWeight: 900 }}>ACCESS DENIED</h2>
                    <p style={{ color: '#64748b' }}>This high-level financial data is only available to Administrators.</p>
                </div>
            </div>
        );
    }

    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch Sales for Selected Date
    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            try {
                // Fetch for the entire day using a more flexible range
                const { data, error } = await supabase
                    .from('sales')
                    .select('*, sale_items(*)')
                    .gte('created_at', `${dateFilter}T00:00:00`)
                    .lte('created_at', `${dateFilter}T23:59:59`)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setSales(data || []);
            } catch (err) {
                console.error("Profit Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSales();
    }, [dateFilter]);

    const filteredSales = sales;

    const totalRevenue = filteredSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    
    // Detailed Profit Calculation
    const productProfitStats = {};
    let totalNetProfit = 0;
    let totalCost = 0;

    filteredSales.forEach(sale => {
        let saleProfit = 0;
        const items = sale.sale_items || sale.items || [];
        items.forEach(item => {
            const buyPrice = item.buy_price || item.buyPrice || 0;
            const profitPerUnit = (item.price || 0) - buyPrice;
            const itemTotalProfit = profitPerUnit * (item.quantity || 0);
            
            saleProfit += itemTotalProfit;
            totalCost += (buyPrice * (item.quantity || 0));

            if (!productProfitStats[item.name]) {
                productProfitStats[item.name] = {
                    name: item.name,
                    profit: 0,
                    qty: 0,
                    buyPrice: buyPrice,
                    salePrice: item.price,
                    category: item.category,
                    sales: []
                };
            }
            productProfitStats[item.name].profit += itemTotalProfit;
            productProfitStats[item.name].qty += (item.quantity || 0);
            productProfitStats[item.name].sales.push({
                billId: sale.id,
                qty: item.quantity,
                customer: sale.customer_name || sale.customerName,
                total: (item.price * item.quantity)
            });
        });
        totalNetProfit += (saleProfit - (sale.discount || 0));
    });

    const profitMargin = totalRevenue ? ((totalNetProfit / totalRevenue) * 100).toFixed(1) : 0;
    const topProfitableProducts = Object.values(productProfitStats)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 15);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '30px', background: '#f8fafc', padding: '20px', overflowY: 'auto' }}>
            <style>{pulseKeyframes}</style>
            
            {/* PRODUCT DETAIL MODAL */}
            {selectedProduct && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ background: '#0f172a', padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 900 }}>{selectedProduct.name}</h3>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Category: {selectedProduct.category}</span>
                                    <button 
                                        onClick={() => navigate(`/insights/${selectedProduct.name}`)} 
                                        style={{ 
                                            background: '#10b981', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '4px 12px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.7rem', 
                                            fontWeight: 900, 
                                            cursor: 'pointer',
                                            animation: 'pulse-wave 0.8s infinite',
                                            transition: 'all 0.1s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                        onMouseOver={e => {
                                            e.currentTarget.style.background = '#059669';
                                            e.currentTarget.style.transform = 'scale(1.05)';
                                        }}
                                        onMouseOut={e => {
                                            e.currentTarget.style.background = '#10b981';
                                            e.currentTarget.style.transform = 'scale(1)';
                                        }}
                                    >
                                        DEEP DIVE <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProduct(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '30px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', display: 'block' }}>TOTAL SOLD</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 950 }}>{selectedProduct.qty} Units</span>
                                </div>
                                <div style={{ background: '#ecfdf5', padding: '15px', borderRadius: '12px', border: '1px solid #10b981' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', display: 'block' }}>TOTAL PROFIT</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 950, color: '#064e3b' }}>Rs {selectedProduct.profit.toLocaleString()}</span>
                                </div>
                                <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '12px', border: '1px solid #0ea5e9' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#0ea5e9', display: 'block' }}>PROFIT / UNIT</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0c4a6e' }}>Rs {selectedProduct.salePrice - selectedProduct.buyPrice}</span>
                                </div>
                            </div>

                            <h4 style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Briefcase size={16} color="#0f172a" /> Today's Sales History
                            </h4>
                            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                <table className="erp-table">
                                    <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ fontSize: '0.7rem' }}>BILL ID</th>
                                            <th style={{ fontSize: '0.7rem' }}>CLIENT</th>
                                            <th style={{ fontSize: '0.7rem', textAlign: 'right' }}>QTY</th>
                                            <th style={{ fontSize: '0.7rem', textAlign: 'right' }}>TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(selectedProduct.sales || []).map((s, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 800, fontSize: '0.75rem' }}>#{s.billId}</td>
                                                <td style={{ fontSize: '0.75rem' }}>{s.customer}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.75rem' }}>{s.qty}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.75rem' }}>Rs {s.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '30px', borderRadius: '24px', color: 'white', boxShadow: '0 15px 30px -10px rgba(15, 23, 42, 0.3)' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Zap size={32} color="#34d399" /> Profit Mastery Analytics
                    </h2>
                    <p style={{ color: '#94a3b8', fontWeight: 600, marginTop: '5px' }}>Deep-dive into your margins and product-level profitability.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                     <div style={{ position: 'relative' }}>
                        <Calendar size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: '#34d399' }} />
                        <input
                            type="date"
                            className="erp-input"
                            style={{ paddingLeft: '45px', fontWeight: 800, border: 'none', borderRadius: '12px', height: '48px', width: '220px', background: 'rgba(255,255,255,0.1)', color: 'white' }}
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* TOP STATS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px' }}>
                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b' }}>GROSS REVENUE</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#0f172a', margin: '10px 0' }}>Rs {totalRevenue.toLocaleString()}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '0.8rem', fontWeight: 800 }}>
                        <TrendingUp size={14} /> Total Value Sold
                    </div>
                </div>

                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b' }}>TOTAL COST (CP)</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#ef4444', margin: '10px 0' }}>Rs {totalCost.toLocaleString()}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>Inventory investment</p>
                </div>

                <div style={{ background: '#ecfdf5', padding: '30px', borderRadius: '24px', border: '1px solid #34d399' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#047857' }}>NET PROFIT</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#064e3b', margin: '10px 0' }}>Rs {totalNetProfit.toLocaleString()}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669', fontSize: '0.8rem', fontWeight: 800 }}>
                        <CheckCircle2 size={14} /> After Discounts
                    </div>
                </div>

                <div style={{ background: '#064e3b', padding: '30px', borderRadius: '24px', color: 'white' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#a7f3d0' }}>PROFIT MARGIN</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 950, margin: '10px 0' }}>{profitMargin}%</h3>
                    <p style={{ fontSize: '0.8rem', color: '#a7f3d0', fontWeight: 700 }}>Efficiency of sales</p>
                </div>
            </div>

            {/* MAIN ANALYSIS CONTENT */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '30px' }}>
                
                 {/* PRODUCT-WISE PROFIT TABLE */}
                 <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '400px' }}>
                     <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                         <h4 style={{ fontSize: '1.1rem', fontWeight: 950 }}>Unit-Level Profitability</h4>
                         {loading && <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 800 }}>SYNCING DATA...</div>}
                     </div>
                     <table className="erp-table">
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '20px' }}>PRODUCT NAME</th>
                                <th style={{ textAlign: 'right' }}>UNITS SOLD</th>
                                <th style={{ textAlign: 'right' }}>TOTAL PROFIT</th>
                                <th style={{ textAlign: 'center' }}>HEALTH</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProfitableProducts.map((p, idx) => (
                                <tr key={idx} onClick={() => setSelectedProduct(p)} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '18px 20px', fontWeight: 800 }}>{p.name}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.qty}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 950, color: '#059669' }}>Rs {p.profit.toLocaleString()}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ padding: '5px 10px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', fontSize: '0.7rem', fontWeight: 900, display: 'inline-block' }}>GOOD</div>
                                    </td>
                                </tr>
                            ))}
                            {topProfitableProducts.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: '#94a3b8', fontStyle: 'italic' }}>No sales data available for this date.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* VISUAL MARGIN INDICATOR */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: 950, marginBottom: '30px', width: '100%' }}>Margin Breakdown</h4>
                    <div style={{ 
                        width: '240px', 
                        height: '240px', 
                        borderRadius: '50%', 
                        background: `conic-gradient(
                            #059669 0% ${profitMargin}%, 
                            #ef4444 ${profitMargin}% ${((totalCost / (totalRevenue || 1)) * 100) + parseFloat(profitMargin)}%, 
                            #f8fafc 0% 100%
                        )`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ width: '150px', height: '150px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 950, color: '#0f172a' }}>{profitMargin}%</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>NET MARGIN</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '15px', height: '15px', background: '#059669', borderRadius: '4px' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Profitable Growth</span>
                            </div>
                            <span style={{ fontWeight: 900 }}>Rs {totalNetProfit.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '15px', height: '15px', background: '#ef4444', borderRadius: '4px' }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>Stock Cost</span>
                            </div>
                            <span style={{ fontWeight: 900 }}>Rs {totalCost.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', width: '100%', textAlign: 'center' }}>
                         <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, lineHeight: '1.4' }}>
                            "To build a sustainable clinic, focus on products with over 20% margin."
                         </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProfitMastery;
