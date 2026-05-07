import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Camera, Upload, Trash2, FileText, Search, Plus, X, Eye, Edit2, CheckCircle2, Clock, AlertCircle, RotateCw, ZoomIn, ZoomOut, Maximize2, Crop, Minus } from 'lucide-react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const BillManagement = () => {
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';
    const [bills, setBills] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewBill, setViewBill] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewerScale, setViewerScale] = useState(1);
    const [viewerRotation, setViewerRotation] = useState(0);

    const [editingBill, setEditingBill] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const [originalImage, setOriginalImage] = useState(null);
    const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 }); // Percentages
    const [newBill, setNewBill] = useState({
        title: '',
        amount: '',
        paid_amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'Purchase',
        status: 'Unpaid',
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

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions 1200px
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setOriginalImage(compressedDataUrl);
                setNewBill({ ...newBill, image: compressedDataUrl });
                toast.success("Image uploaded. You can now crop it!");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const applyCrop = () => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scaleX = img.width / 100;
            const scaleY = img.height / 100;
            
            const targetX = cropBox.x * scaleX;
            const targetY = cropBox.y * scaleY;
            const targetW = cropBox.w * scaleX;
            const targetH = cropBox.h * scaleY;

            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, targetX, targetY, targetW, targetH, 0, 0, targetW, targetH);
            
            const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
            setNewBill({ ...newBill, image: croppedUrl });
            setIsCropping(false);
            toast.success("Cropped successfully!");
        };
        img.src = originalImage;
    };

    const handleSaveBill = async (e) => {
        e.preventDefault();
        if (!newBill.title || !newBill.amount) {
            toast.error("Title and Amount are required");
            return;
        }

        setLoading(true);
        try {
            const billData = {
                ...newBill,
                amount: parseFloat(newBill.amount),
                paid_amount: newBill.status === 'Partially Paid' ? parseFloat(newBill.paid_amount || 0) : (newBill.status === 'Paid' ? parseFloat(newBill.amount) : 0),
                created_by: user?.name
            };

            if (editingBill) {
                const { error } = await supabase
                    .from('paper_bills')
                    .update(billData)
                    .eq('id', editingBill.id);
                if (error) throw error;
                toast.success("Bill updated successfully!");
            } else {
                const { error } = await supabase
                    .from('paper_bills')
                    .insert([billData]);
                if (error) throw error;
                toast.success("New bill saved!");
            }
            
            setIsModalOpen(false);
            setEditingBill(null);
            setNewBill({ title: '', amount: '', paid_amount: '', date: new Date().toISOString().split('T')[0], type: 'Purchase', status: 'Unpaid', note: '', image: '' });
        } catch (err) {
            console.error(err);
            toast.error("Operation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (bill) => {
        setEditingBill(bill);
        setNewBill({
            title: bill.title,
            amount: bill.amount,
            paid_amount: bill.paid_amount || '',
            date: bill.date,
            type: bill.type || 'Purchase',
            status: bill.status || 'Unpaid',
            note: bill.note || '',
            image: bill.image || ''
        });
        setIsModalOpen(true);
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

    // Financial Summary Logic
    const summary = useMemo(() => {
        return bills.reduce((acc, b) => {
            const remaining = (b.amount || 0) - (b.paid_amount || 0);
            if (b.type === 'Sale') acc.toReceive += remaining;
            else if (b.type === 'Purchase') acc.toPay += remaining;
            return acc;
        }, { toReceive: 0, toPay: 0 });
    }, [bills]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', overflow: 'hidden' }}>
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 600 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 600 ? 'stretch' : 'center', 
                marginBottom: '20px', 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '15px' : '20px 25px', 
                borderRadius: '15px', 
                border: '1px solid #e2e8f0',
                gap: '15px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.4rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#f59e0b', padding: '8px', borderRadius: '10px', color: 'white' }}><FileText size={window.innerWidth <= 480 ? 18 : 20} /></div>
                        Paper Bill Management
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Digitize and store your physical supplier bills & receipts</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                    <Plus size={20} /> ADD NEW BILL
                </button>
            </header>

            <div style={{ background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* FINANCIAL SUMMARY BAR */}
                <div style={{ 
                    padding: '15px 25px', 
                    background: '#f8fafc', 
                    borderBottom: '1px solid #e2e8f0', 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 640 ? 'column' : 'row',
                    gap: '15px'
                }}>
                    <div style={{ flex: 1, background: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#059669', textTransform: 'uppercase' }}>To Receive (Lena Hai)</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#065f46' }}>Rs {summary.toReceive.toLocaleString()}</h4>
                        </div>
                        <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '50%', color: '#059669' }}><Plus size={18} /></div>
                    </div>
                    <div style={{ flex: 1, background: 'white', padding: '12px 20px', borderRadius: '12px', border: '1px solid #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase' }}>To Pay (Dena Hai)</p>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#991b1b' }}>Rs {summary.toPay.toLocaleString()}</h4>
                        </div>
                        <div style={{ background: '#fee2e2', padding: '8px', borderRadius: '50%', color: '#ef4444' }}><Minus size={18} /></div>
                    </div>
                </div>

                <div style={{ 
                    padding: '15px 25px', 
                    borderBottom: '1px solid #f1f5f9', 
                    display: 'flex', 
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    justifyContent: 'space-between', 
                    alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
                    gap: '15px'
                }}>
                    <div style={{ position: 'relative', width: window.innerWidth <= 768 ? '100%' : '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
                            placeholder="Search by supplier or bill title..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textAlign: window.innerWidth <= 768 ? 'center' : 'right' }}>
                        Showing {filteredBills.length} Digital Records
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: window.innerWidth <= 480 ? '15px' : '20px' }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {filteredBills.map(bill => (
                            <div key={bill.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                {bill.image ? (
                                    <div style={{ height: '160px', overflow: 'hidden', position: 'relative', cursor: 'pointer' }} onClick={() => setViewBill(bill)}>
                                        <img src={bill.image} alt="Bill" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }} className="hover-eye">
                                            <Eye color="white" />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ height: '160px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Camera size={32} color="#94a3b8" />
                                    </div>
                                )}
                                <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '5px' }}>
                                        <h3 style={{ fontWeight: 900, fontSize: '0.95rem', color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.title}</h3>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <span style={{ background: bill.type === 'Sale' ? '#e0f2fe' : '#fef3c7', color: bill.type === 'Sale' ? '#0369a1' : '#92400e', fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>{bill.type?.toUpperCase()}</span>
                                            <span style={{ 
                                                background: bill.status === 'Paid' ? '#dcfce7' : bill.status === 'Partially Paid' ? '#ffedd5' : '#fee2e2', 
                                                color: bill.status === 'Paid' ? '#15803d' : bill.status === 'Partially Paid' ? '#c2410c' : '#b91c1c', 
                                                fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 
                                            }}>{bill.status?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ 
                                                fontSize: '1rem', 
                                                fontWeight: 950, 
                                                color: bill.status === 'Paid' ? '#15803d' : bill.status === 'Partially Paid' ? '#c2410c' : '#b91c1c' 
                                            }}>Rs {bill.amount.toLocaleString()}</span>
                                            {bill.status === 'Partially Paid' && <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 800 }}>Paid: Rs {bill.paid_amount?.toLocaleString()}</span>}
                                        </div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8' }}>{new Date(bill.date).toLocaleDateString()}</span>
                                    </div>
                                    {bill.note && <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '15px', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{bill.note}</p>}
                                    <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setViewBill(bill)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <Eye size={14} /> View
                                        </button>
                                        <button onClick={() => handleEdit(bill)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #6366f1', background: '#eef2ff', color: '#6366f1', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            <Edit2 size={14} /> Edit
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: window.innerWidth <= 480 ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ 
                        background: 'white', 
                        width: window.innerWidth <= 480 ? '100%' : '480px', 
                        maxHeight: '90vh',
                        borderRadius: window.innerWidth <= 480 ? '20px 20px 0 0' : '20px', 
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ background: '#0f172a', padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', flexShrink: 0 }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem' }}>{editingBill ? 'EDIT DIGITAL RECORD' : 'UPLOAD PHYSICAL BILL'}</h3>
                            <button onClick={() => { setIsModalOpen(false); setEditingBill(null); setIsCropping(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                        </div>
                        <form onSubmit={handleSaveBill} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <button 
                                    type="button"
                                    onClick={() => setNewBill({ ...newBill, type: 'Purchase' })}
                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: newBill.type === 'Purchase' ? '#fef3c7' : 'white', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', color: newBill.type === 'Purchase' ? '#92400e' : '#64748b' }}
                                >
                                    I PURCHASED (Khareed)
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setNewBill({ ...newBill, type: 'Sale' })}
                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: newBill.type === 'Sale' ? '#e0f2fe' : 'white', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', color: newBill.type === 'Sale' ? '#0369a1' : '#64748b' }}
                                >
                                    I SOLD (Farookht)
                                </button>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>SUPPLIER / CUSTOMER NAME</label>
                                <input 
                                    required
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700 }} 
                                    value={newBill.title} 
                                    onChange={e => setNewBill({ ...newBill, title: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>TOTAL BILL (RS)</label>
                                    <input 
                                        type="number"
                                        required
                                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700 }} 
                                        value={newBill.amount} 
                                        onChange={e => setNewBill({ ...newBill, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>BILL DATE</label>
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
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>PAYMENT STATUS</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['Paid', 'Unpaid', 'Partially Paid'].map(s => (
                                        <button 
                                            key={s}
                                            type="button"
                                            onClick={() => setNewBill({ ...newBill, status: s })}
                                            style={{ flex: 1, padding: '10px 5px', borderRadius: '8px', border: '1px solid #e2e8f0', background: newBill.status === s ? '#0f172a' : 'white', color: newBill.status === s ? 'white' : '#64748b', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer' }}
                                        >
                                            {s.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newBill.status === 'Partially Paid' && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>AMOUNT PAID SO FAR (RS)</label>
                                    <input 
                                        type="number"
                                        style={{ width: '100%', padding: '12px', border: '1px solid #6366f1', borderRadius: '10px', fontWeight: 700, background: '#f5f3ff' }} 
                                        value={newBill.paid_amount} 
                                        onChange={e => setNewBill({ ...newBill, paid_amount: e.target.value })}
                                        placeholder="Enter amount paid..."
                                    />
                                </motion.div>
                            )}

                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>{editingBill ? 'REPLACE PHOTO (OPTIONAL)' : 'ATTACH BILL PHOTO'}</label>
                                <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                                    {newBill.image ? (
                                        <img src={newBill.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <>
                                            <Upload size={20} color="#94a3b8" />
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>Select image</span>
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
                            <div style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>{editingBill ? 'REPLACE PHOTO (OPTIONAL)' : 'ATTACH BILL PHOTO'}</label>
                                
                                {!isCropping ? (
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                                            {newBill.image ? (
                                                <>
                                                    <img src={newBill.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    <button 
                                                        type="button"
                                                        onClick={() => { setIsCropping(true); if(!originalImage) setOriginalImage(newBill.image); }}
                                                        style={{ position: 'absolute', top: '10px', right: '10px', background: '#0f172a', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', zIndex: 10 }}
                                                    >
                                                        <Crop size={14} /> CROP IMAGE
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={20} color="#94a3b8" />
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8' }}>Select image</span>
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
                                ) : (
                                    <div style={{ position: 'relative', background: '#0f172a', borderRadius: '12px', padding: '10px', overflow: 'hidden' }}>
                                        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                                            <img src={originalImage} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.5 }} />
                                            
                                            {/* Crop Overlay */}
                                            <div style={{ 
                                                position: 'absolute', 
                                                top: `${cropBox.y}%`, 
                                                left: `${cropBox.x}%`, 
                                                width: `${cropBox.w}%`, 
                                                height: `${cropBox.h}%`, 
                                                border: '2px solid #10b981',
                                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                                                zIndex: 5
                                            }}>
                                                <div style={{ position: 'absolute', top: -5, left: -5, width: 10, height: 10, background: 'white', border: '2px solid #10b981' }} />
                                                <div style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, background: 'white', border: '2px solid #10b981' }} />
                                                <div style={{ position: 'absolute', bottom: -5, left: -5, width: 10, height: 10, background: 'white', border: '2px solid #10b981' }} />
                                                <div style={{ position: 'absolute', bottom: -5, right: -5, width: 10, height: 10, background: 'white', border: '2px solid #10b981' }} />
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                            <button type="button" onClick={applyCrop} style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>APPLY CROP</button>
                                            <button type="button" onClick={() => setIsCropping(false)} style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}>CANCEL</button>
                                        </div>
                                        
                                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <span style={{ fontSize: '0.6rem', color: 'white', fontWeight: 800 }}>ADJUST SIDES & TOP</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ color: 'white', fontSize: '0.6rem' }}>X</span>
                                                <input type="range" min="0" max="40" value={cropBox.x} onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setCropBox({ ...cropBox, x: val, w: 100 - (val * 2) });
                                                }} style={{ width: '100%' }} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ color: 'white', fontSize: '0.6rem' }}>Y</span>
                                                <input type="range" min="0" max="40" value={cropBox.y} onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    setCropBox({ ...cropBox, y: val, h: 100 - (val * 2) });
                                                }} style={{ width: '100%' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px' }}>NOTES</label>
                                <textarea 
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 700, minHeight: '60px' }} 
                                    value={newBill.note} 
                                    onChange={e => setNewBill({ ...newBill, note: e.target.value })}
                                />
                            </div>
                            <button 
                                disabled={loading || isCropping}
                                style={{ width: '100%', padding: '15px', background: '#059669', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: (loading || isCropping) ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                            >
                                {loading ? "PROCESSING..." : (editingBill ? "UPDATE RECORD" : "SAVE DIGITAL BILL")}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Viewer Modal */}
            {viewBill && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ 
                        background: 'white', 
                        width: '95vw', 
                        maxWidth: '900px', 
                        borderRadius: '20px', 
                        overflow: 'hidden', 
                        display: 'flex', 
                        flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                        height: window.innerWidth <= 768 ? '95vh' : '80vh' 
                    }}>
                        <div style={{ 
                            flex: 1, 
                            background: '#0f172a', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            overflow: 'hidden',
                            position: 'relative',
                            minHeight: window.innerWidth <= 768 ? '50%' : 'auto',
                            cursor: viewerScale > 1 ? 'grab' : 'default'
                        }}>
                            <motion.div
                                animate={{ scale: viewerScale, rotate: viewerRotation }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <img 
                                    src={viewBill.image} 
                                    alt="Full Bill" 
                                    style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} 
                                />
                            </motion.div>

                            {/* Floating Controls */}
                            <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '8px 15px', borderRadius: '30px', display: 'flex', gap: '15px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                                <button onClick={() => setViewerScale(Math.max(0.5, viewerScale - 0.2))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} title="Zoom Out"><ZoomOut size={20} /></button>
                                <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 900, minWidth: '40px', textAlign: 'center' }}>{Math.round(viewerScale * 100)}%</span>
                                <button onClick={() => setViewerScale(Math.min(3, viewerScale + 0.2))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} title="Zoom In"><ZoomIn size={20} /></button>
                                <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }} />
                                <button onClick={() => setViewerRotation(viewerRotation + 90)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }} title="Rotate"><RotateCw size={20} /></button>
                                <button onClick={() => { setViewerScale(1); setViewerRotation(0); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}>RESET</button>
                            </div>

                            {window.innerWidth <= 768 && (
                                <button onClick={() => { setViewBill(null); setViewerScale(1); setViewerRotation(0); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: 'white', backdropFilter: 'blur(5px)' }}><X size={24} /></button>
                            )}
                        </div>
                        <div style={{ 
                            width: window.innerWidth <= 768 ? '100%' : '320px', 
                            padding: window.innerWidth <= 480 ? '20px' : '30px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '15px', 
                            overflowY: 'auto' 
                        }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ fontWeight: 950, fontSize: '1.2rem' }}>Bill Details</h3>
                                {window.innerWidth > 768 && (
                                    <button onClick={() => { setViewBill(null); setViewerScale(1); setViewerRotation(0); }} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={20} /></button>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Supplier / Title</label>
                                    <p style={{ fontWeight: 800, fontSize: '1rem' }}>{viewBill.title}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Amount Paid</label>
                                    <p style={{ fontWeight: 950, fontSize: '1.2rem', color: '#059669' }}>Rs {viewBill.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Date</label>
                                    <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{new Date(viewBill.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div style={{ flex: 1, borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 950, color: '#64748b', textTransform: 'uppercase' }}>Notes</label>
                                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>{viewBill.note || 'No notes added to this record.'}</p>
                            </div>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>Record ID: #{viewBill.id.toString().slice(-8)}</p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>Operator: {viewBill.created_by || 'System'}</p>
                            </div>
                             {window.innerWidth <= 768 && (
                                <button onClick={() => { setViewBill(null); setViewerScale(1); setViewerRotation(0); }} style={{ width: '100%', padding: '15px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, marginTop: '10px' }}>CLOSE VIEWER</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillManagement;
