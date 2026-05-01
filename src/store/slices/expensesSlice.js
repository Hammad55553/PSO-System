import { createSlice } from '@reduxjs/toolkit';

const expensesSlice = createSlice({
    name: 'expenses',
    initialState: {
        list: []
    },
    reducers: {
        addExpense: (state, action) => {
            state.list.unshift({
                id: Date.now(),
                date: new Date().toISOString(),
                category: action.payload.category,
                amount: parseFloat(action.payload.amount) || 0,
                description: action.payload.description,
                addedBy: action.payload.addedBy || 'System'
            });
        },
        removeExpense: (state, action) => {
            state.list = state.list.filter(e => e.id !== action.payload);
        },
        setExpenses: (state, action) => {
            state.list = action.payload;
        }
    }
});

export const { addExpense, removeExpense, setExpenses } = expensesSlice.actions;
export default expensesSlice.reducer;
