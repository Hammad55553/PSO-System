import { createSlice } from '@reduxjs/toolkit';

const inventorySlice = createSlice({
    name: 'inventory',
    initialState: {
        items: JSON.parse(localStorage.getItem('bilal_vet_inventory')) || []
    },
    reducers: {
        addItem: (state, action) => {
            state.items.push(action.payload);
            localStorage.setItem('bilal_vet_inventory', JSON.stringify(state.items));
        },
        updateStock: (state, action) => {
            const { id, quantity, mode } = action.payload;
            const item = state.items.find(i => i.id === id);
            if (item) {
                if (mode === 'add') {
                    item.stock += quantity;
                    if (!item.restockHistory) item.restockHistory = [];
                    item.restockHistory.push({
                        date: new Date().toISOString(),
                        quantity: quantity
                    });
                }
                else if (mode === 'remove') item.stock -= quantity;
            }
            localStorage.setItem('bilal_vet_inventory', JSON.stringify(state.items));
        },
        editItem: (state, action) => {
            const index = state.items.findIndex(i => i.id === action.payload.id);
            if (index !== -1) {
                state.items[index] = action.payload;
            }
            localStorage.setItem('bilal_vet_inventory', JSON.stringify(state.items));
        },
        setInventory: (state, action) => {
            state.items = action.payload;
            localStorage.setItem('bilal_vet_inventory', JSON.stringify(state.items));
        },
        deleteItem: (state, action) => {
            state.items = state.items.filter(i => i.id !== action.payload);
            localStorage.setItem('bilal_vet_inventory', JSON.stringify(state.items));
        }
    }
});

export const { addItem, updateStock, editItem, setInventory, deleteItem } = inventorySlice.actions;
export default inventorySlice.reducer;
