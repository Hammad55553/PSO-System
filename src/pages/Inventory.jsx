import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Search, Edit3, Trash2, Filter, Download, Box, AlertCircle, Calendar, Hash, X, RefreshCw, Layers, History, TrendingUp, ShoppingBag, ArrowUpCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { addItem, editItem, deleteItem } from '../store/slices/inventorySlice';
import Barcode from 'react-barcode';
import toast from 'react-hot-toast';
import { addToSyncQueue } from '../utils/offlineSync';


const Inventory = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const inventory = useSelector(state => state.inventory.items);
    const isAdmin = user?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [nameSuggestion, setNameSuggestion] = useState('');
    const [mfrSuggestion, setMfrSuggestion] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [selectedManufacturer, setSelectedManufacturer] = useState('All Companies');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [restockItem, setRestockItem] = useState(null);
    const [auditItem, setAuditItem] = useState(null);
    const [restockQty, setRestockQty] = useState('');
    const [restockBuyPrice, setRestockBuyPrice] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '', price: '', doctor_price: '', buy_price: '', stock: '', unit: 'Units', category: 'Medicine', min_stock: '5', expiry: '', tax_percent: '0', barcode: '', critical_days: '60', manufacturer: '', batch_no: ''
    });

    const categories = ['Medicine', 'Vaccine', 'Syrup', 'Tablet', 'Injection', 'Surgical', 'Pet Food', 'Accessories', 'Feed', 'Other'];

    const manufacturers = React.useMemo(() => {
        const unique = [...new Set(inventory.map(i => i.manufacturer).filter(Boolean))];
        return unique.sort();
    }, [inventory]);

    const filteredItems = inventory.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.id && item.id.includes(searchTerm)) ||
            (item.barcode && item.barcode.includes(searchTerm)) ||
            (item.manufacturer && item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.batch_no && item.batch_no.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCat = selectedCategory === 'All Categories' || item.category === selectedCategory;
        const matchesMan = selectedManufacturer === 'All Companies' || item.manufacturer === selectedManufacturer;
        return matchesSearch && matchesCat && matchesMan;
    });

    // GHOST AUTOCOMPLETE FOR ENROLLMENT
    React.useEffect(() => {
        if (isModalOpen && formData.name && formData.name.length >= 2) {
            const match = inventory.find(i => i.name.toLowerCase().startsWith(formData.name.toLowerCase()));
            if (match) setNameSuggestion(match.name);
            else setNameSuggestion('');
        } else {
            setNameSuggestion('');
        }
    }, [formData.name, inventory, isModalOpen]);

    React.useEffect(() => {
        if (isModalOpen && formData.manufacturer && formData.manufacturer.length >= 2) {
            const mfrs = [...new Set(inventory.map(i => i.manufacturer).filter(Boolean))];
            const match = mfrs.find(m => m.toLowerCase().startsWith(formData.manufacturer.toLowerCase()));
            if (match) setMfrSuggestion(match);
            else setMfrSuggestion('');
        } else {
            setMfrSuggestion('');
        }
    }, [formData.manufacturer, inventory, isModalOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);

        const initialStockValue = parseInt(formData.stock);
        const data = {
            name: formData.name,
            category: formData.category,
            unit: formData.unit,
            barcode: formData.barcode || null,
            price: parseFloat(formData.price),
            doctor_price: parseFloat(formData.doctor_price || formData.price),
            buy_price: parseFloat(formData.buy_price || 0),
            stock: initialStockValue,
            min_stock: parseInt(formData.min_stock || 5),
            expiry: formData.expiry || null,
            critical_days: parseInt(formData.critical_days || 60),
            manufacturer: formData.manufacturer || '',
            batch_no: formData.batch_no || '',
            initial_stock: editingItem ? editingItem.initial_stock : initialStockValue,
            total_sold: editingItem ? editingItem.total_sold : 0
        };

        const tempId = editingItem ? editingItem.id : Date.now().toString();
        const optimisticData = { ...data, id: tempId };

        try {
            if (editingItem) {
                dispatch(editItem(optimisticData));
                const { error } = await supabase.from('inventory').update(data).eq('id', editingItem.id);
                if (error) addToSyncQueue('inventory', 'update', data, editingItem.id);
                else toast.success('Synced to Cloud');
            } else {
                dispatch(addItem(optimisticData));
                const { error } = await supabase.from('inventory').insert([data]);
                if (error) addToSyncQueue('inventory', 'insert', data);
                else toast.success('Synced to Cloud');
            }

            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({ name: '', price: '', doctor_price: '', buy_price: '', stock: '', unit: 'Units', category: 'Medicine', min_stock: '5', expiry: '', tax_percent: '0', barcode: '', critical_days: '60', manufacturer: '', batch_no: '' });
        } catch (err) {
            console.error(err);
            toast.success("Saved Locally (Offline Mode)");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!isAdmin) {
            toast.error("Only Admins can move products to Trash.");
            return;
        }
        if (window.confirm('Move this product to Trash? It will be permanently deleted after 30 days.')) {
            try {
                const { error } = await supabase.from('inventory').update({ deleted_at: new Date().toISOString() }).eq('id', id);
                if (error) throw error;
                dispatch(deleteItem(id));
                toast.success('Product moved to Trash');
            } catch (err) {
                toast.error("Cloud Move to Trash Failed.");
            }
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name, price: item.price, doctor_price: item.doctor_price || item.price || '',
            buy_price: item.buy_price || '', stock: item.stock, unit: item.unit || 'Units',
            category: item.category || 'Medicine', min_stock: item.min_stock || 5,
            expiry: item.expiry || '', tax_percent: item.tax_percent || 0,
            barcode: item.barcode || '', critical_days: item.critical_days || 60,
            manufacturer: item.manufacturer || '', batch_no: item.batch_no || ''
        });
        setIsModalOpen(true);
    };

    const handleRestock = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        const incomingQty = parseFloat(restockQty);
        const incomingBuyPrice = parseFloat(restockBuyPrice);

        if (isNaN(incomingQty) || isNaN(incomingBuyPrice)) {
            toast.error("Please enter valid numbers");
            setIsSaving(false);
            return;
        }

        const currentStock = parseFloat(restockItem.stock || 0);
        const currentBuyPrice = parseFloat(restockItem.buy_price || 0);
        const totalStock = currentStock + incomingQty;
        const averageBuyPrice = ((currentStock * currentBuyPrice) + (incomingQty * incomingBuyPrice)) / totalStock;

        const newHistoryEntry = {
            date: new Date().toISOString(),
            quantity: incomingQty,
            prev_stock: currentStock,
            new_stock: totalStock,
            buy_price: incomingBuyPrice
        };

        const updatedHistory = [newHistoryEntry, ...(restockItem.restock_history || [])];

        const updatedData = {
            stock: totalStock,
            buy_price: parseFloat(averageBuyPrice.toFixed(2)),
            restock_history: updatedHistory
        };

        dispatch(editItem({ ...restockItem, ...updatedData }));
        try {
            const { error } = await supabase.from('inventory').update(updatedData).eq('id', restockItem.id);
            if (error) throw error;
            toast.success(`Restocked! New Avg Cost: Rs ${averageBuyPrice.toFixed(2)}`);
        } catch (err) {
            addToSyncQueue('inventory', 'update', updatedData, restockItem.id);
            toast.success("Saved Locally (Restock)");
        } finally {
            setIsSaving(false);
            setIsRestockModalOpen(false);
            setRestockQty('');
            setRestockBuyPrice('');
        }
    };

    const openRestock = (item) => {
        setRestockItem(item);
        setRestockBuyPrice(item.buy_price || '');
        setIsRestockModalOpen(true);
    };

    const openAudit = (item) => {
        setAuditItem(item);
        setIsAuditModalOpen(true);
    };

    return (
        <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', height: '100%', gap: '15px', overflow: 'hidden', backgroundColor: '#f0f4f8' }}>

            {/* 1. PROFESSIONAL HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px 20px', borderBottom: '3px solid #059669', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#065f46', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Box size={24} color="#10b981" /> PHARMACY INVENTORY CONTROL
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage medicines, medical supplies, and stock levels.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-erp" style={{ background: '#f8fafc', color: '#64748b' }}><Download size={16} /> EXPORT CSV</button>
                    <button className="btn-erp" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={{ background: '#10b981', color: 'white', padding: '12px 20px', fontWeight: 800 }}><Plus size={18} /> ADD NEW MEDICINE</button>
                </div>
            </header>

            {/* 2. SEARCH & FILTER BAR */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#10b981' }} />
                    <input type="text" placeholder="Search by Medicine Name, Formula, or SKU..." style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Filter size={18} color="#64748b" />
                    <select style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, background: '#f8fafc', width: '200px' }} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option>All Categories</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, background: '#f0f9ff', width: '200px', color: '#0369a1' }} value={selectedManufacturer} onChange={e => setSelectedManufacturer(e.target.value)}>
                        <option>All Companies</option>
                        {manufacturers.map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* 3. INVENTORY GRID */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ overflowY: 'auto', height: '100%' }}>
                    <table className="erp-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#065f46', color: 'white' }}>
                            <tr>
                                <th style={{ padding: '15px 20px' }}>MEDICINE ID / BARCODE</th>
                                <th style={{ padding: '15px 20px' }}>DESCRIPTION</th>
                                <th style={{ padding: '15px 20px' }}>CATEGORY</th>
                                <th style={{ padding: '15px 20px' }}>STK ON HAND</th>
                                {isAdmin && <th style={{ padding: '15px 20px' }}>PURCHASE</th>}
                                <th style={{ padding: '15px 20px' }}>RETAIL</th>
                                {isAdmin && <th style={{ padding: '15px 20px' }}>DOCTOR</th>}
                                <th style={{ padding: '15px 20px' }}>EXPIRY</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px 20px' }}>
                                        {item.barcode ? <Barcode value={item.barcode} height={30} width={1.2} fontSize={10} background="transparent" /> : <span style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>NO BARCODE</span>}
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                                            <span>Unit: {item.unit}</span>
                                            {item.batch_no && <span style={{ color: '#ef4444', fontWeight: 900 }}>• BATCH: {item.batch_no}</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px 20px' }}><span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 8px', background: '#ecfdf5', borderRadius: '4px', color: '#047857' }}>{item.category?.toUpperCase()}</span></td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 950, color: item.stock <= (item.min_stock || 5) ? '#ef4444' : '#1e293b' }}>{item.stock}</span>
                                            {item.stock <= (item.min_stock || 5) && <AlertCircle size={14} color="#ef4444" />}
                                        </div>
                                    </td>
                                    {isAdmin && <td style={{ padding: '15px 20px', fontWeight: 800, color: '#64748b' }}>Rs {item.buy_price || 0}</td>}
                                    <td style={{ padding: '15px 20px', fontWeight: 900, color: '#059669', fontSize: '1.1rem' }}>Rs {item.price.toLocaleString()}</td>
                                    {isAdmin && <td style={{ padding: '15px 20px', fontWeight: 800, color: '#6366f1' }}>Rs {(item.doctor_price || item.price).toLocaleString()}</td>}
                                    <td style={{ padding: '15px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{item.expiry || '-'}</td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => openAudit(item)} title="Stock Audit & History" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#7c3aed' }}><History size={16} /></button>
                                            {isAdmin && <button onClick={() => openRestock(item)} title="Restock" style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#059669' }}><RefreshCw size={16} /></button>}
                                            <button onClick={() => openEdit(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#64748b' }}><Edit3 size={16} /></button>
                                            {isAdmin && <button onClick={() => handleDelete(item.id)} style={{ background: '#fff1f1', border: '1px solid #fee2e2', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AUDIT MODAL */}
            <AnimatePresence>
                {isAuditModalOpen && auditItem && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'white', width: '600px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: '#7c3aed', padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '10px' }}><History size={22} /> STOCK AUDIT TRAIL</h3>
                                    <p style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 700 }}>{auditItem.name} - Full Lifecycle</p>
                                </div>
                                <button onClick={() => setIsAuditModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                            </div>

                            <div style={{ padding: '25px', overflowY: 'auto', flex: 1 }}>
                                {/* SUMMARY CARDS */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
                                    <div style={{ background: '#f5f3ff', padding: '15px', borderRadius: '16px', border: '1px solid #ddd6fe' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', marginBottom: '5px' }}><ArrowUpCircle size={14} /> <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>OPENING</span></div>
                                        <h4 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#4c1d95' }}>{auditItem.initial_stock || 0} <small style={{ fontSize: '0.6rem' }}>Units</small></h4>
                                    </div>
                                    <div style={{ background: '#ecfdf5', padding: '15px', borderRadius: '16px', border: '1px solid #d1fae5' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', marginBottom: '5px' }}><TrendingUp size={14} /> <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>RESTOCKED</span></div>
                                        <h4 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#064e3b' }}>{(auditItem.restock_history || []).reduce((acc, h) => acc + h.quantity, 0)} <small style={{ fontSize: '0.6rem' }}>Units</small></h4>
                                    </div>
                                    <div style={{ background: '#fff1f2', padding: '15px', borderRadius: '16px', border: '1px solid #fecaca' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48', marginBottom: '5px' }}><ShoppingBag size={14} /> <span style={{ fontSize: '0.65rem', fontWeight: 900 }}>SOLD</span></div>
                                        <h4 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#881337' }}>{auditItem.total_sold || 0} <small style={{ fontSize: '0.6rem' }}>Units</small></h4>
                                    </div>
                                </div>

                                {/* RESTOCK LOG */}
                                <h5 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', marginBottom: '15px', letterSpacing: '1px' }}>RESTOCKING HISTORY</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(auditItem.restock_history || []).length > 0 ? (
                                        auditItem.restock_history.map((log, idx) => (
                                            <div key={idx} style={{ padding: '12px 15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b' }}>Added {log.quantity} Units</p>
                                                    <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>{new Date(log.date).toLocaleString()}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>Cost: Rs {log.buy_price}</p>
                                                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>Stock: {log.prev_stock} → {log.new_stock}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '16px' }}>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>No restock history recorded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
                                <button onClick={() => setIsAuditModalOpen(false)} style={{ padding: '10px 25px', background: '#f1f5f9', border: 'none', borderRadius: '10px', color: '#475569', fontWeight: 800, cursor: 'pointer' }}>CLOSE AUDIT</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODALS REMAIN SIMILAR (SAVE, RESTOCK) BUT UPDATED TO TRACK HISTORY */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} style={{ background: 'white', width: '100%', maxWidth: '700px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)', padding: '20px 25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}><Plus size={22} /> {editingItem ? 'EDIT MEDICINE' : 'ENROLL NEW MEDICINE'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: '25px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* BASIC INFO */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>FULL MEDICINE NAME</label>
                                    <input required placeholder="Example: Panadol 500mg" style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '1rem', fontWeight: 700 }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    {nameSuggestion && formData.name && nameSuggestion.toLowerCase() !== formData.name.toLowerCase() && (
                                        <div style={{ position: 'absolute', left: '12px', top: '35px', color: '#cbd5e1', pointerEvents: 'none', fontSize: '1rem', fontWeight: 700 }}>
                                            {formData.name}<span style={{ color: '#94a3b8' }}>{nameSuggestion.slice(formData.name.length)}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ef4444', display: 'block', marginBottom: '8px' }}>BATCH / LOT NUMBER</label>
                                    <input placeholder="Example: B-204..." style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '1rem', fontWeight: 700 }} value={formData.batch_no} onChange={e => setFormData({ ...formData, batch_no: e.target.value })} />
                                </div>
                            </div>

                            {/* CATEGORY & UNIT & MANUFACTURER */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CATEGORY</label>
                                    <select style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {categories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>UNIT</label>
                                    <input placeholder="e.g. Strip" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>MANUFACTURER</label>
                                    <input placeholder="Company Name" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                                    {mfrSuggestion && formData.manufacturer && mfrSuggestion.toLowerCase() !== formData.manufacturer.toLowerCase() && (
                                        <div style={{ position: 'absolute', left: '12px', top: '30px', color: '#cbd5e1', pointerEvents: 'none', fontSize: '0.9rem', fontWeight: 700 }}>
                                            {formData.manufacturer}<span style={{ color: '#94a3b8' }}>{mfrSuggestion.slice(formData.manufacturer.length)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PRICING ROW */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px', background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                                {isAdmin && (
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>PURCHASE PRICE</label>
                                        <input type="number" required style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.buy_price} onChange={e => setFormData({ ...formData, buy_price: e.target.value })} />
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#059669', display: 'block', marginBottom: '6px' }}>RETAIL PRICE</label>
                                    <input type="number" required style={{ width: '100%', padding: '10px 12px', border: '1px solid #059669', borderRadius: '8px', fontWeight: 800 }} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#6366f1', display: 'block', marginBottom: '6px' }}>DOCTOR PRICE</label>
                                    <input type="number" style={{ width: '100%', padding: '10px 12px', border: '1px solid #6366f1', borderRadius: '8px', fontWeight: 800 }} value={formData.doctor_price} onChange={e => setFormData({ ...formData, doctor_price: e.target.value })} />
                                </div>
                            </div>

                            {/* STOCK & EXPIRY */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>OPENING STOCK</label>
                                    <input type="number" required style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444', display: 'block', marginBottom: '6px' }}>MIN STOCK ALERT</label>
                                    <input type="number" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>EXPIRY DATE</label>
                                    <input type="date" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.expiry} onChange={e => setFormData({ ...formData, expiry: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CRITICAL DAYS</label>
                                    <input type="number" title="Days before expiry to show alert" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.critical_days} onChange={e => setFormData({ ...formData, critical_days: e.target.value })} />
                                </div>
                            </div>

                            {/* BARCODE SYSTEM */}
                            <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '12px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>BARCODE / SKU</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input placeholder="Scan or type barcode" style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 800 }} value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} />
                                    <button type="button" onClick={() => setFormData({ ...formData, barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString() })} style={{ padding: '10px 15px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 800, color: '#475569', cursor: 'pointer' }}>GENERATE</button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 800 }}>CANCEL</button>
                                <button type="submit" disabled={isSaving} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', fontWeight: 900, opacity: isSaving ? 0.7 : 1 }}>
                                    {isSaving ? 'SAVING...' : (editingItem ? 'UPDATE PRODUCT' : 'ENROLL PRODUCT')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {isRestockModalOpen && restockItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'white', width: '450px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#10b981', padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 950 }}><Layers size={22} /> SMART RESTOCKING</h3>
                            <button onClick={() => setIsRestockModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleRestock} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>ARIVING QUANTITY</label>
                                <input type="number" required placeholder="e.g. 100" style={{ width: '100%', padding: '15px', border: '2px solid #10b981', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950 }} value={restockQty} onChange={e => setRestockQty(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>PURCHASE PRICE</label>
                                <input type="number" required placeholder="Cost per unit" style={{ width: '100%', padding: '15px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950 }} value={restockBuyPrice} onChange={e => setRestockBuyPrice(e.target.value)} />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '18px', background: '#10b981', color: 'white', borderRadius: '12px', fontWeight: 950 }}>CONFIRM RESTOCK</button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
