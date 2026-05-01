import { createSlice } from '@reduxjs/toolkit';

const shortageSlice = createSlice({
    name: 'shortage',
    initialState: {
        items: []
    },
    reducers: {
        addToShortage: (state, action) => {
            const existing = state.items.find(i => i.name.toLowerCase() === action.payload.name.toLowerCase());
            if (existing) {
                existing.demandCount += 1;
                existing.lastRequested = new Date().toISOString();
            } else {
                state.items.push({
                    id: Date.now(),
                    name: action.payload.name,
                    demandCount: 1,
                    status: 'pending', // pending, ordered, resolved
                    addedAt: new Date().toISOString(),
                    lastRequested: new Date().toISOString(),
                    notes: action.payload.notes || ''
                });
            }
        },
        updateShortageStatus: (state, action) => {
            const item = state.items.find(i => i.id === action.payload.id);
            if (item) {
                item.status = action.payload.status;
            }
        },
        removeFromShortage: (state, action) => {
            state.items = state.items.filter(i => i.id !== action.payload);
        },
        setShortageItems: (state, action) => {
            state.items = action.payload;
        }
    }
});

export const { addToShortage, updateShortageStatus, removeFromShortage, setShortageItems } = shortageSlice.actions;
export default shortageSlice.reducer;
