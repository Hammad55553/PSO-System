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
        if (!window.confirm('Delete this order record permanently?')) return;
        try {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            toast.success("Order record deleted from Supabase");
        } catch (err) {
            toast.error('Delete failed');
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
        <div style={{ height: '100%', overflowY: 'auto', padding: '25px', backgroundColor: '#f8fafc' }}>
            
            {/* 1. PREMIUM HEADER */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}
            >
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: '#6366f1', padding: '10px', borderRadius: '12px', color: 'white' }}><Truck size={24} /></div>
                        Supply Order Hub
                    </h2>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600, marginTop: '8px' }}>Manage supplier bookings and automate inventory restocking.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                        <input 
                            placeholder="Find company or drug..." 
                            style={{ padding: '12px 12px 12px 40px', border: '1px solid #e2e8f0', borderRadius: '12px', width: '300px', fontSize: '0.9rem', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        style={{ background: '#6366f1', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)' }}
                    >
                        <Plus size={20} /> BOOK NEW ORDER
                    </button>
                </div>
            </motion.header>

            {/* 2. TAB NAVIGATION */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                {['All', 'Pending', 'Received'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{ 
                            padding: '10px 20px', 
                            borderRadius: '10px', 
                            border: 'none', 
                            fontWeight: 800, 
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            backgroundColor: activeTab === tab ? '#1e293b' : 'white',
                            color: activeTab === tab ? 'white' : '#64748b',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        {tab} Orders
                    </button>
                ))}
            </div>

            {/* 3. ORDERS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
                <AnimatePresence>
                    {filteredOrders.map((order, idx) => (
                        <motion.div 
                            key={order.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: idx * 0.05 }}
                            style={{ background: 'white', borderRadius: '20px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', position: 'relative' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>{order.id}</span>
                                        {order.type === 'Outgoing' ? <ArrowUpCircle size={14} color="#6366f1" /> : <ArrowDownCircle size={14} color="#10b981" />}
                                    </div>
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#0f172a', marginTop: '4px' }}>{order.supplier}</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => openEditOrder(order)} 
                                            title="Edit Booking"
                                            style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4f46e5', padding: '10px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                        >
                                            <Edit3 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteOrder(order.id)} 
                                            title="Delete Booking"
                                            style={{ background: '#fff1f1', border: '1px solid #fee2e2', color: '#ef4444', padding: '10px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <span style={{ 
                                        padding: '5px 12px', 
                                        borderRadius: '8px', 
                                        fontSize: '0.7rem', 
                                        fontWeight: 900,
                                        backgroundColor: order.status === 'Received' ? '#ecfdf5' : '#fff7ed',
                                        color: order.status === 'Received' ? '#059669' : '#c2410c',
                                        border: `1px solid ${order.status === 'Received' ? '#bbf7d0' : '#ffedd5'}`
                                    }}>
                                        {order.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800 }}>BOOKING DATE</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {order.bookingDate}</p>
                                </div>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800 }}>{order.type === 'Outgoing' ? 'DELIVERY DATE' : 'EXP. DELIVERY'}</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {order.deliveryDate || 'N/A'}</p>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', marginBottom: '10px' }}>{order.type === 'Outgoing' ? 'SENDING ITEMS:' : 'ORDERED ITEMS:'}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {order.items.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{item.name}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 950, color: '#6366f1' }}>{item.qty} units</span>
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
                                            padding: '12px', 
                                            background: processingOrderId === order.id ? '#94a3b8' : 'linear-gradient(45deg, #10b981, #059669)', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '12px', 
                                            fontWeight: 900, 
                                            fontSize: '0.9rem', 
                                            cursor: processingOrderId === order.id ? 'not-allowed' : 'pointer', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            gap: '10px'
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
                                            padding: '10px', 
                                            background: 'white', 
                                            color: '#64748b', 
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '12px', 
                                            fontWeight: 800, 
                                            fontSize: '0.8rem', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        MARK COMPLETED ONLY (No Stock Change)
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
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px', overflow: 'hidden' }}
                        >
                            <div style={{ background: '#6366f1', padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 950 }}>Create New Supply Booking</h3>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '30px', maxHeight: '70vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>ORDER TYPE</label>
                                        <select style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '5px', fontWeight: 700 }} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                            <option value="Incoming">Incoming (From Supplier)</option>
                                            <option value="Outgoing">Outgoing (To Client)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>PARTY / CLIENT NAME</label>
                                        <input required style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '5px', fontWeight: 700 }} value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
                                    </div>
                                </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>CONTACT INFO (Optional)</label>
                                        <input style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '5px', fontWeight: 700 }} value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
                                    </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>EXPECTED DELIVERY DATE</label>
                                    <input type="date" style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '5px', fontWeight: 700 }} value={formData.deliveryDate} onChange={e => setFormData({...formData, deliveryDate: e.target.value})} />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>ORDERED ITEMS</label>
                                        <button type="button" onClick={handleAddItem} style={{ fontSize: '0.7rem', fontWeight: 900, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>+ ADD ANOTHER ITEM</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {formData.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                                                <input placeholder="Medicine Name" required style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }} value={item.name} onChange={e => handleItemChange(idx, 'name', e.target.value)} />
                                                <input placeholder="Qty" type="number" required style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }} value={item.qty} onChange={e => handleItemChange(idx, 'qty', e.target.value)} />
                                                <input placeholder="Est. Price" type="number" style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }} value={item.price} onChange={e => handleItemChange(idx, 'price', e.target.value)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" style={{ width: '100%', padding: '15px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>
                                    CONFIRM BOOKING
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default OrderManagement;
