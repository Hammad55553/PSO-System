import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    ShoppingCart,
    Search,
    Trash2,
    Plus,
    Minus,
    Printer,
    User,
    Banknote,
    CreditCard,
    History,
    Settings,
    X,
    Save,
    Pause,
    Play,
    ArrowRight,
    UserPlus,
    Box,
    LayoutGrid,
    Zap,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addSale } from '../store/slices/salesSlice';
import { updateStock } from '../store/slices/inventorySlice';
import { updateShiftStats } from '../store/slices/shiftSlice';
import { updateBalance } from '../store/slices/customerSlice';
import { addToShortage } from '../store/slices/shortageSlice';
import toast from 'react-hot-toast';

import { supabase } from '../supabase';


import logo from '../assets/Bila_vet.png';
import ThermalReceipt from '../components/ThermalReceipt';
import CheckoutSuccessModal from '../components/CheckoutSuccessModal';

const POS = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const inventory = useSelector(state => state.inventory.items);
    const activeShift = useSelector(state => state.shift.activeShift);
    const customers = useSelector(state => state.customers.list);
    const user = useSelector(state => state.auth.user);

    const [cart, setCart] = useState([]);
    const [parkedBills, setParkedBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [cashReceived, setCashReceived] = useState('');
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [lastSale, setLastSale] = useState(null);
    const [isDoctorMode, setIsDoctorMode] = useState(false);

    // UI States
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [showParkedList, setShowParkedList] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [checkoutStage, setCheckoutStage] = useState('idle'); // idle, printed, reporting


    const searchInputRef = useRef(null);
    const cashInputRef = useRef(null);

    const categories = ['All', ...new Set(inventory.map(i => i.category))];

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F1') { e.preventDefault(); searchInputRef.current?.focus(); }
            if (e.key === 'F2') { e.preventDefault(); setShowCustomerSearch(true); }
            if (e.key === 'F10') { e.preventDefault(); handleCheckout(); }
            if (e.key === 'F4') { e.preventDefault(); handleParkBill(); }
            if (e.key === 'Escape') {
                setShowCustomerSearch(false);
                setShowParkedList(false);
                setSearchTerm('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, selectedCustomer, cashReceived, globalDiscount, paymentMethod]);

    // BARCODE AUTO-SCAN
    useEffect(() => {
        if (searchTerm && searchTerm.length >= 8) {
            const item = inventory.find(i => i.barcode === searchTerm || i.id === searchTerm);
            if (item) {
                addToCart(item);
                setSearchTerm('');
                toast.success(`${item.name} added via barcode`);
            }
        }
    }, [searchTerm]);

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (item.barcode && item.barcode.includes(searchTerm));
        const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCat;
    });

    const addToCart = (product) => {
        const inventoryItem = inventory.find(i => i.id === product.id);
        const existing = cart.find(c => c.id === product.id);
        const currentQtyInCart = existing ? existing.quantity : 0;

        if (inventoryItem && inventoryItem.stock <= currentQtyInCart) {
            toast.success(`Demand entry: Sourcing from outside needed.`);
        }

        if (existing) {
            setCart(cart.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([{ ...product, quantity: 1, discount: 0, reason: '' }, ...cart]);
        }
        setSearchTerm('');
        searchInputRef.current?.focus();
    };

    const updateCartItem = (id, field, value) => {
        if (field === 'quantity') {
            const inventoryItem = inventory.find(i => i.id === id);
            if (inventoryItem && value > inventoryItem.stock) {
                toast.success(`Exceeding system stock. Please provide a sourcing reason.`);
            }
        }
        setCart(cart.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

    const handleParkBill = () => {
        if (cart.length === 0) return;
        setParkedBills([...parkedBills, { id: Date.now(), cart, selectedCustomer, time: new Date().toLocaleTimeString() }]);
        setCart([]);
        setSelectedCustomer(null);
        toast.success('Bill Parked (Hold)');
    };

    const restoreParked = (bill) => {
        setCart(bill.cart);
        setSelectedCustomer(bill.selectedCustomer);
        setParkedBills(parkedBills.filter(b => b.id !== bill.id));
        setShowParkedList(false);
    };

    // CALCULATIONS
    const subtotal = cart.reduce((acc, c) => {
        const itemPrice = isDoctorMode ? (c.doctorPrice || c.price) : c.price;
        return acc + (itemPrice * c.quantity);
    }, 0);
    const itemDiscounts = cart.reduce((acc, c) => acc + (c.discount || 0), 0);

    // ITEM-BASED TAX CALCULATION (Default 0% unless set in Inventory)
    const tax = cart.reduce((acc, c) => {
        const itemPrice = isDoctorMode ? (c.doctorPrice || c.price) : c.price;
        const taxableAmount = (itemPrice * c.quantity) - (c.discount || 0);
        const itemTax = taxableAmount * (c.taxPercent || 0) / 100;
        return acc + itemTax;
    }, 0);

    const finalTotal = subtotal - itemDiscounts - globalDiscount + tax;
    const changeAmount = cashReceived ? parseFloat(cashReceived) - finalTotal : 0;

    useEffect(() => {
        const handleAfterPrint = () => {
            // This event fires after the print dialog is closed
            setCheckoutStage(prev => (prev === 'printing' ? 'printed' : prev));
        };

        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, []);

    const resetPOS = () => {
        setCart([]);
        setSearchTerm('');
        setSelectedCustomer(null);
        setCashReceived('');
        setGlobalDiscount(0);
        setPaymentMethod('Cash');
        setLastSale(null);
        setCheckoutStage('idle');
        setIsDoctorMode(false);
    };

    const handleCheckout = async () => {
        if (!activeShift) return;
        if (cart.length === 0) { toast.error('Add items first!'); return; }
        if (paymentMethod === 'Credit' && !selectedCustomer) { toast.error('Select an Account!'); return; }

        const saleData = {
            customer_name: selectedCustomer ? selectedCustomer.name : 'Walking Patient',
            customer_id: selectedCustomer?.id || null,
            total: finalTotal,
            subtotal,
            tax,
            discount: itemDiscounts + globalDiscount,
            payment_method: paymentMethod,
            status: paymentMethod === 'Credit' ? 'Khatta' : 'Paid',
            seller_name: user?.name || activeShift?.staffName || 'Operator',
            is_doctor_mode: isDoctorMode
        };

        try {
            // 1. Save main sale
            const { data: savedSale, error: saleError } = await supabase
                .from('sales')
                .insert([saleData])
                .select()
                .single();

            if (saleError) throw saleError;

            // 2. Save sale items
            const itemsToSave = cart.map(item => ({
                sale_id: savedSale.id,
                product_id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: isDoctorMode ? (item.doctor_price || item.price) : item.price,
                buy_price: item.buy_price || 0
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(itemsToSave);

            if (itemsError) throw itemsError;

            // 3. Update Inventory Stock
            for (const item of cart) {
                const { data: currentItem } = await supabase
                    .from('inventory')
                    .select('stock')
                    .eq('id', item.id)
                    .single();
                
                const newStock = (currentItem?.stock || 0) - item.quantity;
                
                await supabase
                    .from('inventory')
                    .update({ stock: newStock })
                    .eq('id', item.id);
            }

            // 4. Update Shift (If needed, assuming shifts table exists)
            // ... shift update logic ...

            setLastSale({ ...saleData, id: savedSale.id, cashReceived, changeAmount, date: new Date().toLocaleString() });
            toast.success('Sale Saved to Supabase');

        } catch (err) {
            console.error("Supabase Save Failed:", err);
            toast.error("Cloud Save Failed: " + err.message);
        }

        dispatch(updateShiftStats({ sale: finalTotal }));

        // SET TO PRINTING MODE (MODAL HIDDEN)
        setCheckoutStage('printing');
        toast.success('Sale Processed. Ready for Print.');

        setTimeout(() => {
            window.print();
        }, 300);
    };

    if (!activeShift) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f1f5f9' }}>
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', borderTop: '5px solid #059669', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <div style={{ width: '70px', height: '70px', background: '#ecfdf5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Box size={35} color="#059669" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#065f46' }}>TERMINAL STANDBY</h2>
                    <p style={{ color: '#64748b', marginTop: '10px', maxWidth: '300px' }}>Pharmacy terminal is currently offline. Start a new session to begin billing.</p>
                    <button onClick={() => navigate('/shift')} style={{ marginTop: '30px', width: '100%', padding: '15px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>OPEN TERMINAL</button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="no-print" style={{ display: 'grid', gridTemplateRows: '50px 1fr', height: '100%', background: '#e2e8f0', overflow: 'hidden' }}>

                {/* 1. TOP ERP BAR */}
                <header style={{ background: '#064e3b', color: 'white', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#10b981', padding: '4px', borderRadius: '4px' }}><Zap size={18} color="white" /></div>
                        <span style={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.5px' }}>MEDICAL POS <small style={{ color: '#34d399', fontWeight: 700 }}>PHARMACY EDITION</small></span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '25px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#a7f3d0' }}>
                            <div style={{ width: '8px', height: '8px', background: '#34d399', borderRadius: '50%' }}></div>
                            PHARMACIST ON DUTY
                        </div>
                        <div style={{ height: '20px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>SESSION: {new Date(activeShift.startTime).toLocaleTimeString()}</span>
                    </div>
                </header>

                {/* 2. OPERATIONAL GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 350px', gap: '2px', padding: '2px', overflow: 'hidden' }}>

                    {/* LEFT SIDEBAR: CATEGORIES & QUICK ACCESS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#e2e8f0' }}>
                        <div style={{ background: '#065f46', color: 'white', padding: '12px 15px', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <LayoutGrid size={14} /> DRUG CATEGORIES
                        </div>
                        <div style={{ background: 'white', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    style={{
                                        padding: '15px 20px',
                                        border: 'none',
                                        borderBottom: '1px solid #f1f5f9',
                                        background: selectedCategory === cat ? '#ecfdf5' : 'transparent',
                                        color: selectedCategory === cat ? '#059669' : '#475569',
                                        textAlign: 'left',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        borderLeft: selectedCategory === cat ? '4px solid #059669' : '4px solid transparent'
                                    }}
                                >
                                    {cat.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <div style={{ background: '#064e3b', padding: '15px', color: 'white' }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#34d399', marginBottom: '10px' }}>HOTKEYS</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.65rem', fontWeight: 700 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F1:</span> <span>Search Drug</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F2:</span> <span>Patient</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F10:</span> <span>Print Bill</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F4:</span> <span>Hold Bill</span></div>
                            </div>
                        </div>
                    </div>

                    {/* MIDDLE: SEARCH & ITEM LIST */}
                    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '1px', background: '#e2e8f0', overflow: 'hidden' }}>

                        {/* SEARCH HEADER */}
                        <div style={{ background: 'white', padding: '15px', display: 'flex', gap: '10px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={20} style={{ position: 'absolute', left: '15px', top: '15px', color: '#059669' }} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="F1: SEARCH MEDICINE, FORMULA OR SCAN..."
                                    style={{ width: '100%', padding: '15px 15px 15px 50px', fontSize: '1.1rem', fontWeight: 800, border: '2px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 100, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', borderRadius: '0 0 6px 6px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {filteredInventory.map(item => (
                                            <div key={item.id} style={{ borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div onClick={() => addToCart(item)} style={{ padding: '15px 20px', cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</span>
                                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Stock: {item.stock} | Exp: {item.expiry || 'N/A'}</span>
                                                    </div>
                                                    <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.2rem' }}>Rs {isDoctorMode ? (item.doctorPrice || item.price) : item.price}</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const shortageItem = {
                                                            id: Date.now(),
                                                            name: item.name,
                                                            demandCount: 1,
                                                            status: 'pending',
                                                            addedAt: new Date().toISOString(),
                                                            lastRequested: new Date().toISOString(),
                                                            notes: 'Added from POS'
                                                        };
                                                        dispatch(addToShortage(shortageItem));
                                                        if (navigator.onLine) {
                                                            setDoc(doc(db, "shortage", shortageItem.id.toString()), shortageItem);
                                                        }
                                                        toast.success('Marked in Shortage Book');
                                                    }}
                                                    style={{ margin: '0 15px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '6px 12px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer' }}
                                                >
                                                    SHORT?
                                                </button>
                                            </div>
                                        ))}
                                        {filteredInventory.length === 0 && (
                                            <div style={{ padding: '30px', textAlign: 'center' }}>
                                                <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 700, marginBottom: '15px' }}>Not in inventory?</p>
                                                <button 
                                                    onClick={() => {
                                                        const newShortage = {
                                                            id: Date.now(),
                                                            name: searchTerm,
                                                            demandCount: 1,
                                                            status: 'pending',
                                                            addedAt: new Date().toISOString(),
                                                            lastRequested: new Date().toISOString(),
                                                            notes: 'Added from POS'
                                                        };
                                                        dispatch(addToShortage(newShortage));
                                                        if (navigator.onLine) {
                                                            setDoc(doc(db, "shortage", newShortage.id.toString()), newShortage);
                                                        }
                                                        toast.success(`"${searchTerm}" added to Shortage Book`);
                                                        setSearchTerm('');
                                                    }}
                                                    style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                                                >
                                                    <Plus size={16} /> ADD TO SHORTAGE BOOK
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ITEM TABLE */}
                        <div style={{ background: 'white', overflowY: 'auto', position: 'relative', flex: 1 }}>
                            {/* PERSISTENT WATERMARK LOGO (Fix Background) */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.08, pointerEvents: 'none', zIndex: 0 }}>
                                <img src={logo} alt="" style={{ height: '400px', objectFit: 'contain', marginTop: '100px' }} />
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', position: 'relative', zIndex: 1 }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#065f46', color: 'white', fontSize: '0.75rem', fontWeight: 900, textAlign: 'left' }}>
                                    <tr>
                                        <th style={{ padding: '12px 20px' }}>MEDICINE NAME / FORMULA</th>
                                        <th style={{ padding: '12px 20px', width: '100px' }}>PRICE</th>
                                        <th style={{ padding: '12px 20px', width: '150px' }}>QTY</th>
                                        <th style={{ padding: '12px 20px', width: '100px' }}>DISC</th>
                                        <th style={{ padding: '12px 20px', width: '120px', textAlign: 'right' }}>NET Rs</th>
                                        <th style={{ padding: '12px 20px', width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.name}
                                                    {item.quantity > (inventory.find(i => i.id === item.id)?.stock || 0) && (
                                                        <span style={{ fontSize: '0.6rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>EXT. SOURCE</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>{item.category} | Stock: {inventory.find(i => i.id === item.id)?.stock || 0}</div>

                                                {item.quantity > (inventory.find(i => i.id === item.id)?.stock || 0) && (
                                                    <div style={{ marginTop: '8px' }}>
                                                        <input
                                                            placeholder="Where did you get this? (e.g. Special Order)"
                                                            style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', border: '1px solid #f59e0b', borderRadius: '4px', background: '#fffbeb' }}
                                                            value={item.reason || ''}
                                                            onChange={(e) => updateCartItem(item.id, 'reason', e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '15px 20px', fontWeight: 700 }}>{isDoctorMode ? (item.doctorPrice || item.price) : item.price}</td>
                                            <td style={{ padding: '15px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <button onClick={() => updateCartItem(item.id, 'quantity', Math.max(1, item.quantity - 1))} style={{ width: '30px', height: '30px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 900 }}>-</button>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="qty-input-no-spin"
                                                        value={item.quantity}
                                                        onChange={(e) => updateCartItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                        style={{ width: '80px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 900, fontSize: '1rem', background: '#fff' }}
                                                    />
                                                    <button onClick={() => updateCartItem(item.id, 'quantity', item.quantity + 1)} style={{ width: '30px', height: '30px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 900 }}>+</button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px 20px' }}>
                                                <input
                                                    type="number"
                                                    value={item.discount || 0}
                                                    onChange={(e) => updateCartItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                    style={{ width: '70px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 800 }}
                                                />
                                            </td>
                                            <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', color: '#065f46' }}>Rs {((isDoctorMode ? (item.doctorPrice || item.price) : item.price) * item.quantity - (item.discount || 0)).toLocaleString()}</td>
                                            <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                                <button onClick={() => removeFromCart(item.id)} style={{ color: '#ecfdf5', border: 'none', background: '#fee2e2', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} color="#ef4444" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {cart.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '150px 20px' }}>
                                                {/* (No content needed here as watermark is behind) */}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* MIDDLE FOOTER */}
                        <div style={{ background: '#f8fafc', padding: '12px 20px', borderTop: '2px solid #e2e8f0', display: 'flex', gap: '15px' }}>
                            <button onClick={handleParkBill} style={{ padding: '10px 20px', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Pause size={16} /> HOLD BILL
                            </button>
                            <button onClick={() => setShowParkedList(true)} style={{ padding: '10px 20px', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Play size={16} /> RECALL ({parkedBills.length})
                            </button>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '30px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>ITEMS: {cart.length}</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>TOTAL QTY: {cart.reduce((acc, c) => acc + c.quantity, 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: SETTLEMENT PANEL */}
                    <div style={{ background: 'white', borderLeft: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                        {/* COMPACT HEADER WITH PATIENT ICON */}
                        <div style={{ padding: '12px 20px', background: '#ecfdf5', borderBottom: '1px solid #d1fae5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => setShowCustomerSearch(true)}
                                    style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                    title="Select Patient (F2)"
                                >
                                    <UserPlus size={22} />
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#065f46' }}>PATIENT ACCOUNT</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#065f46' }}>
                                        {selectedCustomer ? selectedCustomer.name.toUpperCase() : 'WALKING PATIENT'}
                                    </span>
                                </div>
                            </div>
                            {selectedCustomer && (
                                <button onClick={() => setSelectedCustomer(null)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* DOCTOR MODE TOGGLE */}
                        <div style={{ padding: '10px 20px', background: isDoctorMode ? '#6366f1' : '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isDoctorMode ? 'white' : '#64748b' }}>APPLY DOCTOR PRICES?</span>
                            <div 
                                onClick={() => setIsDoctorMode(!isDoctorMode)}
                                style={{ 
                                    width: '50px', 
                                    height: '24px', 
                                    background: isDoctorMode ? '#4338ca' : '#cbd5e1', 
                                    borderRadius: '12px', 
                                    position: 'relative', 
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <div style={{ 
                                    width: '20px', 
                                    height: '20px', 
                                    background: 'white', 
                                    borderRadius: '50%', 
                                    position: 'absolute', 
                                    top: '2px', 
                                    left: isDoctorMode ? '28px' : '2px',
                                    transition: 'all 0.3s'
                                }}></div>
                            </div>
                        </div>

                        {/* FINANCIAL SUMMARY */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '15px 20px' }}>

                            {/* DROPDOWN BREAKDOWN */}
                            <div style={{ marginBottom: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <button
                                    onClick={() => setShowBreakdown(!showBreakdown)}
                                    style={{ width: '100%', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, color: '#475569', fontSize: '0.75rem' }}
                                >
                                    VIEW BILL BREAKDOWN {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {showBreakdown && (
                                    <div style={{ padding: '0 15px 12px 15px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <span style={{ fontWeight: 700, color: '#64748b' }}>TOTAL BILL</span>
                                            <span style={{ fontWeight: 800, color: '#1e293b' }}>Rs {subtotal.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <span style={{ fontWeight: 700, color: '#64748b' }}>TOTAL DISCOUNT</span>
                                            <span style={{ fontWeight: 800, color: '#ef4444' }}>- Rs {(itemDiscounts + globalDiscount).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <span style={{ fontWeight: 700, color: '#64748b' }}>TAX / GST Amount</span>
                                            <span style={{ fontWeight: 800, color: tax > 0 ? '#059669' : '#94a3b8' }}>+ Rs {tax.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* BIG TOTAL BOX */}
                            <div style={{ padding: '20px', background: '#064e3b', borderRadius: '12px', color: 'white', textAlign: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '5px', letterSpacing: '1px' }}>FINAL AMOUNT TO PAY</p>
                                <h1 style={{ fontSize: '2.5rem', fontWeight: 950, margin: 0 }}>Rs {Math.round(finalTotal).toLocaleString()}</h1>
                                <p style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.8, marginTop: '5px' }}>{tax > 0 ? 'Tax included' : 'No Tax added'}</p>
                            </div>

                            {/* PAYMENT METHODS */}
                            <div style={{ marginTop: '20px' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Banknote size={14} /> HOW IS PATIENT PAYING?
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '15px' }}>
                                    <button onClick={() => setPaymentMethod('Cash')} style={{ padding: '12px 5px', border: paymentMethod === 'Cash' ? '2px solid #10b981' : '1px solid #e2e8f0', background: paymentMethod === 'Cash' ? '#ecfdf5' : 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }}>
                                        <Banknote size={20} color={paymentMethod === 'Cash' ? '#10b981' : '#94a3b8'} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>CASH</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('Card')} style={{ padding: '12px 5px', border: paymentMethod === 'Card' ? '2px solid #10b981' : '1px solid #e2e8f0', background: paymentMethod === 'Card' ? '#ecfdf5' : 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }}>
                                        <CreditCard size={20} color={paymentMethod === 'Card' ? '#10b981' : '#94a3b8'} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>CARD</span>
                                    </button>
                                    <button onClick={() => setPaymentMethod('Credit')} style={{ padding: '12px 5px', border: paymentMethod === 'Credit' ? '2px solid #10b981' : '1px solid #e2e8f0', background: paymentMethod === 'Credit' ? '#ecfdf5' : 'white', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }}>
                                        <UserPlus size={20} color={paymentMethod === 'Credit' ? '#10b981' : '#94a3b8'} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>KHATTA</span>
                                    </button>
                                </div>

                                {paymentMethod === 'Cash' && (
                                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>CASH GIVEN BY PATIENT (Rs)</label>
                                        <input
                                            ref={cashInputRef}
                                            type="number"
                                            placeholder="Enter amount"
                                            style={{ width: '100%', padding: '10px', fontSize: '1.5rem', fontWeight: 950, textAlign: 'center', background: 'white', border: '2px solid #10b981', borderRadius: '6px' }}
                                            value={cashReceived}
                                            onChange={(e) => setCashReceived(e.target.value)}
                                        />
                                        {cashReceived && (
                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: changeAmount >= 0 ? '#d1fae5' : '#fee2e2', borderRadius: '6px' }}>
                                                <span style={{ fontWeight: 900, color: changeAmount >= 0 ? '#065f46' : '#991b1b', fontSize: '0.8rem' }}>{changeAmount >= 0 ? 'RETURN BACK:' : 'LACKING:'}</span>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 950, color: changeAmount >= 0 ? '#065f46' : '#991b1b' }}>Rs {Math.abs(Math.round(changeAmount)).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FINAL ACTION */}
                        <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', background: 'white' }}>
                            <button onClick={handleCheckout} style={{ width: '100%', padding: '18px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 950, cursor: 'pointer', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <Printer size={22} /> PRINT BILL & FINISH
                            </button>
                        </div>
                    </div>
                </div>

                {/* PARKED BILLS MODAL */}
                {showParkedList && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', width: '650px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ background: '#064e3b', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>RECALL HELD TRANSACTIONS</h3>
                                <button onClick={() => setShowParkedList(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                {parkedBills.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '80px', color: '#cbd5e1' }}>
                                        <Pause size={60} style={{ opacity: 0.1, marginBottom: '10px' }} />
                                        <p style={{ fontWeight: 800 }}>No bills on hold.</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        {parkedBills.map(bill => (
                                            <div key={bill.id} onClick={() => restoreParked(bill)} style={{ border: '2px solid #e2e8f0', padding: '20px', borderRadius: '10px', cursor: 'pointer', background: '#f8fafc' }} onMouseOver={e => e.currentTarget.style.borderColor = '#10b981'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                                                <div style={{ fontWeight: 900, color: '#065f46' }}>{bill.selectedCustomer ? bill.selectedCustomer.name.toUpperCase() : 'WALK-IN (CASH)'}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginTop: '8px' }}>{bill.cart.length} Medicines | Held: {bill.time}</div>
                                                <div style={{ marginTop: '15px', color: '#059669', fontWeight: 900, fontSize: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>RECALL NOW →</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* CUSTOMER SEARCH MODAL */}
                {showCustomerSearch && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'white', width: '550px', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ background: '#064e3b', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>PATIENT REGISTRY SEARCH</h3>
                                <button onClick={() => setShowCustomerSearch(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <div style={{ position: 'relative', marginBottom: '20px' }}>
                                    <Search size={20} style={{ position: 'absolute', left: '15px', top: '15px', color: '#94a3b8' }} />
                                    <input autoFocus placeholder="Search by Patient Name, ID or Mobile..." style={{ width: '100%', padding: '15px 15px 15px 50px', borderRadius: '8px', border: '2px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 700 }} />
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                    {customers.map(c => (
                                        <div key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); }} style={{ padding: '20px', border: '1px solid #f1f5f9', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc' }} onMouseOver={e => e.currentTarget.style.borderColor = '#10b981'} onMouseOut={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#065f46' }}>{c.name.toUpperCase()}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>A/C ID: {c.id} | PH: {c.phone}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>DUE BALANCE</div>
                                                    <div style={{ fontWeight: 900, color: '#ef4444' }}>Rs {c.balance.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}




                <CheckoutSuccessModal
                    checkoutStage={checkoutStage}
                    lastSale={lastSale}
                    logo={logo}
                    resetPOS={resetPOS}
                />
            </div>

            <ThermalReceipt
                lastSale={lastSale}
                activeShift={activeShift}
                logo={logo}
            />
        </>
    );
};

export default POS;
