import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Delete, Divide, Minus, Plus, Equal, Hash, RotateCcw } from 'lucide-react';

const Calculator = ({ isOpen, onClose }) => {
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [history, setHistory] = useState([]);
    const [shouldResetDisplay, setShouldResetDisplay] = useState(false);
    const equationRef = useRef(null);

    useEffect(() => {
        if (equationRef.current) {
            equationRef.current.scrollLeft = equationRef.current.scrollWidth;
        }
    }, [equation]);

    const handleNumber = useCallback((num) => {
        if (display === '0' || shouldResetDisplay) {
            setDisplay(num);
            setShouldResetDisplay(false);
        } else {
            setDisplay(display + num);
        }
    }, [display, shouldResetDisplay]);

    const handleOperator = useCallback((op) => {
        // If we just finished a calculation, use the result as the start of a new chain
        if (shouldResetDisplay && !equation) {
            setEquation(display + ' ' + op + ' ');
        } else {
            // Append the current number and operator to the chain
            setEquation(prev => prev + display + ' ' + op + ' ');
        }
        setShouldResetDisplay(true);
    }, [display, equation, shouldResetDisplay]);

    const calculate = useCallback(() => {
        if (!equation) return;
        try {
            const finalEquation = equation + display;
            // Clean up the equation for eval (remove extra spaces)
            const cleanEquation = finalEquation.replace(/\s+/g, '');
            const result = eval(cleanEquation);
            const formattedResult = String(Number(result.toFixed(8)));
            
            // Add to history
            setHistory(prev => [{
                eq: finalEquation,
                res: formattedResult,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }, ...prev].slice(0, 10));

            setDisplay(formattedResult);
            setEquation('');
            setShouldResetDisplay(true);
        } catch (e) {
            setDisplay('Error');
        }
    }, [equation, display]);

    const clear = useCallback(() => {
        setDisplay('0');
        setEquation('');
        setShouldResetDisplay(false);
    }, []);

    const clearHistory = () => setHistory([]);

    const backspace = useCallback(() => {
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
        }
    }, [display]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
            if (e.key === '.' ) handleNumber('.');
            if (e.key === '+') handleOperator('+');
            if (e.key === '-') handleOperator('-');
            if (e.key === '*') handleOperator('*');
            if (e.key === '/') handleOperator('/');
            if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                calculate();
            }
            if (e.key === 'Backspace') handleBackspaceKey(e);
            if (e.key === 'Escape') {
                e.preventDefault();
                if (display === '0' && equation === '') onClose();
                else clear();
            }
        };

        const handleBackspaceKey = (e) => {
            e.preventDefault();
            backspace();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleNumber, handleOperator, calculate, backspace, clear, onClose, display, equation]);

    if (!isOpen) return null;

    const Button = ({ children, onClick, variant = 'default', wide = false }) => {
        const baseStyle = {
            padding: '15px',
            fontSize: '1.2rem',
            fontWeight: '800',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.1s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            gridColumn: wide ? 'span 2' : 'span 1',
            userSelect: 'none'
        };

        const variants = {
            default: { background: 'white', color: '#1e293b' },
            operator: { background: '#f8fafc', color: '#059669' },
            action: { background: '#ecfdf5', color: '#059669' },
            equal: { background: '#059669', color: 'white' },
            clear: { background: '#fee2e2', color: '#ef4444' }
        };

        return (
            <button 
                onClick={onClick} 
                style={{ ...baseStyle, ...variants[variant] }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                {children}
            </button>
        );
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                background: '#f1f5f9',
                padding: '30px',
                borderRadius: '32px',
                width: '700px', // Wider to accommodate history
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.8fr',
                gap: '30px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.5)'
            }}>
                {/* Left Side: Calculator */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: '#059669', padding: '8px', borderRadius: '10px' }}>
                                <Hash size={20} color="white" />
                            </div>
                            <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>FAST CALCULATOR</span>
                        </div>
                    </div>

                    {/* Display Area */}
                    <div style={{
                        background: '#0f172a',
                        padding: '20px',
                        borderRadius: '20px',
                        marginBottom: '20px',
                        textAlign: 'right',
                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                        overflow: 'hidden'
                    }}>
                        <div 
                            ref={equationRef}
                            style={{ 
                                color: '#94a3b8', 
                                fontSize: '0.9rem', 
                                minHeight: '1.2rem', 
                                fontWeight: 700, 
                                marginBottom: '5px',
                                overflowX: 'auto',
                                whiteSpace: 'nowrap',
                                textAlign: 'right',
                                direction: 'ltr' 
                            }} className="hide-scrollbar">
                            {equation}
                        </div>
                        <div style={{ color: 'white', fontSize: '2rem', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {display}
                        </div>
                    </div>

                    {/* Buttons Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        <Button onClick={clear} variant="clear">AC</Button>
                        <Button onClick={backspace} variant="operator"><Delete size={20} /></Button>
                        <Button onClick={() => handleOperator('%')} variant="operator">%</Button>
                        <Button onClick={() => handleOperator('/')} variant="operator"><Divide size={20} /></Button>

                        <Button onClick={() => handleNumber('7')}>7</Button>
                        <Button onClick={() => handleNumber('8')}>8</Button>
                        <Button onClick={() => handleNumber('9')}>9</Button>
                        <Button onClick={() => handleOperator('*')} variant="operator">×</Button>

                        <Button onClick={() => handleNumber('4')}>4</Button>
                        <Button onClick={() => handleNumber('5')}>5</Button>
                        <Button onClick={() => handleNumber('6')}>6</Button>
                        <Button onClick={() => handleOperator('-')} variant="operator"><Minus size={20} /></Button>

                        <Button onClick={() => handleNumber('1')}>1</Button>
                        <Button onClick={() => handleNumber('2')}>2</Button>
                        <Button onClick={() => handleNumber('3')}>3</Button>
                        <Button onClick={() => handleOperator('+')} variant="operator"><Plus size={20} /></Button>

                        <Button onClick={() => handleNumber('0')} wide>0</Button>
                        <Button onClick={() => handleNumber('.')}>.</Button>
                        <Button onClick={calculate} variant="equal"><Equal size={20} /></Button>
                    </div>
                </div>

                {/* Right Side: History/Tally */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <RotateCcw size={16} color="#64748b" />
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#475569' }}>CALCULATION TALLY</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={clearHistory}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 800 }}
                            >
                                CLEAR
                            </button>
                            <button 
                                onClick={onClose}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div style={{ 
                        background: 'white', 
                        flex: 1, 
                        borderRadius: '20px', 
                        padding: '15px', 
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
                        maxHeight: '400px'
                    }}>
                        {history.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center', padding: '20px' }}>
                                No history yet. Results will appear here for your confirmation.
                            </div>
                        ) : (
                            history.map((item, idx) => (
                                <div key={idx} style={{ 
                                    padding: '10px', 
                                    borderBottom: '1px solid #f1f5f9',
                                    animation: 'slideIn 0.2s ease-out'
                                }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, marginBottom: '2px' }}>{item.time}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{item.eq} =</div>
                                    <div style={{ fontSize: '1.1rem', color: '#059669', fontWeight: 900 }}>Rs {item.res}</div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    <div style={{ marginTop: '20px', padding: '15px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#059669', marginBottom: '5px' }}>TALLY SUM (TOTAL)</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#065f46' }}>
                            Rs {history.reduce((acc, curr) => acc + Number(curr.res), 0).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                `}
            </style>
        </div>
    );
};

export default Calculator;
