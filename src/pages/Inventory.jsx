import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Search, Edit3, Trash2, Filter, Download, Box, AlertCircle, Calendar, Hash, X, RefreshCw, Layers } from 'lucide-react';
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
    const [editingItem, setEditingItem] = useState(null);
    const [restockItem, setRestockItem] = useState(null);
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
        const data = { 
            name: formData.name,
            category: formData.category,
            unit: formData.unit,
            barcode: formData.barcode || null,
            price: parseFloat(formData.price), 
            doctor_price: parseFloat(formData.doctor_price || formData.price),
            buy_price: parseFloat(formData.buy_price || 0),
            stock: parseInt(formData.stock), 
            min_stock: parseInt(formData.min_stock || 5),
            expiry: formData.expiry || null,
            critical_days: parseInt(formData.critical_days || 60),
            manufacturer: formData.manufacturer || '',
            batch_no: formData.batch_no || '',
        };

        const tempId = editingItem ? editingItem.id : Date.now().toString();
        const optimisticData = { ...data, id: tempId };

        try {
            if (editingItem) {
                // Optimistic Update
                dispatch(editItem(optimisticData));
                
                const { error } = await supabase
                    .from('inventory')
                    .update(data)
                    .eq('id', editingItem.id);
                
                if (error) {
                    console.warn("Offline: Queuing update...");
                    addToSyncQueue('inventory', 'update', data, editingItem.id);
                } else {
                    toast.success('Synced to Cloud');
                }
            } else {
                // Optimistic Add
                dispatch(addItem(optimisticData));

                const { error } = await supabase
                    .from('inventory')
                    .insert([data]);
                
                if (error) {
                    console.warn("Offline: Queuing insert...");
                    addToSyncQueue('inventory', 'insert', data);
                } else {
                    toast.success('Synced to Cloud');
                }
            }
            
            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({ name: '', price: '', doctor_price: '', buy_price: '', stock: '', unit: 'Units', category: 'Medicine', min_stock: '5', expiry: '', tax_percent: '0', barcode: '', critical_days: '60', manufacturer: '', batch_no: '' });
        } catch (err) {
            console.error(err);
            // Even if fatal error, we keep it in queue if not already there
            toast.success("Saved Locally (Offline Mode)");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!isAdmin) {
            toast.error("Only Admins can delete products.");
            return;
        }
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                const { error } = await supabase
                    .from('inventory')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                toast.success('Product removed from Supabase');
            } catch (err) {
                console.error(err);
                toast.error("Cloud Delete Failed.");
            }
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            price: item.price,
            doctor_price: item.doctor_price || item.price || '',
            buy_price: item.buy_price || '',
            stock: item.stock,
            unit: item.unit || 'Units',
            category: item.category || 'Medicine',
            min_stock: item.min_stock || 5,
            expiry: item.expiry || '',
            tax_percent: item.tax_percent || 0,
            barcode: item.barcode || '',
            critical_days: item.critical_days || 60,
            manufacturer: item.manufacturer || '',
            batch_no: item.batch_no || ''
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
            return;
        }

        const currentStock = parseFloat(restockItem.stock || 0);
        const currentBuyPrice = parseFloat(restockItem.buy_price || 0);

        // Weighted Average Cost (WAC) Logic
        const totalStock = currentStock + incomingQty;
        const averageBuyPrice = ((currentStock * currentBuyPrice) + (incomingQty * incomingBuyPrice)) / totalStock;

        const updatedItem = {
            ...restockItem,
            stock: totalStock,
            buy_price: parseFloat(averageBuyPrice.toFixed(2))
        };

        dispatch(editItem(updatedItem));
        try {
            const { error } = await supabase
                .from('inventory')
                .update({
                    stock: totalStock,
                    buy_price: parseFloat(averageBuyPrice.toFixed(2))
                })
                .eq('id', restockItem.id);
            
            if (error) throw error;
            toast.success(`Restocked! New Avg Cost: Rs ${averageBuyPrice.toFixed(2)}`);
        } catch (err) {
            console.error(err);
            toast.error("Restock Cloud Sync Failed");
        } finally {
            setIsSaving(false);
        }
        setIsRestockModalOpen(false);
        setRestockQty('');
        setRestockBuyPrice('');
    };

    const openRestock = (item) => {
        setRestockItem(item);
        setRestockBuyPrice(item.buyPrice || '');
        setIsRestockModalOpen(true);
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
                    <button className="btn-erp" style={{ background: '#f8fafc', color: '#64748b' }}>
                        <Download size={16} /> EXPORT CSV
                    </button>
                    <button className="btn-erp" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={{ background: '#10b981', color: 'white', padding: '12px 20px', fontWeight: 800 }}>
                        <Plus size={18} /> ADD NEW MEDICINE
                    </button>
                </div>
            </header>

            {/* 2. SEARCH & FILTER BAR */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', shadow: 'sm', borderRadius: '8px', padding: '12px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#10b981' }} />
                    <input
                        type="text"
                        placeholder="Search by Medicine Name, Formula, or SKU..."
                        style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Filter size={18} color="#64748b" />
                    <select
                        style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, background: '#f8fafc', width: '200px' }}
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        <option>All Categories</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>

                    <select
                        style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, background: '#f0f9ff', width: '200px', color: '#0369a1' }}
                        value={selectedManufacturer}
                        onChange={e => setSelectedManufacturer(e.target.value)}
                    >
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
                                <th style={{ padding: '15px 20px', whiteSpace: 'nowrap' }}>STK ON HAND</th>
                                {isAdmin && <th style={{ padding: '15px 20px' }}>PURCHASE</th>}
                                 <th style={{ padding: '15px 20px' }}>RETAIL</th>
                                {isAdmin && <th style={{ padding: '15px 20px' }}>DOCTOR</th>}
                                {isAdmin && <th style={{ padding: '15px 20px' }}>PROFIT</th>}
                                <th style={{ padding: '15px 20px' }}>EXPIRY</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => {
                                const profit = item.price - (item.buy_price || 0);
                                const profitMargin = item.buy_price ? ((profit / item.buy_price) * 100).toFixed(0) : 0;
                                
                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '15px 20px' }}>
                                            {item.barcode ? (
                                                <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'fit-content' }}>
                                                    <Barcode value={item.barcode} height={30} width={1.2} fontSize={10} background="transparent" />
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>NO BARCODE</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <span>Unit: {item.unit}</span>
                                                {item.batch_no && <span style={{ color: '#ef4444', fontWeight: 900 }}>• BATCH: {item.batch_no}</span>}
                                                {item.manufacturer && <span style={{ color: '#059669', fontWeight: 900 }}>• {item.manufacturer?.toUpperCase()}</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 8px', background: '#ecfdf5', borderRadius: '4px', color: '#047857' }}>{item.category?.toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: '15px 20px', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 950, color: item.stock <= (item.min_stock || 5) ? '#ef4444' : '#1e293b' }}>{item.stock}</span>
                                                {item.stock <= (item.min_stock || 5) && <AlertCircle size={14} color="#ef4444" />}
                                            </div>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>MIN: {item.min_stock || 5}</span>
                                        </td>
                                         {isAdmin && <td style={{ padding: '15px 20px', fontWeight: 800, color: '#64748b' }}>Rs {item.buy_price || 0}</td>}
                                        <td style={{ padding: '15px 20px', fontWeight: 900, color: '#059669', fontSize: '1.1rem' }}>Rs {item.price.toLocaleString()}</td>
                                        {isAdmin && <td style={{ padding: '15px 20px', fontWeight: 800, color: '#6366f1', fontSize: '1.1rem' }}>Rs {(item.doctor_price || item.price).toLocaleString()}</td>}
                                        {isAdmin && (
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ fontWeight: 900, color: profit > 0 ? '#10b981' : '#ef4444' }}>Rs {profit.toLocaleString()}</div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>Margin: {profitMargin}%</div>
                                            </td>
                                        )}
                                        <td style={{ padding: '15px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                            {item.expiry ? <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={12} /> {item.expiry}</div> : '-'}
                                        </td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                {isAdmin && (
                                                    <button onClick={() => {
                                                        const win = window.open('', 'PRINT', 'height=400,width=600');
                                                        win.document.write(`<html><head><title>Print Barcode</title>`);
                                                        win.document.write(`<style>body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;}.sticker{width:50mm;height:25mm;border:1px dashed #ccc;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:5px;}.name{font-size:10px;font-weight:bold;margin-bottom:2px;}.price{font-size:12px;font-weight:black;}</style>`);
                                                        win.document.write(`</head><body>`);
                                                        win.document.write(`<div class="sticker">`);
                                                        win.document.write(`<div class="name">${item.name}</div>`);
                                                        win.document.write(`<img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${item.barcode || item.id}&scale=2&rotate=N&includetext=true&textsize=10" style="max-width:100%;height:auto;"/>`);
                                                        win.document.write(`<div class="price">Rs ${item.price}</div>`);
                                                        win.document.write(`</div>`);
                                                        win.document.write(`</body></html>`);
                                                        win.document.close();
                                                        win.focus();
                                                        setTimeout(() => { win.print(); win.close(); }, 500);
                                                    }} title="Print Barcode Sticker" style={{ background: '#f0f9ff', border: '1px solid #0ea5e9', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#0284c7' }}><Hash size={16} /></button>
                                                )}
                                                {isAdmin && <button onClick={() => openRestock(item)} title="Add Stock (Average Calculation)" style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#059669' }}><RefreshCw size={16} /></button>}
                                                <button onClick={() => openEdit(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#64748b' }}><Edit3 size={16} /></button>
                                                {isAdmin && <button onClick={() => handleDelete(item.id)} style={{ background: '#fff1f1', border: '1px solid #fee2e2', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. TOTALS SUMMARY */}
            <footer style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>TOTAL MEDICINES ENROLLED: <span style={{ color: '#065f46', fontWeight: 900 }}>{filteredItems.length}</span></span>
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                    {isAdmin && (
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>ESTIMATED ASSET VALUE</p>
                            <h4 style={{ fontSize: '1.3rem', fontWeight: 950, color: '#10b981' }}>Rs {filteredItems.reduce((acc, i) => acc + ((i.buy_price || 0) * i.stock), 0).toLocaleString()}</h4>
                        </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>EXPECTED REVENUE</p>
                        <h4 style={{ fontSize: '1.3rem', fontWeight: 950, color: '#059669' }}>Rs {filteredItems.reduce((acc, i) => acc + (i.price * i.stock), 0).toLocaleString()}</h4>
                    </div>
                </div>
            </footer>

            {/* 5. DEFINE PRODUCT MODAL */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        style={{ background: 'white', width: '100%', maxWidth: '700px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)', padding: '20px 25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                <Plus size={22} /> {editingItem ? 'EDIT MEDICINE' : 'ENROLL NEW MEDICINE'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: '25px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>FULL MEDICINE NAME</label>
                                    <div style={{ position: 'relative' }}>
                                        {nameSuggestion && formData.name && (
                                            <div style={{ position: 'absolute', left: '12px', top: '12px', fontSize: '1rem', fontWeight: 700, color: '#cbd5e1', pointerEvents: 'none', whiteSpace: 'pre' }}>
                                                <span style={{ color: 'transparent' }}>{formData.name}</span>
                                                {nameSuggestion.slice(formData.name.length)}
                                            </div>
                                        )}
                                        <input 
                                            required 
                                            placeholder="Example: Panadol 500mg" 
                                            style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '1rem', fontWeight: 700, background: 'transparent', position: 'relative', zIndex: 2 }} 
                                            value={formData.name} 
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            onKeyDown={e => {
                                                if ((e.key === 'Tab' || e.key === 'ArrowRight') && nameSuggestion) {
                                                    e.preventDefault();
                                                    setFormData({ ...formData, name: nameSuggestion });
                                                    setNameSuggestion('');
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#ef4444', display: 'block', marginBottom: '8px' }}>BATCH / LOT NUMBER</label>
                                    <input placeholder="Example: B-204, L-99..." style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '1rem', fontWeight: 700, color: '#ef4444' }} value={formData.batch_no} onChange={e => setFormData({ ...formData, batch_no: e.target.value })} />
                                </div>
                            </div>

                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                                 {isAdmin && (
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>PURCHASE PRICE</label>
                                        <input type="number" required placeholder="0" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800, background: '#f8fafc' }} value={formData.buy_price} onChange={e => setFormData({ ...formData, buy_price: e.target.value })} />
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>RETAIL PRICE</label>
                                    <input type="number" required placeholder="0" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800, background: '#f8fafc' }} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                {isAdmin && (
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#6366f1', display: 'block', marginBottom: '6px' }}>DOCTOR PRICE</label>
                                        <input type="number" placeholder="0" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800, color: '#6366f1', background: '#f5f3ff' }} value={formData.doctor_price} onChange={e => setFormData({ ...formData, doctor_price: e.target.value })} />
                                    </div>
                                )}
                                {isAdmin && (
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>TAX (%)</label>
                                        <input type="number" placeholder="0" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800, color: '#059669', background: '#f0fdf4' }} value={formData.tax_percent} onChange={e => setFormData({ ...formData, tax_percent: e.target.value })} />
                                    </div>
                                )}
                            </div>

                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>STOCK QUANTITY</label>
                                    <input type="number" required placeholder="0" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>COMPANY / MFR</label>
                                    <div style={{ position: 'relative' }}>
                                        {mfrSuggestion && formData.manufacturer && (
                                            <div style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '0.9rem', fontWeight: 700, color: '#cbd5e1', pointerEvents: 'none', whiteSpace: 'pre' }}>
                                                <span style={{ color: 'transparent' }}>{formData.manufacturer}</span>
                                                {mfrSuggestion.slice(formData.manufacturer.length)}
                                            </div>
                                        )}
                                        <input 
                                            placeholder="GSK, Abbott..." 
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, color: '#059669', background: 'transparent', position: 'relative', zIndex: 2 }} 
                                            value={formData.manufacturer} 
                                            onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                                            onKeyDown={e => {
                                                if ((e.key === 'Tab' || e.key === 'ArrowRight') && mfrSuggestion) {
                                                    e.preventDefault();
                                                    setFormData({ ...formData, manufacturer: mfrSuggestion });
                                                    setMfrSuggestion('');
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>EXPIRY DATE</label>
                                    <input type="date" required style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }} value={formData.expiry} onChange={e => setFormData({ ...formData, expiry: e.target.value })} />
                                </div>
                            </div>
                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>CATEGORY</label>
                                    <select style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>PACKING SIZE</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <select 
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }} 
                                            value={['Packet', 'Kilogram (Kg)', 'Gram (g)', 'Litre (L)', 'Millilitre (ml)', 'Bottle', 'Injection', 'Strip'].includes(formData.unit) ? formData.unit : 'Other'} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                if (val === 'Other') setFormData({...formData, unit: ''});
                                                else setFormData({...formData, unit: val});
                                            }}
                                        >
                                            <option value="Packet">Packet</option>
                                            <option value="Kilogram (Kg)">Kilogram (Kg)</option>
                                            <option value="Gram (g)">Gram (g)</option>
                                            <option value="Litre (L)">Litre (L)</option>
                                            <option value="Millilitre (ml)">Millilitre (ml)</option>
                                            <option value="Bottle">Bottle</option>
                                            <option value="Injection">Injection</option>
                                            <option value="Strip">Strip</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        {!['Packet', 'Kilogram (Kg)', 'Gram (g)', 'Litre (L)', 'Millilitre (ml)', 'Bottle', 'Injection', 'Strip'].includes(formData.unit) && (
                                            <input placeholder="Unit" style={{ width: '80px', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                                        )}
                                    </div>
                                </div>
                            </div>
                             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>BARCODE (SCAN / MANUAL)</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input placeholder="Scan or type..." style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700 }} value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} />
                                        <button type="button" onClick={() => setFormData({ ...formData, barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString() })} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0 15px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 900, color: '#475569' }}>GENERATE</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>LOW ALERT</label>
                                        <input type="number" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>EXP ALERT</label>
                                        <input type="number" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.critical_days} onChange={e => setFormData({ ...formData, critical_days: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '10px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '15px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 800, cursor: 'pointer' }}>CANCEL</button>
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    style={{ 
                                        flex: 2, 
                                        padding: '14px', 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
                                        color: 'white', 
                                        fontWeight: 900, 
                                        cursor: isSaving ? 'not-allowed' : 'pointer', 
                                        boxShadow: isSaving ? 'none' : '0 10px 15px -3px rgba(16, 185, 129, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    {isSaving ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            SAVING TO CLOUD...
                                        </>
                                    ) : (
                                        editingItem ? 'UPDATE PRODUCT' : 'ENROLL PRODUCT'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* 6. SMART RESTOCK MODAL */}
            {isRestockModalOpen && restockItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ background: 'white', width: '450px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}
                    >
                        <div style={{ background: '#10b981', padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Layers size={22} /> SMART RESTOCKING
                                </h3>
                                <p style={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 700 }}>{restockItem.name}</p>
                            </div>
                            <button onClick={() => setIsRestockModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleRestock} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>CURRENT STOCK</p>
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: 950 }}>{restockItem.stock} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Units</span></h4>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800 }}>CURRENT AVG COST</p>
                                    <h4 style={{ fontSize: '1.2rem', fontWeight: 950 }}>Rs {restockItem.buy_price}</h4>
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0' }} />

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>ARIVING QUANTITY (Total Units)</label>
                                <input 
                                    type="number" 
                                    required 
                                    autoFocus
                                    placeholder="e.g. 100" 
                                    style={{ width: '100%', padding: '15px', border: '2px solid #10b981', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950 }} 
                                    value={restockQty} 
                                    onChange={e => setRestockQty(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>NEW PURCHASE PRICE (Cost per Unit)</label>
                                <input 
                                    type="number" 
                                    required 
                                    placeholder="e.g. 120" 
                                    style={{ width: '100%', padding: '15px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950 }} 
                                    value={restockBuyPrice} 
                                    onChange={e => setRestockBuyPrice(e.target.value)} 
                                />
                            </div>

                            <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 800 }}>PROJECTED AVERAGE COST:</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 950, color: '#10b981' }}>
                                        Rs {restockQty && restockBuyPrice ? 
                                            (((parseFloat(restockItem.stock)*parseFloat(restockItem.buyPrice)) + (parseFloat(restockQty)*parseFloat(restockBuyPrice))) / (parseFloat(restockItem.stock) + parseFloat(restockQty))).toFixed(2) : 
                                            restockItem.buyPrice}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.6rem', color: '#166534', fontWeight: 600 }}>Algorithm will recalculate profit margins based on this value.</p>
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSaving}
                                style={{ 
                                    width: '100%', 
                                    padding: '18px', 
                                    background: isSaving ? '#94a3b8' : '#10b981', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '12px', 
                                    fontSize: '1rem', 
                                    fontWeight: 950, 
                                    cursor: isSaving ? 'not-allowed' : 'pointer', 
                                    boxShadow: isSaving ? 'none' : '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw size={20} className="animate-spin" />
                                        PROCESSING RESTOCK...
                                    </>
                                ) : (
                                    'CONFIRM RESTOCK & MERGE COST'
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
