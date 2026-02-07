import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Search, Edit3, Trash2, Filter, Download, Box, AlertCircle, Calendar, Hash, X } from 'lucide-react';
import { addItem, editItem, deleteItem } from '../store/slices/inventorySlice';
import toast from 'react-hot-toast';

import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

const Inventory = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const inventory = useSelector(state => state.inventory.items);
    const isAdmin = user?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    const [formData, setFormData] = useState({
        name: '', price: '', stock: '', unit: 'Units', category: 'Medicine', minStock: '5', expiry: ''
    });

    const categories = ['Medicine', 'Vaccine', 'Pet Food', 'Accessories', 'Feed', 'Injectables', 'Surgical', 'Other'];

    const filteredItems = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || (item.id && item.id.includes(searchTerm));
        const matchesCat = selectedCategory === 'All Categories' || item.category === selectedCategory;
        return matchesSearch && matchesCat;
    });

    const handleSave = async (e) => {
        e.preventDefault();
        const data = { ...formData, price: parseFloat(formData.price), stock: parseFloat(formData.stock), minStock: parseFloat(formData.minStock) };
        const finalId = editingItem ? editingItem.id : `SKU-${Math.floor(Math.random() * 10000)}`;

        const finalData = { ...data, id: finalId };

        if (editingItem) {
            dispatch(editItem(finalData));
            toast.success('Product definition updated');
        } else {
            dispatch(addItem(finalData));
            toast.success('New product generated');
        }

        // CLOUD PUSH
        if (navigator.onLine) {
            try {
                await setDoc(doc(db, "inventory", finalId), finalData);
            } catch (err) {
                console.error("Cloud Sync Failed:", err);
            }
        }

        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({ name: '', price: '', stock: '', unit: 'Units', category: 'Medicine', minStock: '5', expiry: '' });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            dispatch(deleteItem(id));
            if (navigator.onLine) {
                try {
                    await deleteDoc(doc(db, "inventory", id));
                    toast.success('Deleted from Cloud');
                } catch (err) {
                    console.error("Cloud Delete Failed:", err);
                }
            }
            toast.success('Product removed');
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            price: item.price,
            stock: item.stock,
            unit: item.unit || 'Units',
            category: item.category || 'Medicine',
            minStock: item.minStock || 5,
            expiry: item.expiry || ''
        });
        setIsModalOpen(true);
    };

    return (
        <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', height: '100%', gap: '15px', overflow: 'hidden' }}>

            {/* 1. PROFESSIONAL HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '15px 20px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Box size={24} color="var(--primary)" /> MASTER INVENTORY DEFINITION
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage SKU catalog, price lists, and stock reordering thresholds.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-erp" style={{ background: '#f8fafc', color: '#64748b' }}>
                        <Download size={16} /> EXPORT CSV
                    </button>
                    <button className="btn-erp btn-erp-primary" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={{ padding: '12px 20px', fontWeight: 800 }}>
                        <Plus size={18} /> DEFINE NEW SKU
                    </button>
                </div>
            </header>

            {/* 2. SEARCH & FILTER BAR */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search by Product Name, SKU Code..."
                        style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Filter size={18} color="#64748b" />
                    <select
                        style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, background: '#f8fafc', width: '180px' }}
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        <option>All Categories</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* 3. INVENTORY GRID */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ overflowY: 'auto', height: '100%' }}>
                    <table className="erp-table">
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1e293b', color: 'white' }}>
                            <tr>
                                <th style={{ padding: '15px 20px' }}>SKU CODE</th>
                                <th style={{ padding: '15px 20px' }}>DESCRIPTION</th>
                                <th style={{ padding: '15px 20px' }}>CATEGORY</th>
                                <th style={{ padding: '15px 20px' }}>STK ON HAND</th>
                                <th style={{ padding: '15px 20px' }}>SALE PRICE</th>
                                <th style={{ padding: '15px 20px' }}>EXPIRY</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right' }}>OPTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px 20px', fontWeight: 800, color: '#94a3b8', fontSize: '0.75rem' }}>{item.id}</td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Unit: {item.unit}</div>
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', color: '#475569' }}>{item.category.toUpperCase()}</span>
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 950, color: item.stock <= (item.minStock || 5) ? '#ef4444' : '#1e293b' }}>{item.stock}</span>
                                            {item.stock <= (item.minStock || 5) && <AlertCircle size={14} color="#ef4444" />}
                                        </div>
                                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8' }}>MIN: {item.minStock || 5}</span>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem' }}>Rs {item.price.toLocaleString()}</td>
                                    <td style={{ padding: '15px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                        {item.expiry ? <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Calendar size={12} /> {item.expiry}</div> : '-'}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                        {isAdmin ? (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => openEdit(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#64748b' }}><Edit3 size={16} /></button>
                                                <button onClick={() => handleDelete(item.id)} style={{ background: '#fff1f1', border: '1px solid #fee2e2', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>LOCKED</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. TOTALS SUMMARY */}
            <footer style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '8px', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>TOTAL SKU DEFINED: <span style={{ color: '#1e293b' }}>{filteredItems.length}</span></span>
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>TOTAL STOCK VALUE</p>
                        <h4 style={{ fontSize: '1.3rem', fontWeight: 950, color: 'var(--primary)' }}>Rs {filteredItems.reduce((acc, i) => acc + (i.price * i.stock), 0).toLocaleString()}</h4>
                    </div>
                </div>
            </footer>

            {/* 5. DEFINE PRODUCT MODAL */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '500px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <div style={{ background: '#1e293b', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900 }}>{editingItem ? 'MODIFY PRODUCT DEFINITION' : 'DEFINE NEW SKU CATALOG'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>PRODUCT DESCRIPTION / NAME</label>
                                <input required style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '1rem', fontWeight: 700 }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>SALE PRICE (Rs)</label>
                                    <input type="number" required style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontWeight: 800 }} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>CURRENT STOCK</label>
                                    <input type="number" required style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontWeight: 800 }} value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>REORDER POINT (MIN)</label>
                                    <input type="number" style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontWeight: 800 }} value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>EXPIRY DATE</label>
                                    <input type="date" style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontWeight: 700 }} value={formData.expiry} onChange={e => setFormData({ ...formData, expiry: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>CATEGORY</label>
                                    <select style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontWeight: 700 }} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>UNIT</label>
                                    <select style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '6px', fontWeight: 700 }} value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                        <option>Units</option>
                                        <option>Bot (Bottle)</option>
                                        <option>Pkt (Pocket)</option>
                                        <option>Vial</option>
                                        <option>Strip</option>
                                        <option>KG</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" style={{ width: '100%', padding: '18px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', marginTop: '10px' }}>
                                {editingItem ? 'UPDATE SKU INFO' : 'FINALIZE PRODUCT DEFINITION'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Inventory;
