import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { 
    BookOpen, 
    Plus, 
    CheckCircle, 
    Trash2, 
    Clock, 
    Search, 
    AlertCircle,
    ShoppingCart,
    MoreVertical,
    X
} from 'lucide-react';
import { addToShortage, removeFromShortage, updateShortageStatus } from '../store/slices/shortageSlice';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const ShortageBook = () => {
    const dispatch = useDispatch();
    const { items } = useSelector(state => state.shortage);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItemName, setNewItemName] = useState('');

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => (b.demand_count || 0) - (a.demand_count || 0));

    const handleAddManual = async (e) => {
        e.preventDefault();
        if (!newItemName) return;
        const item = {
            name: newItemName,
            demand_count: 1,
            status: 'pending',
            notes: ''
        };

        try {
            const { error } = await supabase
                .from('shortage')
                .insert([item]);
            
            if (error) throw error;
            toast.success('Added to Shortage Book (Supabase)');
            setNewItemName('');
            setIsModalOpen(false);
        } catch (err) {
            toast.error('Failed to add demand');
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            const { error } = await supabase
                .from('shortage')
                .update({ status })
                .eq('id', id);
            
            if (error) throw error;
            toast.success(`Marked as ${status}`);
        } catch (err) {
            toast.error('Status update failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this entry?")) return;
        try {
            const { error } = await supabase
                .from('shortage')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            toast.success('Entry Removed from Supabase');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px', backgroundColor: '#f4f7fa' }}>
            
            {/* HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BookOpen size={28} color="#6366f1" /> SHORTAGE & DEMAND BOOK
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>Track items requested by customers that are out of stock.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: '#6366f1', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} /> ADD NEW DEMAND
                </button>
            </header>

            {/* SEARCH */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#64748b' }} />
                    <input 
                        type="text" 
                        placeholder="Search for requested medicines..." 
                        style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* LIST */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {filteredItems.map((item, idx) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ 
                            background: 'white', 
                            padding: '20px', 
                            borderRadius: '16px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: 900, 
                                padding: '4px 8px', 
                                background: item.status === 'resolved' ? '#ecfdf5' : item.status === 'ordered' ? '#eff6ff' : '#fff7ed', 
                                color: item.status === 'resolved' ? '#059669' : item.status === 'ordered' ? '#2563eb' : '#c2410c',
                                borderRadius: '6px',
                                textTransform: 'uppercase'
                            }}>
                                {item.status}
                            </span>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '10px' }}>{item.name}</h3>
                        
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', flex: 1 }}>
                                <p style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800 }}>DEMAND COUNT</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 950, color: '#6366f1' }}>{item.demand_count || 1} Times</p>
                            </div>
                            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', flex: 1 }}>
                                <p style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800 }}>LAST REQUEST</p>
                                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>{new Date(item.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            {item.status === 'pending' && (
                                <button 
                                    onClick={() => handleStatusChange(item.id, 'ordered')}
                                    style={{ flex: 1, padding: '10px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                    MARK ORDERED
                                </button>
                            )}
                            {item.status !== 'resolved' && (
                                <button 
                                    onClick={() => handleStatusChange(item.id, 'resolved')}
                                    style={{ flex: 1, padding: '10px', background: '#ecfdf5', color: '#059669', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                    RESOLVED
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* MANUAL ADD MODAL */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '450px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#6366f1', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900 }}>NEW DEMAND ENTRY</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAddManual} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>MEDICINE NAME / DESCRIPTION</label>
                                <input 
                                    autoFocus
                                    placeholder="Enter what the customer asked for..." 
                                    style={{ width: '100%', padding: '15px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', fontWeight: 700 }}
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '15px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>
                                ADD TO SHORTAGE BOOK
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShortageBook;
