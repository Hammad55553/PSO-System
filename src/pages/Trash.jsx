import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
    Trash2, 
    RefreshCcw, 
    History, 
    Truck, 
    Search, 
    XCircle,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Box
} from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const Trash = () => {
    const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'suppliers', 'inventory'
    const [trashData, setTrashData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(null); 
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTrash = async () => {
        setIsLoading(true);
        try {
            let table = 'sales';
            if (activeTab === 'suppliers') table = 'suppliers';
            if (activeTab === 'inventory') table = 'inventory';

            const { data, error } = await supabase
                .from(table)
                .select('*')
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false });

            if (error) throw error;
            setTrashData(data || []);
        } catch (err) {
            console.error("Fetch Trash Error:", err);
            toast.error("Failed to load trash");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTrash();
    }, [activeTab]);

    const handleRestore = async (id) => {
        setIsActionLoading(id);
        try {
            let table = 'sales';
            if (activeTab === 'suppliers') table = 'suppliers';
            if (activeTab === 'inventory') table = 'inventory';

            const { error } = await supabase
                .from(table)
                .update({ deleted_at: null })
                .eq('id', id);

            if (error) throw error;
            
            toast.success("Record Restored Successfully");
            setTrashData(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error("Restore Error:", err);
            toast.error("Failed to restore");
        } finally {
            setIsActionLoading(null);
        }
    };

    const handlePermanentDelete = async (id) => {
        if (!window.confirm("PERMANENT DELETE: This action cannot be undone. Are you sure?")) return;
        
        setIsActionLoading(id);
        try {
            let table = 'sales';
            if (activeTab === 'suppliers') table = 'suppliers';
            if (activeTab === 'inventory') table = 'inventory';

            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            toast.success("Deleted Permanently");
            setTrashData(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error("Delete Error:", err);
            toast.error("Failed to delete permanently");
        } finally {
            setIsActionLoading(null);
        }
    };

    const filteredTrash = trashData.filter(item => {
        const query = searchTerm.toLowerCase();
        if (activeTab === 'sales') {
            return item.customer_name?.toLowerCase().includes(query) || item.id.toString().includes(query);
        } else if (activeTab === 'suppliers') {
            return item.name?.toLowerCase().includes(query) || item.company?.toLowerCase().includes(query);
        } else {
            return item.name?.toLowerCase().includes(query) || item.id.toString().includes(query) || item.barcode?.includes(query);
        }
    });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px', backgroundColor: '#f8fafc' }}>
            
            {/* HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Trash2 size={28} color="#ef4444" /> SYSTEM TRASH
                    </h2>
                    <p style={{ color: '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>Items are automatically cleared after 30 days</p>
                </div>
                
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '5px', borderRadius: '12px', gap: '5px' }}>
                    <button 
                        onClick={() => setActiveTab('sales')}
                        style={{ padding: '10px 15px', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', background: activeTab === 'sales' ? 'white' : 'transparent', color: activeTab === 'sales' ? '#2563eb' : '#64748b', boxShadow: activeTab === 'sales' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}
                    >
                        SALES
                    </button>
                    <button 
                        onClick={() => setActiveTab('inventory')}
                        style={{ padding: '10px 15px', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', background: activeTab === 'inventory' ? 'white' : 'transparent', color: activeTab === 'inventory' ? '#2563eb' : '#64748b', boxShadow: activeTab === 'inventory' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}
                    >
                        INVENTORY
                    </button>
                    <button 
                        onClick={() => setActiveTab('suppliers')}
                        style={{ padding: '10px 15px', border: 'none', borderRadius: '10px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', background: activeTab === 'suppliers' ? 'white' : 'transparent', color: activeTab === 'suppliers' ? '#2563eb' : '#64748b', boxShadow: activeTab === 'suppliers' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' }}
                    >
                        SUPPLIERS
                    </button>
                </div>
            </header>

            {/* SEARCH & FILTERS */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#94a3b8' }} />
                    <input 
                        type="text"
                        placeholder={`Search deleted ${activeTab}...`}
                        style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={fetchTrash} style={{ padding: '0 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer' }}>
                    <RefreshCcw size={18} color="#64748b" />
                </button>
            </div>

            {/* CONTENT AREA */}
            <div style={{ flex: 1, background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {isLoading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Loader2 className="animate-spin" size={40} color="#2563eb" />
                    </div>
                ) : filteredTrash.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>ITEM DETAILS</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>DELETED ON</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>REMAINING DAYS</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTrash.map(item => {
                                    const deletedDate = new Date(item.deleted_at);
                                    const expiryDate = new Date(deletedDate);
                                    expiryDate.setDate(expiryDate.getDate() + 30);
                                    const daysRemaining = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));

                                    return (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '15px 25px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '10px' }}>
                                                        {activeTab === 'sales' ? <History size={20} color="#2563eb" /> : 
                                                         activeTab === 'inventory' ? <Box size={20} color="#059669" /> :
                                                         <Truck size={20} color="#2563eb" />}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 900, color: '#1e293b' }}>
                                                            {activeTab === 'sales' ? `Invoice #${item.id.toString().slice(-6).toUpperCase()}` : item.name}
                                                        </p>
                                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                                            {activeTab === 'sales' ? item.customer_name : 
                                                             activeTab === 'inventory' ? item.category :
                                                             item.company}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 25px', fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                                                {deletedDate.toLocaleDateString()} {deletedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '15px 25px' }}>
                                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, background: daysRemaining < 7 ? '#fff1f1' : '#f0fdf4', color: daysRemaining < 7 ? '#ef4444' : '#059669' }}>
                                                    {daysRemaining} Days left
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px 25px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        onClick={() => handleRestore(item.id)}
                                                        disabled={isActionLoading === item.id}
                                                        style={{ padding: '8px 15px', background: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                    >
                                                        {isActionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                                                        RESTORE
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePermanentDelete(item.id)}
                                                        disabled={isActionLoading === item.id}
                                                        style={{ padding: '8px 15px', background: '#fff1f1', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                    >
                                                        {isActionLoading === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                        DELETE
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: '50px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                            <CheckCircle2 size={40} color="#cbd5e1" />
                        </div>
                        <h3 style={{ fontWeight: 900, color: '#1e293b' }}>Trash is Empty</h3>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '10px' }}>No deleted {activeTab} found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Trash;
