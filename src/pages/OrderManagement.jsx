import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Truck, 
    Calendar, 
    Plus, 
    Search, 
    CheckCircle2, 
    Clock, 
    X, 
    MoreHorizontal, 
    ChevronRight,
    Package,
    ArrowRight,
    RefreshCw,
    Layers,
    Trash2,
    Edit3,
    ArrowUpCircle,
    ArrowDownCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const OrderManagement = () => {
    const dispatch = useDispatch();
    const orders = useSelector(state => state.orders.list);
    const inventory = useSelector(state => state.inventory.items);
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [processingOrderId, setProcessingOrderId] = useState(null);

    const [formData, setFormData] = useState({
        supplier: '',
        contact: '',
        type: 'Incoming', // New: Incoming or Outgoing
        items: [{ name: '', qty: '', price: '' }],
        bookingDate: new Date().toISOString().split('T')[0],
        deliveryDate: '',
        notes: ''
    });

    const [editingOrder, setEditingOrder] = useState(null);

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { name: '', qty: '', price: '' }] });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (editingOrder) {
            const updated = { ...formData, id: editingOrder.id, status: editingOrder.status };
            try {
                const { error } = await supabase
                    .from('orders')
                    .update(updated)
                    .eq('id', updated.id);
                
                if (error) throw error;
                toast.success('Order Booking Updated in Supabase!');
            } catch (err) {
                toast.error('Update failed');
            }
        } else {
            const newOrder = {
                ...formData,
                status: 'Pending'
            };
            try {
                const { error } = await supabase
                    .from('orders')
                    .insert([newOrder]);
                
                if (error) throw error;
                toast.success('Order booked in Supabase successfully!');
            } catch (err) {
                toast.error('Booking failed');
            }
        }

        setIsModalOpen(false);
        setEditingOrder(null);
        setFormData({ supplier: '', contact: '', type: 'Incoming', items: [{ name: '', qty: '', price: '' }], bookingDate: new Date().toISOString().split('T')[0], deliveryDate: '', notes: '' });
    };

    const handleDeleteOrder = async (id) => {
        if (!window.confirm('Move this order record to Trash?')) return;
        try {
            // Soft Delete
            const { error } = await supabase
                .from('orders')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);
            
            if (error) throw error;
            toast.success("Order record moved to Trash");
        } catch (err) {
            toast.error('Action failed');
        }
    };

    const openEditOrder = (order) => {
        setEditingOrder(order);
        setFormData({
            supplier: order.supplier,
            contact: order.contact || '',
            type: order.type || 'Incoming',
            items: order.items,
            bookingDate: order.bookingDate,
            deliveryDate: order.deliveryDate || '',
            notes: order.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleMarkReceived = async (order, pushToStock = true) => {
        if (processingOrderId) return;
        if (!window.confirm(pushToStock ? 'Complete delivery and ADD items to stock?' : 'Mark as Delivered/Completed WITHOUT changing inventory?')) return;

        setProcessingOrderId(order.id);
        
        try {
            // 1. Update Order Status
            const { error: orderError } = await supabase
                .from('orders')
                .update({ status: 'Received' })
                .eq('id', order.id);

            if (orderError) throw orderError;

            // 2. Add/Deduct Inventory (Optional)
            if (pushToStock) {
                for (const item of order.items) {
                    const existing = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
                    if (existing) {
                        const currentStock = parseFloat(existing.stock || 0);
                        const incomingQty = parseFloat(item.qty || 0);
                        
                        let updatedInv;
                        if (order.type === 'Outgoing') {
                            updatedInv = {
                                stock: currentStock - incomingQty
                            };
                        } else {
                            const currentBuyPrice = parseFloat(existing.buy_price || 0);
                            const incomingBuyPrice = parseFloat(item.price || existing.buy_price);
                            const totalStock = currentStock + incomingQty;
                            const averageBuyPrice = ((currentStock * currentBuyPrice) + (incomingQty * incomingBuyPrice)) / totalStock;

                            updatedInv = {
                                stock: totalStock,
                                buy_price: parseFloat(averageBuyPrice.toFixed(2))
                            };
                        }

                        const { error: invError } = await supabase
                            .from('inventory')
                            .update(updatedInv)
                            .eq('id', existing.id);
                        
                        if (invError) throw invError;
                    }
                }
            }

            const msg = order.type === 'Outgoing' ? 'Supply Delivered & Stock Deducted!' : 'Order Received & Stock Merged!';
            toast.success(pushToStock ? msg : `Order Marked as Completed.`);
        } catch (err) {
            toast.error("Process failed.");
            console.error(err);
        } finally {
            setProcessingOrderId(null);
        }
    };

    const filteredOrders = orders.filter(o => 
        (o.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || o.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))) &&
        (activeTab === 'All' || o.status === activeTab)
    );

    return (
        <div style={{ 
            height: '100%', 
            overflowY: 'auto', 
            padding: window.innerWidth <= 480 ? '15px' : '25px', 
            backgroundColor: '#f8fafc',
            boxSizing: 'border-box'
        }}>
            
            {/* 1. PREMIUM HEADER */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    justifyContent: 'space-between', 
                    alignItems: window.innerWidth <= 768 ? 'stretch' : 'center', 
                    marginBottom: '30px',
                    gap: '20px'
                }}
            >
                <div>
                    <h2 style={{ 
                        fontSize: window.innerWidth <= 480 ? '1.4rem' : '1.8rem', 
                        fontWeight: 950, 
                        color: '#0f172a', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px' 
                    }}>
                        <div style={{ background: '#6366f1', padding: '10px', borderRadius: '12px', color: 'white' }}><Truck size={window.innerWidth <= 480 ? 20 : 24} /></div>
                        Supply Order Hub
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: '8px' }}>Manage supplier bookings and inventory restocking.</p>
                </div>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 600 ? 'column' : 'row',
                    gap: '12px',
                    alignItems: 'stretch'
                }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <input 
                            placeholder="Find company or drug..." 
                            style={{ 
                                padding: '12px 12px 12px 40px', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '12px', 
                                width: '100%', 
                                fontSize: '0.85rem', 
                                fontWeight: 600, 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                outline: 'none'
                            }} 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        style={{ 
                            background: '#6366f1', 
                            color: 'white', 
                            border: 'none', 
                            padding: '12px 20px', 
                            borderRadius: '12px', 
                            fontWeight: 800, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px', 
                            cursor: 'pointer', 
                            boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
                            fontSize: '0.85rem'
                        }}
                    >
                        <Plus size={18} /> NEW ORDER
                    </button>
                </div>
            </motion.header>

            {/* 2. TAB NAVIGATION */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '25px', 
                overflowX: 'auto', 
                paddingBottom: '5px',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                {['All', 'Pending', 'Received'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{ 
                            padding: '8px 16px', 
                            borderRadius: '10px', 
                            border: 'none', 
                            fontWeight: 800, 
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            backgroundColor: activeTab === tab ? '#1e293b' : 'white',
                            color: activeTab === tab ? 'white' : '#64748b',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab} Orders
                    </button>
                ))}
            </div>

            {/* 3. ORDERS GRID */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: window.innerWidth <= 640 ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', 
                gap: '20px' 
            }}>
                <AnimatePresence mode="popLayout">
                    {filteredOrders.map((order, idx) => (
                        <motion.div 
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.05 }}
                            style={{ 
                                background: 'white', 
                                borderRadius: '20px', 
                                padding: window.innerWidth <= 480 ? '20px' : '25px', 
                                border: '1px solid #e2e8f0', 
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', 
                                position: 'relative' 
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>{order.id}</span>
                                        {order.type === 'Outgoing' ? <ArrowUpCircle size={12} color="#6366f1" /> : <ArrowDownCircle size={12} color="#10b981" />}
                                    </div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 950, color: '#0f172a', marginTop: '4px', lineHeight: 1.2 }}>{order.supplier}</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button 
                                            onClick={() => openEditOrder(order)} 
                                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteOrder(order.id)} 
                                            style={{ background: '#fff1f1', border: '1px solid #fee2e2', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <span style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '0.6rem', 
                                        fontWeight: 900,
                                        backgroundColor: order.status === 'Received' ? '#ecfdf5' : '#fff7ed',
                                        color: order.status === 'Received' ? '#059669' : '#c2410c',
                                        border: `1px solid ${order.status === 'Received' ? '#bbf7d0' : '#ffedd5'}`,
                                        letterSpacing: '0.5px'
                                    }}>
                                        {order.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>BOOKING</p>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>{order.bookingDate}</p>
                                </div>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 800 }}>{order.type === 'Outgoing' ? 'DELIVERY' : 'EXPECTED'}</p>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>{order.deliveryDate || 'N/A'}</p>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8', marginBottom: '10px', letterSpacing: '0.5px' }}>{order.type === 'Outgoing' ? 'SUPPLY ITEMS:' : 'ORDERED ITEMS:'}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {order.items.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{item.name}</span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 950, color: '#6366f1' }}>{item.qty} <span style={{ fontSize: '0.65rem' }}>PCS</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {order.status === 'Pending' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button 
                                        disabled={processingOrderId === order.id}
                                        onClick={() => handleMarkReceived(order, true)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '14px', 
                                            background: processingOrderId === order.id ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '12px', 
                                            fontWeight: 900, 
                                            fontSize: '0.85rem', 
                                            cursor: processingOrderId === order.id ? 'not-allowed' : 'pointer', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '10px',
                                            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                                        }}
                                    >
                                        {processingOrderId === order.id ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                        {order.type === 'Outgoing' ? 'DELIVER & DEDUCT STOCK' : 'RECEIVE & MERGE STOCK'}
                                    </button>
                                    <button 
                                        disabled={processingOrderId === order.id}
                                        onClick={() => handleMarkReceived(order, false)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '12px', 
                                            background: 'white', 
                                            color: '#64748b', 
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '12px', 
                                            fontWeight: 800, 
                                            fontSize: '0.75rem', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        MARK COMPLETED ONLY
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* 4. BOOKING MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div style={{ 
                        position: 'fixed', 
                        inset: 0, 
                        background: 'rgba(15, 23, 42, 0.7)', 
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000, 
                        display: 'flex', 
                        alignItems: window.innerWidth <= 600 ? 'flex-end' : 'center', 
                        justifyContent: 'center', 
                        padding: window.innerWidth <= 600 ? '0' : '20px' 
                    }}>
                        <motion.div 
                            initial={window.innerWidth <= 600 ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            animate={{ y: 0, scale: 1, opacity: 1 }}
                            exit={window.innerWidth <= 600 ? { y: '100%' } : { scale: 0.9, opacity: 0 }}
                            style={{ 
                                background: 'white', 
                                width: '100%', 
                                maxWidth: '600px', 
                                borderRadius: window.innerWidth <= 600 ? '24px 24px 0 0' : '24px', 
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div style={{ background: '#6366f1', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 950 }}>Create Supply Booking</h3>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', borderRadius: '8px' }}><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '25px', maxHeight: '80vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>ORDER TYPE</label>
                                        <select style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '5px', fontWeight: 700, background: '#f8fafc', outline: 'none' }} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                            <option value="Incoming">Incoming (Restock)</option>
                                            <option value="Outgoing">Outgoing (Supply)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>PARTY / CLIENT</label>
                                        <input required style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '5px', fontWeight: 700, outline: 'none' }} value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} placeholder="Name" />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>CONTACT (OPTIONAL)</label>
                                        <input style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '5px', fontWeight: 700, outline: 'none' }} value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} placeholder="Phone" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>DELIVERY DATE</label>
                                        <input type="date" style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '5px', fontWeight: 700, outline: 'none' }} value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>ORDERED ITEMS</label>
                                        <button type="button" onClick={handleAddItem} style={{ fontSize: '0.7rem', fontWeight: 900, color: '#6366f1', background: '#eef2ff', padding: '5px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ ADD ITEM</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {formData.items.map((item, idx) => (
                                            <div key={idx} style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '2fr 1fr 1fr', 
                                                gap: '10px',
                                                padding: '15px',
                                                background: '#f8fafc',
                                                borderRadius: '12px',
                                                border: '1px solid #f1f5f9'
                                            }}>
                                                <input placeholder="Drug Name" required style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, outline: 'none' }} value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} />
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <input placeholder="Qty" type="number" required style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, outline: 'none' }} value={item.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                                                    <input placeholder="Price" type="number" style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, outline: 'none' }} value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" style={{ width: '100%', padding: '16px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', marginTop: '10px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
                                    CONFIRM BOOKING
                                </button>
                                {window.innerWidth <= 600 && <div style={{ height: '20px' }} />}
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default OrderManagement;
