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
    CheckCircle,
    Wallet,
    RefreshCw,
    Hash,
    Wifi,
    WifiOff
} from 'lucide-react';
import { addToSyncQueue } from '../utils/offlineSync';
import { useNavigate } from 'react-router-dom';
import { addSale } from '../store/slices/salesSlice';
import { updateStock, setInventory } from '../store/slices/inventorySlice';
import { updateShiftStats } from '../store/slices/shiftSlice';
import { updateBalance } from '../store/slices/customerSlice';
import { addToShortage } from '../store/slices/shortageSlice';
import toast from 'react-hot-toast';
import doneSound from '../assets/Done.ogg';

import { supabase } from '../supabase';


import logo from '../assets/Bila_vet.png';
import jazzcashLogo from '../assets/jazzcash.webp';
import easypaisaLogo from '../assets/Easypaisa.jpg';
import ThermalReceipt from '../components/ThermalReceipt';
import CheckoutSuccessModal from '../components/CheckoutSuccessModal';
import { openCalculator, closeCalculator } from '../store/slices/uiSlice';

const POS = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const inventory = useSelector(state => state.inventory.items);
    const activeShift = useSelector(state => state.shift.activeShift);
    const customers = useSelector(state => state.customers.list);
    const user = useSelector(state => state.auth.user);

    const playDone = () => {
        try {
            const audio = new Audio(doneSound);
            audio.play().catch(e => console.log("Audio blocked"));
        } catch (e) { console.error(e); }
    };

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
    const [walkingCustomerName, setWalkingCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [onlineProvider, setOnlineProvider] = useState('JazzCash');
    const [onlineAccount, setOnlineAccount] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [manualAdjustment, setManualAdjustment] = useState(0);

    // UI States
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [showParkedList, setShowParkedList] = useState(false);
    const [showBreakdown, setShowBreakdown] = useState(false);
    const [checkoutStage, setCheckoutStage] = useState('idle'); // idle, printed, reporting
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingPrint, setPendingPrint] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [mobileTab, setMobileTab] = useState('browse'); // browse, cart
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('resize', handleResize);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);


    const searchInputRef = useRef(null);
    const cashInputRef = useRef(null);

    const categories = ['All', ...new Set(inventory.map(i => i.category))];

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F1') { e.preventDefault(); searchInputRef.current?.focus(); }
            if (e.key === 'F2') { e.preventDefault(); setShowCustomerSearch(true); }
            if (e.key === 'F3') { e.preventDefault(); dispatch(openCalculator()); }
            if (e.key === 'F10') { e.preventDefault(); { setPendingPrint(true); setShowConfirm(true); } }
            if (e.key === 'F9') { e.preventDefault(); { setPendingPrint(false); setShowConfirm(true); } }
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

    // GHOST AUTOCOMPLETE LOGIC
    useEffect(() => {
        if (searchTerm && searchTerm.length >= 2) {
            const match = inventory.find(i =>
                i.name.toLowerCase().startsWith(searchTerm.toLowerCase())
            );
            if (match) {
                setSuggestion(match.name);
            } else {
                setSuggestion('');
            }
        } else {
            setSuggestion('');
        }
    }, [searchTerm, inventory]);

    const filteredInventory = inventory.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.barcode && item.barcode.includes(searchTerm)) ||
            (item.manufacturer && item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.batch_no && item.batch_no.toLowerCase().includes(searchTerm.toLowerCase()));
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
            const initialPrice = isDoctorMode ? (product.doctor_price || product.price) : product.price;
            setCart([{ ...product, quantity: 1, discount: 0, reason: '', custom_price: initialPrice }, ...cart]);
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
        const itemPrice = c.custom_price !== undefined ? c.custom_price : (isDoctorMode ? (c.doctor_price || c.price) : c.price);
        return acc + (itemPrice * c.quantity);
    }, 0);
    const itemDiscounts = cart.reduce((acc, c) => acc + (c.discount || 0), 0);

    // ITEM-BASED TAX CALCULATION (Default 0% unless set in Inventory)
    const tax = cart.reduce((acc, c) => {
        const itemPrice = c.custom_price !== undefined ? c.custom_price : (isDoctorMode ? (c.doctor_price || c.price) : c.price);
        const taxableAmount = (itemPrice * c.quantity) - (c.discount || 0);
        const itemTax = taxableAmount * (c.tax_percent || 0) / 100;
        return acc + itemTax;
    }, 0);

    const finalTotal = subtotal - itemDiscounts - globalDiscount + tax + manualAdjustment;
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
        setWalkingCustomerName('');
        setCustomerPhone('');
        setOnlineAccount('');
        setOnlineProvider('JazzCash');
        setManualAdjustment(0);
    };

    const handleCheckout = async (shouldPrint = true) => {
        if (!activeShift || isCheckingOut) return;

        if (cart.length === 0) { toast.error('Add items first!'); return; }
        if (paymentMethod === 'Credit' && !selectedCustomer) { toast.error('Select an Account!'); return; }

        // STOCK GUARD: block accidental over-selling. Selling more than the
        // available stock is only allowed when the line has an external-sourcing
        // `reason` (item brought in from outside). Without a reason, a quantity
        // above stock would push inventory negative — stop and warn instead.
        const overSold = cart.find(c => {
            const inv = inventory.find(i => i.id === c.id);
            const available = inv ? (inv.stock || 0) : 0;
            return !c.reason && c.quantity > available;
        });
        if (overSold) {
            const inv = inventory.find(i => i.id === overSold.id);
            toast.error(`Not enough stock for "${overSold.name}" (have ${inv?.stock || 0}, need ${overSold.quantity}). Add a sourcing reason to sell beyond stock.`);
            return;
        }

        // ONLINE & CARD VALIDATION
        if ((paymentMethod === 'Online' || paymentMethod === 'Card') && !customerPhone) {
            toast.error(`CUSTOMER PHONE IS MANDATORY FOR ${paymentMethod.toUpperCase()} PAYMENT!`);
            return;
        }

        setIsCheckingOut(true);
        const saleId = crypto.randomUUID(); // Generate ID locally for offline safety

        const saleData = {
            id: saleId,
            customer_name: selectedCustomer ? selectedCustomer.name : (walkingCustomerName || 'WALK-IN CUSTOMER'),
            customer_id: selectedCustomer?.id || null,
            total: finalTotal,
            subtotal,
            tax,
            discount: itemDiscounts + globalDiscount,
            payment_method: paymentMethod,
            payment_details: (paymentMethod === 'Online' || paymentMethod === 'Card') ? {
                provider: paymentMethod === 'Online' ? onlineProvider : 'Card Machine',
                account: paymentMethod === 'Online' ? onlineAccount : 'POS Terminal',
                customer_phone: customerPhone
            } : null,
            status: paymentMethod === 'Credit' ? 'Khatta' : 'Paid',
            seller_name: user?.name || activeShift?.staffName || 'Operator',
            is_doctor_mode: isDoctorMode,
            product_name: cart.map(item => item.name).join(', ')
        };

        try {
            // 1. Save main sale
            const { data: savedSale, error: saleError } = await supabase
                .from('sales')
                .insert([saleData])
                .select()
                .single();

            if (saleError) {
                console.warn("Offline: Queuing Sale...");
                addToSyncQueue('sales', 'insert', saleData);
            }

            const finalSaleId = savedSale?.id || saleId;

            // 2. Save sale items
            const saleItemsData = cart.map(item => ({
                sale_id: finalSaleId,
                product_id: item.id,
                quantity: item.quantity,
                price: item.custom_price !== undefined ? item.custom_price : (isDoctorMode ? (item.doctor_price || item.price) : item.price),
                buy_price: item.buy_price || 0,
                reason: item.reason || null
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItemsData);

            if (itemsError) {
                addToSyncQueue('sale_items', 'insert', saleItemsData);
            }

            // 3. Automated External Sourcing Expense
            const externalItems = cart.filter(item => item.reason && item.quantity > (inventory.find(i => i.id === item.id)?.stock || 0));
            if (externalItems.length > 0) {
                const totalExpense = externalItems.reduce((sum, item) => sum + ((item.buy_price || 0) * item.quantity), 0);
                if (totalExpense > 0) {
                    const expenseData = {
                        title: `EXT. SOURCING: Bill #${finalSaleId.toString().slice(-6).toUpperCase()}`,
                        amount: totalExpense,
                        category: 'External Sourcing',
                        date: new Date().toISOString(),
                        added_by: user?.name || activeShift?.staffName || 'Operator',
                        sale_id: finalSaleId
                    };
                    const { error: expError } = await supabase.from('expenses').insert([expenseData]);
                    if (expError) addToSyncQueue('expenses', 'insert', expenseData);
                    toast.success(`Expense Logged!`);
                }
            }

            // 4. Update Inventory Stock & Redux
            const updatedInventory = inventory.map(invItem => {
                const cartItem = cart.find(c => c.id === invItem.id);
                if (cartItem) {
                    const newStock = invItem.stock - cartItem.quantity;
                    const newTotalSold = (invItem.total_sold || 0) + cartItem.quantity;

                    // Fire-and-forget database update (errors handled via sync queue)
                    supabase.from('inventory')
                        .update({ stock: newStock, total_sold: newTotalSold })
                        .eq('id', invItem.id)
                        .then(({ error }) => {
                            if (error) addToSyncQueue('inventory', 'update', { stock: newStock, total_sold: newTotalSold }, invItem.id);
                        });

                    return { ...invItem, stock: newStock, total_sold: newTotalSold };
                }
                return invItem;
            });

            dispatch(setInventory(updatedInventory));

            // 5. Update Shift Stats
            dispatch(updateShiftStats({ sale: finalTotal }));
            const { data: currentShift } = await supabase
                .from('shifts')
                .select('sales')
                .eq('id', activeShift.id)
                .single();

            const newShiftSales = (currentShift?.sales || 0) + finalTotal;
            const { error: shiftError } = await supabase
                .from('shifts')
                .update({ sales: newShiftSales })
                .eq('id', activeShift.id);
            if (shiftError) addToSyncQueue('shifts', 'update', { sales: newShiftSales }, activeShift.id);

            // 6. Update Customer Balance if Credit
            if (paymentMethod === 'Credit' && selectedCustomer) {
                const { data: custData } = await supabase
                    .from('customers')
                    .select('balance, history')
                    .eq('id', selectedCustomer.id)
                    .single();

                const newBalance = (custData?.balance || 0) + finalTotal;
                const newHistory = [
                    {
                        date: new Date().toISOString(),
                        amount: finalTotal,
                        type: 'credit',
                        note: `POS Sale #${finalSaleId.toString().slice(-6)}`
                    },
                    ...(custData?.history || [])
                ];

                const { error: custError } = await supabase
                    .from('customers')
                    .update({ balance: newBalance, history: newHistory })
                    .eq('id', selectedCustomer.id);

                if (custError) addToSyncQueue('customers', 'update', { balance: newBalance, history: newHistory }, selectedCustomer.id);
            }

            // Finalize UI States
            setLastSale({ ...saleData, id: finalSaleId, items: cart, cash_received: cashReceived, change_amount: changeAmount, date: new Date().toLocaleString() });

            if (shouldPrint) {
                setCheckoutStage('printing');
                playDone();
                toast.success('Sale Processed Locally (Offline Ready)');
                setTimeout(() => {
                    window.print();
                }, 300);
            } else {
                setCheckoutStage('printed');
                playDone();
                toast.success('Sale Processed Successfully!');
            }

        } catch (err) {
            console.error("Checkout Error:", err);
            toast.success("Saved Locally (Offline Mode)");
            setCheckoutStage('printed');
        } finally {
            setIsCheckingOut(false);
        }
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
            <div className="no-print" style={{ display: 'grid', gridTemplateRows: isMobile ? '50px 1fr auto' : '50px 1fr', height: '100%', background: '#e2e8f0', overflow: 'hidden' }}>

                {/* 1. TOP ERP BAR */}
                <header style={{
                    background: '#064e3b',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    padding: isMobile ? '10px 12px' : '0 20px',
                    gap: isMobile ? '6px' : '30px',
                    height: isMobile ? '45px' : '48px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button
                            onClick={() => navigate('/')}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <LayoutGrid size={16} /> DASHBOARD
                        </button>
                        <div style={{ height: '24px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}></div>
                        
                        {/* CONNECTION STATUS BADGE */}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            background: isOnline ? '#059669' : '#991b1b', 
                            padding: '4px 10px', 
                            borderRadius: '4px', 
                            border: '1px solid rgba(255,255,255,0.2)' 
                        }}>
                            {isOnline ? <Wifi size={12} color="white" /> : <WifiOff size={12} color="white" />}
                            {!isMobile && (
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'white' }}>
                                    {isOnline ? 'CLOUD ACTIVE' : 'OFFLINE MODE'}
                                </span>
                            )}
                        </div>

                        <div style={{ height: '24px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={logo} alt="Bilal Vet" style={{ height: isMobile ? '24px' : '28px', objectFit: 'contain' }} />
                            {!isMobile && <span style={{ fontWeight: 950, fontSize: '0.85rem', letterSpacing: '0.5px' }}>MEDICAL POS <small style={{ color: '#34d399', fontWeight: 700 }}>PHARMACY EDITION</small></span>}
                        </div>
                    </div>

                    {!isMobile ? (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '25px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#34d399' }}>PHARMACIST ON DUTY</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'capitalize' }}>{user?.name}</span>
                            </div>
                            <div style={{ height: '30px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}></div>
                            <button
                                onClick={() => dispatch(openCalculator())}
                                style={{ background: '#10b981', border: 'none', color: 'white', padding: '8px 15px', borderRadius: '6px', fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Hash size={14} /> CALCULATOR (F3)
                            </button>
                        </div>
                    ) : (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                            <button onClick={() => dispatch(openCalculator())} style={{ background: '#10b981', border: 'none', color: 'white', padding: '8px', borderRadius: '6px' }}><Hash size={18} /></button>
                            <button onClick={() => setShowParkedList(true)} style={{ background: '#334155', border: 'none', color: 'white', padding: '8px', borderRadius: '6px' }}><Pause size={18} /></button>
                        </div>
                    )}
                </header>

                {/* 2. OPERATIONAL GRID */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '220px 1fr 350px',
                    gap: isMobile ? '10px' : '2px',
                    padding: isMobile ? '0' : '2px',
                    overflow: 'hidden',
                    gridTemplateRows: isMobile ? 'auto 1fr' : 'none'
                }}>

                    {/* LEFT SIDEBAR: CATEGORIES */}
                    {!isMobile ? (
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
                                            padding: '10px 15px',
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
                                        {cat?.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                            <div style={{ background: '#064e3b', padding: '10px 15px', color: 'white' }}>
                                <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#34d399', marginBottom: '5px' }}>HOTKEYS</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.6rem', fontWeight: 700 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F1:</span> <span>Search Drug</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F2:</span> <span>Patient</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F3:</span> <span>Calculator</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F10:</span> <span>Print Bill</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>F4:</span> <span>Hold Bill</span></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        mobileTab === 'browse' && (
                            <div style={{
                                background: '#065f46',
                                padding: '10px 5px',
                                height: 'fit-content',
                                overflowX: 'auto',
                                whiteSpace: 'nowrap',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        style={{
                                            display: 'inline-block',
                                            padding: '5px 12px',
                                            margin: '0 8px',
                                            background: selectedCategory === cat ? '#10b981' : 'rgba(255,255,255,0.1)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '15px',
                                            fontSize: '0.65rem',
                                            fontWeight: 850,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {cat?.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )
                    )}

                    {/* MIDDLE: SEARCH & ITEM LIST */}
                    <div style={{
                        display: (isMobile && mobileTab !== 'browse') ? 'none' : 'grid',
                        gridTemplateRows: 'auto 1fr auto',
                        gap: '1px',
                        background: '#e2e8f0',
                        overflow: 'hidden'
                    }}>

                        {/* SEARCH HEADER */}
                        <div style={{ background: 'white', padding: '8px 15px', display: 'flex', gap: '10px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#059669', zIndex: 3 }} />
                                <div style={{ position: 'relative', width: '100%' }}>
                                    {/* GHOST SUGGESTION */}
                                    {suggestion && searchTerm && (
                                        <div style={{
                                            position: 'absolute',
                                            left: '45px',
                                            top: '10px',
                                            fontSize: '1rem',
                                            fontWeight: 800,
                                            color: '#cbd5e1',
                                            pointerEvents: 'none',
                                            whiteSpace: 'pre'
                                        }}>
                                            <span style={{ color: 'transparent' }}>{searchTerm}</span>
                                            {suggestion.slice(searchTerm.length)}
                                        </div>
                                    )}
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="F1: SEARCH DRUG..."
                                        style={{ width: '100%', padding: '10px 15px 10px 45px', fontSize: '1rem', fontWeight: 800, border: '2px solid #cbd5e1', borderRadius: '6px', outline: 'none', background: 'transparent', position: 'relative', zIndex: 2 }}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion) {
                                                e.preventDefault();
                                                setSearchTerm(suggestion);
                                                setSuggestion('');
                                            }
                                            if (e.key === 'Enter' && suggestion && !filteredInventory.some(i => i.name.toLowerCase() === searchTerm.toLowerCase())) {
                                                // Optional: auto-pick first match on enter if exact match doesn't exist
                                                // But let's stick to Tab/Right for now as requested
                                            }
                                        }}
                                    />
                                </div>
                                {searchTerm && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', zIndex: 100, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1', borderRadius: '0 0 6px 6px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {filteredInventory.map(item => (
                                            <div key={item.id} style={{ borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div onClick={() => addToCart(item)} style={{ padding: '10px 15px', cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1e293b' }}>{item.name}</span>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', display: 'flex', gap: '8px' }}>
                                                            <span>{item.category}</span>
                                                            {item.batch_no && <span style={{ color: '#ef4444', fontWeight: 900 }}>• BATCH: {item.batch_no}</span>}
                                                            {item.manufacturer && <span style={{ color: '#059669', fontWeight: 900 }}>• {item.manufacturer?.toUpperCase()}</span>}
                                                        </div>
                                                    </div>
                                                    <span style={{ fontWeight: 900, color: isDoctorMode ? '#6366f1' : '#059669', fontSize: '1.2rem' }}>Rs {isDoctorMode ? (item.doctor_price || item.price) : item.price}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const shortageItem = {
                                                            name: item.name,
                                                            demand_count: 1,
                                                            status: 'pending',
                                                            notes: 'Added from POS'
                                                        };
                                                        dispatch(addToShortage(shortageItem));
                                                        supabase.from('shortage').insert([shortageItem]).then(({ error }) => {
                                                            if (!error) toast.success('Marked in Shortage Book (Supabase)');
                                                        });
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
                                                            name: searchTerm,
                                                            demand_count: 1,
                                                            status: 'pending',
                                                            notes: 'Added from POS'
                                                        };
                                                        dispatch(addToShortage(newShortage));
                                                        supabase.from('shortage').insert([newShortage]).then(({ error }) => {
                                                            if (!error) toast.success(`"${searchTerm}" added to Shortage Book (Supabase)`);
                                                        });
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
                                        <th style={{ padding: '8px 15px' }}>MEDICINE NAME / FORMULA</th>
                                        <th style={{ padding: '8px 15px', width: '100px' }}>PRICE</th>
                                        <th style={{ padding: '8px 15px', width: '150px' }}>QTY</th>
                                        <th style={{ padding: '8px 15px', width: '100px' }}>DISC</th>
                                        <th style={{ padding: '8px 15px', width: '120px', textAlign: 'right' }}>NET Rs</th>
                                        <th style={{ padding: '8px 15px', width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 15px' }}>
                                                <div style={{ fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.name}
                                                    {item.quantity > (inventory.find(i => i.id === item.id)?.stock || 0) && (
                                                        <span style={{ fontSize: '0.6rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>EXT. SOURCE</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: 700 }}>{item.category} | Stock: {inventory.find(i => i.id === item.id)?.stock || 0}</div>

                                                {item.quantity > (inventory.find(i => i.id === item.id)?.stock || 0) && (
                                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                                        <div style={{ flex: 2 }}>
                                                            <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#b45309', display: 'block', marginBottom: '2px' }}>SOURCE NOTE</label>
                                                            <input
                                                                placeholder="Where from? (e.g. Ali Medicos)"
                                                                style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', border: '1px solid #f59e0b', borderRadius: '4px', background: '#fffbeb', fontWeight: 700 }}
                                                                value={item.reason || ''}
                                                                onChange={(e) => updateCartItem(item.id, 'reason', e.target.value)}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', display: 'block', marginBottom: '2px' }}>OUR COST (Rs)</label>
                                                            <div style={{ display: 'flex', alignItems: 'center', background: '#fff1f2', borderRadius: '4px', border: '1px solid #fecaca', padding: '0 8px', height: '31px' }}>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Cost"
                                                                    style={{ width: '100%', background: 'transparent', border: 'none', fontSize: '0.8rem', fontWeight: 900, color: '#dc2626', outline: 'none' }}
                                                                    value={item.buy_price || 0}
                                                                    onChange={(e) => updateCartItem(item.id, 'buy_price', parseFloat(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 15px', fontWeight: 900 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <label style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 900 }}>PRICE</label>
                                                    <input
                                                        type="number"
                                                        style={{
                                                            width: '80px',
                                                            padding: '4px',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '4px',
                                                            fontWeight: 900,
                                                            fontSize: '0.9rem',
                                                            background: item.custom_price !== (isDoctorMode ? (item.doctor_price || item.price) : item.price) ? '#f0f9ff' : 'white',
                                                            color: item.custom_price !== (isDoctorMode ? (item.doctor_price || item.price) : item.price) ? '#0369a1' : 'inherit'
                                                        }}
                                                        value={item.custom_price !== undefined ? item.custom_price : (isDoctorMode ? (item.doctor_price || item.price) : item.price)}
                                                        onChange={(e) => updateCartItem(item.id, 'custom_price', parseFloat(e.target.value) || 0)}
                                                    />
                                                    {isDoctorMode && <div style={{ fontSize: '0.5rem', fontWeight: 900, color: '#6366f1' }}>DOCTOR RATE</div>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 15px' }}>
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
                                            <td style={{ padding: '8px 15px' }}>
                                                <input
                                                    type="number"
                                                    value={item.discount || 0}
                                                    onChange={(e) => updateCartItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                    style={{ width: '70px', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center', fontWeight: 800 }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 15px', textAlign: 'right', fontWeight: 950, fontSize: '1.1rem', color: isDoctorMode ? '#4338ca' : '#065f46' }}>
                                                Rs {((item.custom_price !== undefined ? item.custom_price : (isDoctorMode ? (item.doctor_price || item.price) : item.price)) * item.quantity - (item.discount || 0)).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '8px 15px', textAlign: 'right' }}>
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
                        {!isMobile && (
                            <div style={{ background: '#f8fafc', padding: '8px 15px', borderTop: '2px solid #e2e8f0', display: 'flex', gap: '15px' }}>
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
                        )}

                    </div>

                    {/* RIGHT: SETTLEMENT PANEL */}
                    <div style={{
                        display: (isMobile && mobileTab !== 'cart') ? 'none' : 'flex',
                        flexDirection: 'column',
                        background: 'white',
                        height: '100%',
                        overflow: 'hidden',
                        borderLeft: isMobile ? 'none' : '1px solid #e2e8f0'
                    }}>

                        {/* COMPACT HEADER WITH PATIENT ICON */}
                        <div style={{ padding: '8px 15px', background: '#ecfdf5', borderBottom: '1px solid #d1fae5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => setShowCustomerSearch(true)}
                                    style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                    title="Select Patient (F2)"
                                >
                                    <UserPlus size={18} />
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#065f46' }}>PATIENT NAME</span>
                                    {selectedCustomer ? (
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46' }}>
                                            {selectedCustomer.name?.toUpperCase()}
                                        </span>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="WALK-IN"
                                            value={walkingCustomerName}
                                            onChange={(e) => setWalkingCustomerName(e.target.value)}
                                            style={{ border: 'none', borderBottom: '1px dashed #059669', background: 'transparent', fontSize: '0.75rem', fontWeight: 800, color: '#065f46', outline: 'none', padding: '1px 0', width: '120px' }}
                                        />
                                    )}
                                </div>
                            </div>
                            {selectedCustomer && (
                                <button onClick={() => setSelectedCustomer(null)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={14} />
                                </button>
                            )}

                            {isMobile && (
                                <button
                                    onClick={() => setMobileTab('browse')}
                                    style={{
                                        background: '#065f46',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 15px',
                                        fontSize: '0.75rem',
                                        fontWeight: 900,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    <Plus size={16} /> ADD ITEMS
                                </button>
                            )}
                        </div>

                        {/* DOCTOR MODE TOGGLE */}
                        <div style={{ padding: '10px 20px', background: isDoctorMode ? '#6366f1' : '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: isDoctorMode ? 'white' : '#64748b' }}>APPLY DOCTOR PRICES?</span>
                            <div
                                onClick={() => {
                                    const nextMode = !isDoctorMode;
                                    setIsDoctorMode(nextMode);
                                    // Update all existing items in cart to match new mode
                                    setCart(cart.map(item => ({
                                        ...item,
                                        custom_price: nextMode ? (item.doctor_price || item.price) : item.price
                                    })));
                                }}
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

                        {/* FINANCIAL SUMMARY & PAYMENTS (SCROLLABLE) */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '15px 20px' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <button
                                    onClick={() => setShowBreakdown(!showBreakdown)}
                                    style={{ width: '100%', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: 900, color: '#475569', fontSize: '0.65rem' }}
                                >
                                    {showBreakdown ? 'HIDE' : 'VIEW'} BILL BREAKDOWN {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>

                                {showBreakdown && (
                                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', background: 'white' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                            <span style={{ fontWeight: 700, color: '#64748b' }}>TOTAL BILL</span>
                                            <span style={{ fontWeight: 800, color: '#1e293b' }}>Rs {subtotal.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                            <span style={{ fontWeight: 700, color: '#64748b' }}>TOTAL DISCOUNT</span>
                                            <span style={{ fontWeight: 800, color: '#ef4444' }}>- Rs {(itemDiscounts + globalDiscount).toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                            <span style={{ fontWeight: 700, color: '#64748b' }}>TAX Amount</span>
                                            <span style={{ fontWeight: 800, color: tax > 0 ? '#059669' : '#94a3b8' }}>+ Rs {tax.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ background: '#064e3b', padding: '10px', borderRadius: '10px', color: 'white', textAlign: 'center', marginBottom: '10px', position: 'relative' }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#34d399', display: 'block', marginBottom: '1px' }}>FINAL AMOUNT TO PAY</span>
                                <div style={{ fontSize: '1.5rem', fontWeight: 950 }}>Rs {Math.max(0, Math.round(finalTotal)).toLocaleString()}</div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.45rem', fontWeight: 900, color: '#34d399' }}>OVERRIDE TOTAL?</label>
                                        <input
                                            type="number"
                                            placeholder="Set Total"
                                            style={{ width: '70px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontSize: '0.7rem', fontWeight: 900, borderRadius: '4px', textAlign: 'center', padding: '2px', outline: 'none' }}
                                            onBlur={(e) => {
                                                const target = parseFloat(e.target.value);
                                                if (!isNaN(target)) {
                                                    const currentWithoutAdj = subtotal - itemDiscounts - globalDiscount + tax;
                                                    setManualAdjustment(target - currentWithoutAdj);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.45rem', fontWeight: 900, color: '#fbbf24' }}>ADJUSTMENT (Rs)</label>
                                        <input
                                            type="number"
                                            style={{ width: '70px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 900, borderRadius: '4px', textAlign: 'center', padding: '2px', outline: 'none' }}
                                            value={manualAdjustment}
                                            onChange={(e) => setManualAdjustment(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PAYMENT METHODS */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>HOW IS PATIENT PAYING?</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                    {[
                                        { id: 'Cash', icon: <Banknote size={16} />, label: 'CASH' },
                                        { id: 'Card', icon: <CreditCard size={16} />, label: 'CARD' },
                                        { id: 'Online', icon: <Zap size={16} />, label: 'ONLINE' },
                                        { id: 'Credit', icon: <UserPlus size={16} />, label: 'KHATTA' }
                                    ].map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id)}
                                            style={{
                                                padding: '6px 4px',
                                                borderRadius: '8px',
                                                border: '2px solid',
                                                borderColor: paymentMethod === method.id ? '#059669' : '#e2e8f0',
                                                background: paymentMethod === method.id ? '#ecfdf5' : 'white',
                                                color: paymentMethod === method.id ? '#065f46' : '#64748b',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '3px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {method.icon}
                                            <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>{method.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {(paymentMethod === 'Online' || paymentMethod === 'Card') && (
                                    <div style={{ background: paymentMethod === 'Online' ? '#f0f9ff' : '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid', borderColor: paymentMethod === 'Online' ? '#bae6fd' : '#e2e8f0', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {paymentMethod === 'Online' && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {[
                                                    { id: 'JazzCash', icon: <img src={jazzcashLogo} alt="JC" style={{ height: '18px', objectFit: 'contain' }} />, color: '#f59e0b' },
                                                    { id: 'Easypaisa', icon: <img src={easypaisaLogo} alt="EP" style={{ height: '18px', objectFit: 'contain' }} />, color: '#10b981' },
                                                    { id: 'Bank', icon: <Banknote size={18} />, color: '#0ea5e9' }
                                                ].map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => setOnlineProvider(p.id)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 4px',
                                                            borderRadius: '8px',
                                                            border: '2px solid',
                                                            borderColor: onlineProvider === p.id ? p.color : '#e2e8f0',
                                                            background: 'white',
                                                            color: onlineProvider === p.id ? p.color : '#64748b',
                                                            fontSize: '0.6rem',
                                                            fontWeight: 900,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s',
                                                            boxShadow: onlineProvider === p.id ? `0 4px 10px ${p.color}20` : 'none'
                                                        }}
                                                    >
                                                        {p.icon}
                                                        {p.id.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {paymentMethod === 'Online' && (
                                            <div>
                                                <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#0369a1', display: 'block', marginBottom: '4px' }}>RECEIVED ON (WHICH NUMBER?)</label>
                                                <input
                                                    placeholder="Enter recipient number/ID"
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}
                                                    value={onlineAccount}
                                                    onChange={e => setOnlineAccount(e.target.value)}
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label style={{ fontSize: '0.55rem', fontWeight: 900, color: '#ef4444', display: 'block', marginBottom: '4px' }}>CUSTOMER NUMBER (MANDATORY*)</label>
                                            <input
                                                placeholder="Customer phone for contact"
                                                style={{ width: '100%', padding: '8px', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, background: '#fff5f5' }}
                                                value={customerPhone}
                                                onChange={e => setCustomerPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'Cash' && (
                                    <div style={{ marginTop: '10px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '5px' }}>CASH GIVEN (Rs)</label>
                                        <input
                                            ref={cashInputRef}
                                            type="number"
                                            placeholder="Amount"
                                            style={{ width: '100%', padding: '6px', fontSize: '1.1rem', fontWeight: 950, textAlign: 'center', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                            value={cashReceived}
                                            onChange={(e) => setCashReceived(e.target.value)}
                                        />
                                        {cashReceived && (
                                            <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 800, fontSize: '0.6rem', color: changeAmount >= 0 ? '#065f46' : '#991b1b' }}>{changeAmount >= 0 ? 'RETURN:' : 'LACK:'}</span>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 950, color: changeAmount >= 0 ? '#065f46' : '#991b1b' }}>Rs {Math.abs(Math.round(changeAmount)).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* STICKY ACTIONS FOOTER */}
                        <div style={{
                            padding: '10px 15px',
                            background: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            gap: '8px',
                            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                            <button
                                disabled={isCheckingOut}
                                onClick={() => { setPendingPrint(false); setShowConfirm(true); }}
                                style={{ flex: 1, padding: '12px', background: isCheckingOut ? '#94a3b8' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 950, cursor: isCheckingOut ? 'not-allowed' : 'pointer' }}
                            >
                                {isCheckingOut ? '...' : 'FINISH (F9)'}
                            </button>
                            <button
                                disabled={isCheckingOut}
                                onClick={() => { setPendingPrint(true); setShowConfirm(true); }}
                                style={{ flex: 2, padding: '12px', background: isCheckingOut ? '#94a3b8' : '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 950, cursor: isCheckingOut ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                                {isCheckingOut ? <RefreshCw size={16} className="animate-spin" /> : <Printer size={16} />}
                                {isCheckingOut ? 'SAVING...' : 'PRINT & FINISH (F10)'}
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
                                                <div style={{ fontWeight: 900, color: '#065f46' }}>{bill.selectedCustomer ? bill.selectedCustomer.name?.toUpperCase() : 'WALK-IN (CASH)'}</div>
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
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: 'white', width: '550px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ background: '#064e3b', padding: '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 950, letterSpacing: '-0.5px' }}>PATIENT REGISTRY</h3>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 700, marginTop: '2px' }}>Search and select account for billing</p>
                                </div>
                                <button onClick={() => { setShowCustomerSearch(false); setCustomerSearchTerm(''); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
                            </div>
                            <div style={{ padding: '20px' }}>
                                <div style={{ position: 'relative', marginBottom: '20px' }}>
                                    <Search size={22} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                                    <input
                                        autoFocus
                                        placeholder="Type Name, Mobile or Address..."
                                        style={{ width: '100%', padding: '15px 15px 15px 50px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 800, outline: 'none', transition: 'all 0.2s', color: '#1e293b' }}
                                        value={customerSearchTerm}
                                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                        onFocus={(e) => e.target.style.borderColor = '#10b981'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: '12px', padding: '5px' }}>
                                    {customers
                                        .filter(c =>
                                            c.name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                            c.phone?.includes(customerSearchTerm) ||
                                            c.address?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                            c.id?.toString().includes(customerSearchTerm)
                                        )
                                        .map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    setSelectedCustomer(c);
                                                    setShowCustomerSearch(false);
                                                    setCustomerSearchTerm('');
                                                }}
                                                style={{ width: '100%', textAlign: 'left', padding: '0', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                            >
                                                <div style={{
                                                    padding: '15px 20px',
                                                    border: '1px solid #f1f5f9',
                                                    borderRadius: '12px',
                                                    background: '#ffffff',
                                                    borderLeft: `5px solid ${c.balance > 0 ? '#ef4444' : '#10b981'}`,
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                                }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: '40px', height: '40px', background: c.balance > 0 ? '#fff1f1' : '#ecfdf5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.balance > 0 ? '#ef4444' : '#10b981' }}>
                                                                <User size={20} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 950, fontSize: '1.1rem', color: '#1e293b' }}>{c.name?.toUpperCase()}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>ADD: {c.address || 'N/A'} • PH: {c.phone}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8' }}>DUE BALANCE</div>
                                                            <div style={{ fontWeight: 950, color: c.balance > 0 ? '#ef4444' : '#059669', fontSize: '1.1rem' }}>Rs {(c.balance || 0).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
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

                {/* ANIMATED CONFIRMATION MODAL */}
                {showConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                        <div style={{
                            background: 'white',
                            width: '400px',
                            padding: '30px',
                            borderRadius: '20px',
                            textAlign: 'center',
                            animation: 'bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                        }}>
                            <div style={{ width: '80px', height: '80px', background: pendingPrint ? '#ecfdf5' : '#f0f9ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                {pendingPrint ? <Printer size={40} color="#10b981" /> : <CheckCircle size={40} color="#3b82f6" />}
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#1e293b', marginBottom: '10px' }}>ARE YOU SURE?</h2>
                            <p style={{ color: '#64748b', fontWeight: 700, marginBottom: '30px' }}>
                                Do you want to {pendingPrint ? 'Print and Save' : 'Save Only'} this transaction of <span style={{ color: '#059669' }}>Rs {finalTotal.toLocaleString()}</span>?
                            </p>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    style={{ flex: 1, padding: '15px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}
                                >
                                    NO, CANCEL
                                </button>
                                <button
                                    disabled={isCheckingOut}
                                    onClick={async () => {
                                        await handleCheckout(pendingPrint);
                                        setShowConfirm(false);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '15px',
                                        background: isCheckingOut ? '#94a3b8' : (pendingPrint ? '#10b981' : '#3b82f6'),
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: 900,
                                        cursor: isCheckingOut ? 'not-allowed' : 'pointer',
                                        boxShadow: isCheckingOut ? 'none' : '0 10px 15px -3px rgba(0,0,0,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    {isCheckingOut ? (
                                        <>
                                            <RefreshCw size={20} className="animate-spin" />
                                            SAVING...
                                        </>
                                    ) : (
                                        'YES, PROCEED'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. MOBILE NAVIGATION FOOTER */}
                {isMobile && (
                    <div style={{
                        background: 'white',
                        borderTop: '2px solid #e2e8f0',
                        display: 'flex',
                        padding: '10px 15px',
                        gap: '15px',
                        zIndex: 1000,
                        boxShadow: '0 -4px 15px rgba(0,0,0,0.05)'
                    }}>
                        <button
                            onClick={() => setMobileTab('browse')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: mobileTab === 'browse' ? '#ecfdf5' : 'transparent',
                                color: mobileTab === 'browse' ? '#059669' : '#64748b',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 950,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '0.8rem'
                            }}
                        >
                            <Search size={18} /> BROWSE
                        </button>
                        <button
                            onClick={() => setMobileTab('cart')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: mobileTab === 'cart' ? '#ecfdf5' : 'transparent',
                                color: mobileTab === 'cart' ? '#059669' : '#64748b',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 950,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                position: 'relative',
                                fontSize: '0.8rem'
                            }}
                        >
                            <ShoppingCart size={18} /> CART
                            {cart.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '20%',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '0.65rem',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontWeight: 900
                                }}>
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <ThermalReceipt
                lastSale={lastSale}
                activeShift={activeShift}
                logo={logo}
            />

            <style>
                {`
                .qty-input-no-spin::-webkit-inner-spin-button,
                .qty-input-no-spin::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                `}
            </style>
        </>
    );
};

export default POS;
