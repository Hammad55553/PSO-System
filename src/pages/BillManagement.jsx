import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Camera, Upload, Trash2, FileText, Search, Plus, X, Eye } from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

const BillManagement = () => {
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';
    const [bills, setBills] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewBill, setViewBill] = useState(null);
    const [loading, setLoading] = useState(false);

    const [newBill, setNewBill] = useState({
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Purchase',
        note: '',
        image: ''
    });

    useEffect(() => {
        fetchBills();
        const subscription = supabase
            .channel('paper_bills_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'paper_bills' }, fetchBills)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchBills = async () => {
        const { data, error } = await supabase
            .from('paper_bills')
            .select('*')
            .order('date', { ascending: false });
        
        if (data) setBills(data);
        if (error) console.error(error);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Compression check
        if (file.size > 800000) { // Approx 800KB
            toast.error("Image too large. Please resize below 800KB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setNewBill({ ...newBill, image: reader.result });
            toast.success("Image attached successfully!");
        };
        reader.readAsDataURL(file);
    };

    const handleSaveBill = async (e) => {
        e.preventDefault();
        if (!newBill.title || !newBill.amount) {
            toast.error("Title and Amount are required");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('paper_bills')
                .insert([{
                    ...newBill,
                    amount: parseFloat(newBill.amount),
                    created_by: user?.name
                }]);
            
            if (error) throw error;
            toast.success("Bill saved in Supabase!");
            setIsModalOpen(false);
            setNewBill({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Purchase', note: '', image: '' });
        } catch (err) {
            console.error(err);
            toast.error("Failed to save bill");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!isAdmin) return;
        if (window.confirm("Delete this bill record permanently?")) {
            try {
                const { error } = await supabase
                    .from('paper_bills')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                toast.success("Bill deleted from Supabase");
            } catch (err) {
                toast.error("Delete failed");
            }
        }
    };

    const filteredBills = bills.filter(b => 
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.note?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', overflow: 'hidden' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '15px 25px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#f59e0b', padding: '8px', borderRadius: '10px', color: 'white' }}><FileText size={20} /></div>
                        Paper Bill Management
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Digitize and store your physical supplier bills & receipts</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                    <Plus size={20} /> ADD NEW BILL
                </button>
            </header>

            <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '15px 25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
                            placeholder="Search by supplier or bill title..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                        Showing {filteredBills.length} Digital Records
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {filteredBills.map(bill => (
                            <div key={bill.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s', position: 'relative' }}>
                                {bill.image ? (
                                    <div style={{ height: '140px', overflow: 'hidden', position: 'relative', cursor: 'pointer' }} onClick={() => setViewBill(bill)}>
                                        <img src={bill.image} alt="Bill" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="hover-eye">
                                            <Eye color="white" />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ height: '140px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Camera size={32} color="#94a3b8" />
                                    </div>
                                )}
                                <div style={{ padding: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h3 style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b' }}>{bill.title}</h3>
                                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '5px', fontWeight: 800 }}>{bill.category}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 950, color: '#059669' }}>Rs {bill.amount.toLocaleString()}</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>{new Date(bill.date).toLocaleDateString()}</span>
                                    </div>
                                    {bill.note && <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>{bill.note}</p>}
                                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setViewBill(bill)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                            <Eye size={14} /> View Details
                                        </button>
                                        {isAdmin && (
                                            <button onClick={() => handleDelete(bill.id)} style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#fff1f1', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal for adding bill */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', width: '450px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ background: '#0f172a', padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem' }}>UPLOAD PHYSICAL BILL</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                        </div>
                        <form onSubmit={handleSaveBill} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>BILL TITLE / SUPPLIER NAME</label>
                                <input 
                                    required
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700 }} 
                                    value={newBill.title} 
                                    onChange={e => setNewBill({ ...newBill, title: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>TOTAL AMOUNT (RS)</label>
                                    <input 
                                        type="number"
                                        required
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700 }} 
                                        value={newBill.amount} 
                                        onChange={e => setNewBill({ ...newBill, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>BILL DATE</label>
                                    <input 
                                        type="date"
                                        required
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700 }} 
                                        value={newBill.date} 
                                        onChange={e => setNewBill({ ...newBill, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>ATTACH BILL PHOTO (FREE STORAGE)</label>
                                <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                                    {newBill.image ? (
                                        <img src={newBill.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <>
                                            <Upload size={24} color="#94a3b8" />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>Click to select bill image</span>
                                        </>
                                    )}
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>ADDITIONAL NOTES</label>
                                <textarea 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, minHeight: '60px' }} 
                                    value={newBill.note} 
                                    onChange={e => setNewBill({ ...newBill, note: e.target.value })}
                                />
                            </div>
                            <button 
                                disabled={loading}
                                style={{ width: '100%', padding: '15px', background: '#059669', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                            >
                                {loading ? "SAVING RECORD..." : "SAVE DIGITAL BILL"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Viewer Modal */}
            {viewBill && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'white', width: '90vw', maxWidth: '800px', borderRadius: '20px', overflow: 'hidden', display: 'flex', height: '80vh' }}>
                        <div style={{ flex: 1, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={viewBill.image} alt="Full Bill" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ width: '300px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontWeight: 950, fontSize: '1.2rem' }}>Bill Details</h3>
                                <button onClick={() => setViewBill(null)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Supplier / Title</label>
                                <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{viewBill.title}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Amount Paid</label>
                                <p style={{ fontWeight: 950, fontSize: '1.4rem', color: '#059669' }}>Rs {viewBill.amount.toLocaleString()}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Date</label>
                                <p style={{ fontWeight: 800 }}>{new Date(viewBill.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Notes</label>
                                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>{viewBill.note || 'No notes added to this record.'}</p>
                            </div>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>Record ID: {viewBill.id}</p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>Creator: {viewBill.created_by}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillManagement;
