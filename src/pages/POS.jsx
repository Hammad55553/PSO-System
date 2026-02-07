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
    Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addSale } from '../store/slices/salesSlice';
import { updateStock } from '../store/slices/inventorySlice';
import { updateShiftStats } from '../store/slices/shiftSlice';
import { updateBalance } from '../store/slices/customerSlice';
import toast from 'react-hot-toast';

import { db } from '../firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

const POS = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const inventory = useSelector(state => state.inventory.items);
    const activeShift = useSelector(state => state.shift.activeShift);
    const customers = useSelector(state => state.customers.list);

    const [cart, setCart] = useState([]);
    const [parkedBills, setParkedBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [cashReceived, setCashReceived] = useState('');
    const [globalDiscount, setGlobalDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [lastSale, setLastSale] = useState(null);

    // UI States
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [showParkedList, setShowParkedList] = useState(false);

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

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCat;
    });

    const addToCart = (product) => {
        if (product.stock <= 0) {
            toast.error('Out of Stock!');
            return;
        }
        const existing = cart.find(c => c.id === product.id);
        if (existing) {
            setCart(cart.map(c => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([{ ...product, quantity: 1, discount: 0 }, ...cart]);
        }
        setSearchTerm('');
        searchInputRef.current?.focus();
    };

    const updateCartItem = (id, field, value) => {
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
    const subtotal = cart.reduce((acc, c) => acc + (c.price * c.quantity), 0);
    const itemDiscounts = cart.reduce((acc, c) => acc + (c.discount || 0), 0);
    const tax = (subtotal - itemDiscounts - globalDiscount) * 0.17;
    const finalTotal = subtotal - itemDiscounts - globalDiscount + tax;
    const changeAmount = cashReceived ? parseFloat(cashReceived) - finalTotal : 0;

    const handleCheckout = () => {
        if (!activeShift) return;
        if (cart.length === 0) { toast.error('Add items first!'); return; }
        if (paymentMethod === 'Credit' && !selectedCustomer) { toast.error('Select an Account!'); return; }

        const saleData = {
            id: `INV-${Date.now().toString().slice(-6)}`,
            customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in',
            customerId: selectedCustomer?.id,
            items: cart,
            total: finalTotal,
            subtotal,
            tax,
            discount: itemDiscounts + globalDiscount,
            paymentMethod,
            date: new Date().toISOString(),
            status: paymentMethod === 'Credit' ? 'Khatta' : 'Paid',
            shiftId: activeShift.id
        };

        cart.forEach(item => dispatch(updateStock({ id: item.id, quantity: item.quantity, mode: 'remove' })));
        dispatch(updateShiftStats({ sale: finalTotal }));
        if (paymentMethod === 'Credit') {
            dispatch(updateBalance({ id: selectedCustomer.id, amount: finalTotal, type: 'credit', note: `Bill ${saleData.id}` }));
        }
        dispatch(addSale(saleData));
        setLastSale({ ...saleData, cashReceived, changeAmount, date: new Date().toLocaleString() });

        // CLOUD SYNC IF ONLINE
        if (navigator.onLine) {
            try {
                addDoc(collection(db, "sales"), saleData);

                // If it's a credit sale, update the customer balance in Cloud too
                if (paymentMethod === 'Credit' && selectedCustomer) {
                    const updatedCust = {
                        ...selectedCustomer,
                        balance: (selectedCustomer.balance || 0) + finalTotal,
                        history: [
                            { date: new Date().toISOString(), amount: finalTotal, type: 'credit', note: `Bill ${saleData.id}` },
                            ...(selectedCustomer.history || [])
                        ]
                    };
                    setDoc(doc(db, "customers", selectedCustomer.id), updatedCust);
                }

                // Update Stocks in Cloud
                cart.forEach(item => {
                    const newStock = item.stock - item.quantity;
                    setDoc(doc(db, "inventory", item.id), { stock: newStock }, { merge: true });
                });

                // Update Active Shift in Cloud
                if (activeShift) {
                    const updatedShift = {
                        ...activeShift,
                        sales: (activeShift.sales || 0) + finalTotal
                    };
                    setDoc(doc(db, "shifts", activeShift.id), updatedShift, { merge: true });
                }

            } catch (err) {
                console.error("Cloud Sync Failed:", err);
            }
        }

        dispatch(updateShiftStats({ sale: finalTotal }));
        toast.success('Transaction Completed');
        setTimeout(() => {
            window.print();
            setCart([]);
            setSearchTerm('');
            setSelectedCustomer(null);
            setCashReceived('');
            setGlobalDiscount(0);
            setPaymentMethod('Cash');
            setTimeout(() => setLastSale(null), 1000);
        }, 100);
    };

    if (!activeShift) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f1f5f9' }}>
                <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <div style={{ width: '70px', height: '70px', background: '#fee2e2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Box size={35} color="#dc2626" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b' }}>TERMINAL CLOSED</h2>
                    <p style={{ color: '#64748b', marginTop: '10px', maxWidth: '300px' }}>Operational session is not active. Please start a shift to begin billing.</p>
                    <button onClick={() => navigate('/shift')} style={{ marginTop: '30px', width: '100%', padding: '15px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>INITIALIZE SHIFT</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateRows: '50px 1fr', height: '100%', background: '#e2e8f0', overflow: 'hidden' }}>

            {/* 1. TOP ERP BAR */}
            <header style={{ background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'var(--primary)', padding: '4px', borderRadius: '4px' }}><Zap size={18} color="white" /></div>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.5px' }}>BILAL VET SYSTEM <small style={{ color: 'var(--primary)', fontWeight: 700 }}>PRO</small></span>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '25px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                        <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></div>
                        SHIFT ACTIVE: {new Date(activeShift.startTime).toLocaleTimeString()}
                    </div>
                    <div style={{ height: '20px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8' }}>TERMINAL: #01-LHR</span>
                </div>
            </header>

            {/* 2. OPERATIONAL GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 350px', gap: '2px', padding: '2px', overflow: 'hidden' }}>

                {/* LEFT SIDEBAR: CATEGORIES & QUICK ACCESS */}
                <div style={{ background: 'white', display: 'flex', flexDirection: 'column', gap: '1px', background: '#e2e8f0' }}>
                    <div style={{ background: '#334155', color: 'white', padding: '12px 15px', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LayoutGrid size={14} /> CATEGORIES
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
                                    background: selectedCategory === cat ? '#f0f9ff' : 'transparent',
                                    color: selectedCategory === cat ? 'var(--primary)' : '#475569',
                                    textAlign: 'left',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    borderLeft: selectedCategory === cat ? '4px solid var(--primary)' : '4px solid transparent'
                                }}
                            >
                                {cat.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <div style={{ background: '#1e293b', padding: '15px', color: 'white' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#38bdf8', marginBottom: '10px' }}>QUICK SHORTCUTS</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.65rem', fontWeight: 700 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F1:</span> <span>Search</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F2:</span> <span>Customer</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F10:</span> <span>Finish</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F4:</span> <span>Park Bill</span></div>
                        </div>
                    </div>
                </div>

                {/* MIDDLE: SEARCH & ITEM LIST */}
                <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '1px', background: '#e2e8f0', overflow: 'hidden' }}>

                    {/* SEARCH HEADER */}
                    <div style={{ background: 'white', padding: '15px', display: 'flex', gap: '10px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={20} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--primary)' }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="F1: TYPE PRODUCT NAME OR SCAN BARCODE..."
                                style={{ width: '100%', padding: '15px 15px 15px 50px', fontSize: '1.1rem', fontWeight: 800, border: '2px solid #e2e8f0', borderRadius: '6px', outline: 'none' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 100, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', borderRadius: '0 0 6px 6px' }}>
                                    {filteredInventory.map(item => (
                                        <div key={item.id} onClick={() => addToCart(item)} style={{ padding: '15px 20px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</span>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Stock: {item.stock} | Cat: {item.category}</span>
                                            </div>
                                            <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.2rem' }}>Rs {item.price}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ITEM TABLE */}
                    <div style={{ background: 'white', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#334155', color: 'white', fontSize: '0.75rem', fontWeight: 900, textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '12px 20px' }}># ITEM DESCRIPTION</th>
                                    <th style={{ padding: '12px 20px', width: '100px' }}>PRICE</th>
                                    <th style={{ padding: '12px 20px', width: '150px' }}>QUANTITY</th>
                                    <th style={{ padding: '12px 20px', width: '100px' }}>DISC</th>
                                    <th style={{ padding: '12px 20px', width: '120px', textAlign: 'right' }}>NET AMT</th>
                                    <th style={{ padding: '12px 20px', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cart.map((item, idx) => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '15px 20px' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>SKU: {item.id}</div>
                                        </td>
                                        <td style={{ padding: '15px 20px', fontWeight: 700 }}>{item.price}</td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button onClick={() => updateCartItem(item.id, 'quantity', Math.max(1, item.quantity - 1))} style={{ width: '30px', height: '30px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontWeight: 900 }}>-</button>
                                                <span style={{ width: '30px', textAlign: 'center', fontWeight: 900, fontSize: '1rem' }}>{item.quantity}</span>
                                                <button onClick={() => updateCartItem(item.id, 'quantity', item.quantity + 1)} style={{ width: '30px', height: '30px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontWeight: 900 }}>+</button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <input
                                                type="number"
                                                value={item.discount || 0}
                                                onChange={(e) => updateCartItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                style={{ width: '70px', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', textAlign: 'center', fontWeight: 800 }}
                                            />
                                        </td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem' }}>Rs {(item.price * item.quantity - (item.discount || 0)).toLocaleString()}</td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                            <button onClick={() => removeFromCart(item.id)} style={{ color: '#cbd5e1', border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {cart.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: '#cbd5e1' }}>
                                            <ShoppingCart size={80} style={{ opacity: 0.1, marginBottom: '20px' }} />
                                            <p style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '1px' }}>READY FOR NEW BILL</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* MIDDLE FOOTER */}
                    <div style={{ background: '#f8fafc', padding: '12px 20px', borderTop: '2px solid #e2e8f0', display: 'flex', gap: '15px' }}>
                        <button onClick={handleParkBill} style={{ padding: '10px 20px', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Pause size={16} /> F4: PARK BILL
                        </button>
                        <button onClick={() => setShowParkedList(true)} style={{ padding: '10px 20px', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Play size={16} /> RECALL ({parkedBills.length})
                        </button>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '30px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>ITEMS: {cart.length}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e293b' }}>UNITS: {cart.reduce((acc, c) => acc + c.quantity, 0)}</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT: SETTLEMENT PANEL */}
                <div style={{ background: 'white', borderLeft: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

                    {/* CUSTOMER SELECTION */}
                    <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '5px' }}>CLIENT / KHATTA ACCOUNT (F2)</label>
                        <button onClick={() => setShowCustomerSearch(true)} style={{ width: '100%', padding: '10px', border: '2px solid #e2e8f0', borderRadius: '6px', background: 'white', textAlign: 'left', fontWeight: 800, color: selectedCustomer ? '#1e3a8a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <User size={16} />
                            <span style={{ fontSize: '0.8rem' }}>{selectedCustomer ? selectedCustomer.name.toUpperCase() : 'SEARCH CLIENT...'}</span>
                            {selectedCustomer && <X size={14} style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); setSelectedCustomer(null); }} />}
                        </button>
                    </div>

                    {/* FINANCIAL SUMMARY */}
                    <div style={{ padding: '15px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>GROSS TOTAL:</span>
                            <span style={{ fontWeight: 800 }}>Rs {subtotal.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>ITEM DISCOUNTS:</span>
                            <span style={{ fontWeight: 800, color: '#ef4444' }}>- Rs {itemDiscounts.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>GLOBAL DISC:</span>
                            <input
                                type="number"
                                value={globalDiscount}
                                onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                                style={{ width: '80px', padding: '5px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'right', fontWeight: 900, background: '#fffbeb' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>GST (17%):</span>
                            <span style={{ fontWeight: 800 }}>Rs {tax.toFixed(0)}</span>
                        </div>

                        <div style={{ margin: '10px 0', padding: '12px', background: '#0f172a', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', marginBottom: '2px' }}>GRAND TOTAL (NET)</p>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: 950 }}>Rs {Math.round(finalTotal).toLocaleString()}</h1>
                        </div>

                        {/* PAYMENT METHODS */}
                        <div>
                            <p style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', marginBottom: '8px' }}>PAYMENT METHOD</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                                <button onClick={() => setPaymentMethod('Cash')} style={{ padding: '10px 5px', border: paymentMethod === 'Cash' ? '2px solid var(--primary)' : '1px solid #cbd5e1', background: paymentMethod === 'Cash' ? '#eff6ff' : 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <Banknote size={16} color={paymentMethod === 'Cash' ? 'var(--primary)' : '#64748b'} />
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>CASH</span>
                                </button>
                                <button onClick={() => setPaymentMethod('Card')} style={{ padding: '10px 5px', border: paymentMethod === 'Card' ? '2px solid var(--primary)' : '1px solid #cbd5e1', background: paymentMethod === 'Card' ? '#eff6ff' : 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <CreditCard size={16} color={paymentMethod === 'Card' ? 'var(--primary)' : '#64748b'} />
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>CARD</span>
                                </button>
                                <button onClick={() => setPaymentMethod('Credit')} style={{ padding: '10px 5px', border: paymentMethod === 'Credit' ? '2px solid var(--primary)' : '1px solid #cbd5e1', background: paymentMethod === 'Credit' ? '#eff6ff' : 'white', borderRadius: '6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                    <UserPlus size={16} color={paymentMethod === 'Credit' ? 'var(--primary)' : '#64748b'} />
                                    <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>KHATTA</span>
                                </button>
                            </div>

                            {paymentMethod === 'Cash' && (
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '5px' }}>CASH RECEIVED (F9)</label>
                                    <input
                                        ref={cashInputRef}
                                        type="number"
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '8px', fontSize: '1.4rem', fontWeight: 950, textAlign: 'center', background: 'white', border: '2px solid var(--primary)', borderRadius: '6px' }}
                                        value={cashReceived}
                                        onChange={(e) => setCashReceived(e.target.value)}
                                    />
                                    {cashReceived && (
                                        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: changeAmount >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: '4px' }}>
                                            <span style={{ fontWeight: 900, color: changeAmount >= 0 ? '#166534' : '#991b1b', fontSize: '0.75rem' }}>{changeAmount >= 0 ? 'CHANGE:' : 'DUE:'}</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: 950, color: changeAmount >= 0 ? '#166534' : '#991b1b' }}>Rs {Math.abs(Math.round(changeAmount)).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* FINAL ACTION */}
                        <button onClick={handleCheckout} style={{ marginTop: 'auto', width: '100%', padding: '15px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 950, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                            <Printer size={20} /> FINISH & PRINT (F10)
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. STATUS BAR REMOVED */}

            {/* CUSTOMER SEARCH MODAL */}
            {showCustomerSearch && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '550px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <div style={{ background: '#1e293b', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>CLIENT ACCOUNT REGISTRY</h3>
                            <button onClick={() => setShowCustomerSearch(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <div style={{ position: 'relative', marginBottom: '20px' }}>
                                <Search size={20} style={{ position: 'absolute', left: '15px', top: '15px', color: '#94a3b8' }} />
                                <input autoFocus placeholder="Search by Client Name or Account ID..." style={{ width: '100%', padding: '15px 15px 15px 50px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 700 }} />
                            </div>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                {customers.map(c => (
                                    <div key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); }} style={{ padding: '20px', border: '1px solid #f1f5f9', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = '#f1f5f9'}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#1e3a8a' }}>{c.name.toUpperCase()}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>A/C ID: {c.id} | PH: {c.phone}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#94a3b8' }}>BALANCE DUE</div>
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

            {/* PARKED BILLS MODAL */}
            {showParkedList && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '650px', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ background: '#1e293b', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>PARKED BILLS (BILL-HOLD)</h3>
                            <button onClick={() => setShowParkedList(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            {parkedBills.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '80px', color: '#cbd5e1' }}>
                                    <Pause size={60} style={{ opacity: 0.1, marginBottom: '10px' }} />
                                    <p style={{ fontWeight: 800 }}>Queue is empty.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {parkedBills.map(bill => (
                                        <div key={bill.id} onClick={() => restoreParked(bill)} style={{ border: '2px solid #e2e8f0', padding: '20px', borderRadius: '10px', cursor: 'pointer', background: '#f8fafc' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                                            <div style={{ fontWeight: 900, color: '#1e3a8a' }}>{bill.selectedCustomer ? bill.selectedCustomer.name.toUpperCase() : 'WALK-IN (CASH)'}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, marginTop: '8px' }}>{bill.cart.length} Items | Hold at {bill.time}</div>
                                            <div style={{ marginTop: '15px', color: 'var(--primary)', fontWeight: 900, fontSize: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>Recall Transaction →</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PROFESSIONAL THERMAL SLIP (80mm) */}
            {lastSale && (
                <div className="print-only receipt-thermal-terminal" style={{
                    width: '80mm',
                    padding: '4mm',
                    background: 'white',
                    fontFamily: '"Courier New", Courier, monospace',
                    color: 'black',
                    lineHeight: '1.2'
                }}>
                    {/* CLINIC HEADER */}
                    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                        <h1 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '900', letterSpacing: '-1px' }}>BILAL VET CLINIC</h1>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>Samanabad Main Road, Lahore</p>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>Contact: 0300-4567890</p>
                        <div style={{ margin: '8px 0', borderBottom: '2px solid black' }}></div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>*** SALE INVOICE ***</p>
                    </div>

                    {/* TRANSACTION INFO */}
                    <div style={{ fontSize: '11px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Invoice: <strong>#{lastSale.id}</strong></span>
                            <span>Date: {lastSale.date.split(',')[0]}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Terminal: VET-01</span>
                            <span>Time: {lastSale.date.split(',')[1]}</span>
                        </div>
                        <div style={{ marginTop: '4px', borderTop: '1px dashed #000', paddingTop: '4px' }}>
                            <span>Customer: <strong>{lastSale.customerName.toUpperCase()}</strong></span>
                        </div>
                    </div>

                    {/* ITEM TABLE */}
                    <div style={{ borderBottom: '1px solid black', borderTop: '1px solid black', padding: '4px 0', marginBottom: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 50px 60px', fontSize: '11px', fontWeight: 'bold' }}>
                            <span>ITEM</span>
                            <span style={{ textAlign: 'center' }}>QTY</span>
                            <span style={{ textAlign: 'right' }}>RATE</span>
                            <span style={{ textAlign: 'right' }}>TOTAL</span>
                        </div>
                    </div>

                    <div style={{ minHeight: '40px' }}>
                        {lastSale.items.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: '6px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{item.name}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 50px 60px', fontSize: '11px' }}>
                                    <span>{item.category}</span>
                                    <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                                    <span style={{ textAlign: 'right' }}>{item.price.toFixed(0)}</span>
                                    <span style={{ textAlign: 'right' }}>{(item.price * item.quantity).toFixed(0)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* TOTALS SECTION */}
                    <div style={{ borderTop: '2px solid black', marginTop: '10px', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span>Sub Total:</span>
                            <span>Rs {lastSale.subtotal.toFixed(0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span>Discount:</span>
                            <span>- Rs {lastSale.discount.toFixed(0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                            <span>GST (Tax):</span>
                            <span>Rs {lastSale.tax.toFixed(0)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '900', borderTop: '1px dashed black', paddingTop: '6px', marginTop: '4px' }}>
                            <span>NET PAYABLE:</span>
                            <span>Rs {Math.round(lastSale.total).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* PAYMENT DETAILS */}
                    <div style={{ marginTop: '10px', fontSize: '11px', background: '#f0f0f0', padding: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Payment Mode:</span>
                            <span><strong>{lastSale.paymentMethod.toUpperCase()}</strong></span>
                        </div>
                        {lastSale.paymentMethod === 'Cash' && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Cash Tendered:</span>
                                    <span>Rs {parseFloat(lastSale.cashReceived || 0).toFixed(0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                                    <span>Change Returned:</span>
                                    <span>Rs {Math.max(0, lastSale.changeAmount).toFixed(0)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', borderTop: '1px solid black', paddingTop: '10px' }}>
                        <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>*** THANK YOU FOR SHOPPING! ***</p>
                        <p style={{ margin: 0 }}>VET SMART ERP - POWERED BY LUMENSOFT</p>
                        <p style={{ margin: 0 }}>Design Inspired by Candela PMS</p>
                        <div style={{ marginTop: '10px' }}>
                            <div style={{ height: '30px', border: '1px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontSize: '12px', fontWeight: 900 }}>
                                * {lastSale.id} *
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;
