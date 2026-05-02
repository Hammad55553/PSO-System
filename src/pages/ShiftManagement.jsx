import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Play, Square, History, Timer, User, Wallet, Activity, ArrowRightCircle } from 'lucide-react';
import { startShift, endShift, updateShiftStats, deleteShift } from '../store/slices/shiftSlice';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';

const ShiftManagement = () => {
    const dispatch = useDispatch();
    const { activeShift, history } = useSelector(state => state.shift);
    const { user } = useSelector(state => state.auth);
    const isAdmin = user?.role === 'admin';
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState('');

    const handleStart = async (e) => {
        e.preventDefault();
        const staffName = user?.name || 'Authorized Operator';
        const shiftData = { 
            staff_name: staffName, 
            opening_cash: parseFloat(openingCash) || 0,
            start_time: new Date().toISOString(),
            sales: 0,
            expenses: 0,
            status: 'active'
        };

        try {
            const { data, error } = await supabase
                .from('shifts')
                .insert([shiftData])
                .select();
            
            if (error) throw error;
            
            // Note: In a real app, you'd dispatch(startShift(data[0])) 
            // but for now we follow the local pattern
            dispatch(startShift({ ...shiftData, id: data[0].id }));
            toast.success('Terminal Session Started in Supabase');
        } catch (err) {
            console.error(err);
            toast.error("Failed to start shift");
        }
    };

    const handleEnd = async (e) => {
        e.preventDefault();
        const finalClosingCash = parseFloat(closingCash) || 0;
        
        try {
            const { error } = await supabase
                .from('shifts')
                .update({
                    closing_cash: finalClosingCash,
                    end_time: new Date().toISOString(),
                    status: 'closed'
                })
                .eq('id', activeShift.id);
            
            if (error) throw error;
            
            dispatch(endShift({ closingCash: finalClosingCash }));
            toast.success('Shift closed in Supabase');
        } catch (err) {
            console.error(err);
            toast.error("Failed to close shift");
        }
    };

    const handleDeleteShift = async (id) => {
        if (!isAdmin) return;
        if (window.confirm('Are you sure you want to PERMANENTLY delete this shift record? This cannot be undone.')) {
            try {
                const { error } = await supabase
                    .from('shifts')
                    .delete()
                    .eq('id', id);
                
                if (error) throw error;
                
                dispatch(deleteShift(id));
                toast.success('Shift record deleted from Supabase');
            } catch (err) {
                console.error(err);
                toast.error("Delete failed");
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Toolbar */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Terminal Shift Control</h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Open or close your daily cash counter and monitor live production.</p>
                </div>
                {activeShift && (
                    <div style={{ padding: '8px 15px', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></div>
                        SESSION ACTIVE: #{activeShift.id}
                    </div>
                )}
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* 1. Terminal Lock/Unlock UI */}
                {!activeShift ? (
                    <div className="pos-section" style={{ padding: '60px 20px', alignItems: 'center', justifyContent: 'center', background: 'white' }}>
                        <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                            <Play size={40} style={{ color: 'var(--primary)', marginLeft: '5px' }} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px' }}>Terminal is Offline</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', textAlign: 'center', maxWidth: '400px' }}>
                            To begin processing sales and inventory adjustments, you must initiate a new terminal shift.
                        </p>

                        <form onSubmit={handleStart} style={{ background: '#f8fafc', border: '1px solid var(--border)', padding: '30px', borderRadius: '8px', width: '100%', maxWidth: '400px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>OPENING CASH BALANCE (Rs)</label>
                                <input
                                    type="number"
                                    required
                                    autoFocus
                                    className="erp-input"
                                    style={{ width: '100%', padding: '12px', fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px' }}
                                    placeholder="0.00"
                                    value={openingCash}
                                    onChange={e => setOpeningCash(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn-erp btn-erp-primary" style={{ width: '100%', padding: '15px', justifyContent: 'center', fontSize: '1rem' }}>
                                <ArrowRightCircle size={20} />
                                Start Operational Shift
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="pos-section" style={{ background: 'white' }}>
                        <div className="section-header" style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}>Live Shift Monitor</div>
                        <div style={{ padding: '25px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                                <div style={{ border: '1px solid var(--border)', padding: '15px', borderRadius: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>START TIME</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{new Date(activeShift.start_time || activeShift.startTime).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ border: '1px solid var(--border)', padding: '15px', borderRadius: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>OPENING CASH</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>Rs {(activeShift.opening_cash || activeShift.openingCash || 0).toLocaleString()}</span>
                                </div>
                                <div style={{ border: '1px solid var(--border)', padding: '15px', borderRadius: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>SHIFT SALES</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)' }}>Rs {(activeShift.sales || 0).toLocaleString()}</span>
                                </div>
                                <div style={{ border: '1px solid var(--border)', padding: '15px', borderRadius: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '5px' }}>EXPENSES</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-red)' }}>Rs {(activeShift.expenses || 0).toLocaleString()}</span>
                                </div>
                            </div>

                            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '25px', borderRadius: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h4 style={{ fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Square size={16} />
                                        Shift Termination & Reconciliation
                                    </h4>
                                    <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700 }}>VERIFY CASH BEFORE CLOSING</span>
                                </div>
                                <form onSubmit={handleEnd} style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="number"
                                            required
                                            placeholder="Enter physical cash in counter..."
                                            className="erp-input"
                                            style={{ width: '100%', padding: '12px', border: '1px solid #fecaca' }}
                                            value={closingCash}
                                            onChange={e => setClosingCash(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0 30px', borderRadius: '4px', fontWeight: 800, cursor: 'pointer' }}>
                                        End Shift (Close Terminal)
                                    </button>
                                </form>
                            </div>

                            {/* Expense Entry Section */}
                            <div style={{ marginTop: '20px', background: '#f8fafc', border: '1px solid var(--border)', padding: '25px', borderRadius: '4px' }}>
                                <h4 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                    <Activity size={16} /> Record Cash Expense (Outflow)
                                </h4>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        id="expAmount"
                                        style={{ width: '120px', padding: '10px', border: '1px solid var(--border)', borderRadius: '4px' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Reason (e.g. Tea, Fuel, Cleaning)"
                                        id="expNote"
                                        style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '4px' }}
                                    />
                                    <button
                                        onClick={async () => {
                                            const amt = parseFloat(document.getElementById('expAmount').value);
                                            const note = document.getElementById('expNote').value;
                                            if (!amt || !note) return;

                                            dispatch(updateShiftStats({ expense: amt }));

                                            if (navigator.onLine && activeShift) {
                                                const updated = { ...activeShift, expenses: (activeShift.expenses || 0) + amt };
                                                await setDoc(doc(db, "shifts", activeShift.id), updated, { merge: true });
                                            }

                                            toast.success('Expense Recorded');
                                            document.getElementById('expAmount').value = '';
                                            document.getElementById('expNote').value = '';
                                        }}
                                        style={{ padding: '0 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 700 }}
                                    >
                                        Add Expense
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Shift History (Logs) - ADMIN ONLY */}
                {isAdmin && (
                    <div className="pos-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '200px' }}>
                        <div className="section-header">Shift Logs & Daily Sales Reports (DSR)</div>
                        <div style={{ overflowY: 'scroll', flex: 1, background: '#fff' }}>
                            <table className="erp-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Session Duration</th>
                                        <th>Staff</th>
                                        <th>Opening Cash</th>
                                        <th>Closing Cash</th>
                                        <th style={{ textAlign: 'right' }}>Total Volume (Rs)</th>
                                        {isAdmin && <th style={{ textAlign: 'center' }}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 700 }}>{new Date(s.start_time || s.startTime).toLocaleDateString()}</td>
                                            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {new Date(s.start_time || s.startTime).toLocaleTimeString()} - {(s.end_time || s.endTime) ? new Date(s.end_time || s.endTime).toLocaleTimeString() : 'Active'}
                                            </td>
                                            <td>{s.staff_name || s.staffName}</td>
                                            <td>Rs {s.opening_cash || s.openingCash}</td>
                                            <td>Rs {s.closing_cash || s.closingCash || 0}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                                                Rs {(s.sales || 0).toLocaleString()}
                                            </td>
                                            {isAdmin && (
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleDeleteShift(s.id)}
                                                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '5px' }}
                                                        title="Delete Shift Record"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={isAdmin ? "7" : "6"} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                No historic shift data available on this terminal.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default ShiftManagement;
