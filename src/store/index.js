import { configureStore } from '@reduxjs/toolkit';
import inventoryReducer from './slices/inventorySlice';
import salesReducer from './slices/salesSlice';
import shiftReducer from './slices/shiftSlice';
import customerReducer from './slices/customerSlice';
import authReducer from './slices/authSlice';
import ordersReducer from './slices/ordersSlice';
import shortageReducer from './slices/shortageSlice';
import expensesReducer from './slices/expensesSlice';
import suppliersReducer from './slices/suppliersSlice';
import uiReducer from './slices/uiSlice';

// 1. Load data from LocalStorage
const loadState = () => {
    try {
        const serializedState = localStorage.getItem('bilal_pos_state');
        if (serializedState === null) return undefined;
        return JSON.parse(serializedState);
    } catch (err) {
        return undefined;
    }
};

const persistedState = loadState();

export const store = configureStore({
    reducer: {
        inventory: inventoryReducer,
        sales: salesReducer,
        shift: shiftReducer,
        customers: customerReducer,
        auth: authReducer,
        orders: ordersReducer,
        shortage: shortageReducer,
        expenses: expensesReducer,
        suppliers: suppliersReducer,
        ui: uiReducer
    },
    preloadedState: persistedState
});

// 2. Save data to LocalStorage on every change
store.subscribe(() => {
    try {
        const state = store.getState();
        const serializedState = JSON.stringify(state);
        localStorage.setItem('bilal_pos_state', serializedState);
    } catch (err) {
        // Ignore write errors
    }
});
