import { configureStore } from '@reduxjs/toolkit';
import inventoryReducer from './slices/inventorySlice';
import salesReducer from './slices/salesSlice';
import shiftReducer from './slices/shiftSlice';
import customerReducer from './slices/customerSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
    reducer: {
        inventory: inventoryReducer,
        sales: salesReducer,
        shift: shiftReducer,
        customers: customerReducer,
        auth: authReducer
    }
});
