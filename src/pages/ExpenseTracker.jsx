import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { 
    Wallet, 
    Plus, 
    Trash2, 
    Calendar, 
    DollarSign, 
    Filter,
    Search,
    ArrowDownRight,
    ArrowUpRight,
    TrendingDown,
    X,
    FileText
} from 'lucide-react';
import { addExpense, removeExpense } from '../store/slices/expensesSlice';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const ExpenseTracker = () => {
    const dispatch = useDispatch();
    const { list } = useSelector(state => state.expenses);
    const { user } = useSelector(state => state.auth);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        category: 'Utilities',
        amount: '',
        description: ''
    });

    const categories = ['Utilities', 'Rent', 'Salary', 'Medical Supplies', 'Marketing', 'Maintenance', 'Others'];

    const filteredExpenses = useMemo(() => {
        return list.filter(e => 
            e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
            e.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [list, searchTerm]);

    const stats = useMemo(() => {
        const total = list.reduce((acc, e) => acc + e.amount, 0);
        const thisMonth = list.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((acc, e) => acc + e.amount, 0);
        const today = list.filter(e => new Date(e.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]).reduce((acc, e) => acc + e.amount, 0);
        return { total, thisMonth, today };
    }, [list]);

    const handleAdd = (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.description) {
            toast.error('Please fill all fields');
            return;
        }
        const expense = {
            id: Date.now(),
            date: new Date().toISOString(),
            category: formData.category,
            amount: parseFloat(formData.amount) || 0,
            description: formData.description,
            addedBy: user.name || 'System'
        };
        dispatch(addExpense(expense));
        if (navigator.onLine) {
            setDoc(doc(db, "expenses", expense.id.toString()), expense);
        }
        setFormData({ category: 'Utilities', amount: '', description: '' });
        setIsModalOpen(false);
        toast.success('Expense recorded successfully');
    };

    const handleDelete = (id) => {
        dispatch(removeExpense(id));
        if (navigator.onLine) {
            deleteDoc(doc(db, "expenses", id.toString()));
        }
        toast.success('Expense Deleted');
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '25px', backgroundColor: '#f8fafc' }}>
            
            {/* HEADER */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '20px 25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Wallet size={28} color="#ef4444" /> EXPENSE TRACKER (KHARCHA)
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>Manage clinic overheads and daily operational costs.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: '#0f172a', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} /> LOG NEW EXPENSE
                </button>
            </header>

            {/* STATS CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>TODAY'S OUTFLOW</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#ef4444' }}>Rs {stats.today.toLocaleString()}</h3>
                </div>
                <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '5px' }}>MONTHLY TOTAL</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#1e293b' }}>Rs {stats.thisMonth.toLocaleString()}</h3>
                </div>
                <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', color: 'white' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', marginBottom: '5px' }}>CUMULATIVE EXPENSES</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: '#34d399' }}>Rs {stats.total.toLocaleString()}</h3>
                </div>
            </div>

            {/* SEARCH & FILTERS */}
            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '12px', color: '#64748b' }} />
                    <input 
                        type="text" 
                        placeholder="Search by description or category..." 
                        style={{ width: '100%', padding: '12px 15px 12px 45px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* EXPENSE TABLE */}
            <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ overflowY: 'auto', height: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>DATE</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>CATEGORY</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>DESCRIPTION</th>
                                <th style={{ padding: '15px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>OPERATOR</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>AMOUNT</th>
                                <th style={{ padding: '15px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, color: '#64748b' }}>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map((expense, idx) => (
                                <motion.tr 
                                    key={expense.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    style={{ borderBottom: '1px solid #f1f5f9' }}
                                >
                                    <td style={{ padding: '15px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                                        {new Date(expense.date).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '15px 20px' }}>
                                        <span style={{ 
                                            fontSize: '0.65rem', 
                                            fontWeight: 900, 
                                            padding: '4px 10px', 
                                            borderRadius: '20px',
                                            background: '#f1f5f9',
                                            color: '#1e293b',
                                            textTransform: 'uppercase'
                                        }}>
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                                        {expense.description}
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                                        {expense.addedBy.toUpperCase()}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 950, color: '#ef4444', fontSize: '1rem' }}>
                                        - Rs {expense.amount.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                        <button onClick={() => handleDelete(expense.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD EXPENSE MODAL */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', width: '450px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#0f172a', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900 }}>LOG NEW EXPENSE</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleAdd} style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>EXPENSE CATEGORY</label>
                                <select 
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }}
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>AMOUNT (Rs)</label>
                                <input 
                                    type="number"
                                    placeholder="0.00" 
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950, color: '#ef4444' }}
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '8px' }}>DESCRIPTION / NOTES</label>
                                <textarea 
                                    placeholder="e.g. Electricity bill for March" 
                                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700, minHeight: '100px' }}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <button type="submit" style={{ width: '100%', padding: '15px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer' }}>
                                SAVE EXPENSE ENTRY
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseTracker;
