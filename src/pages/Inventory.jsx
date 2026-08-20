import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Search, Edit3, Trash2, Filter, Download, Box, AlertCircle, Calendar, Hash, X, RefreshCw, Layers, History, TrendingUp, ShoppingBag, ArrowUpCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { addItem, editItem, deleteItem } from '../store/slices/inventorySlice';
import Barcode from 'react-barcode';
import toast from 'react-hot-toast';
import { addToSyncQueue } from '../utils/offlineSync';
import doneSound from '../assets/Done.ogg';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

const Inventory = () => {
    const playDone = () => {
        try {
            const audio = new Audio(doneSound);
            audio.play().catch(e => console.log("Audio blocked"));
        } catch (e) { console.error(e); }
    };
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const inventory = useSelector(state => state.inventory.items);
    const isAdmin = user?.role === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [nameSuggestion, setNameSuggestion] = useState('');
    const [mfrSuggestion, setMfrSuggestion] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [selectedManufacturer, setSelectedManufacturer] = useState('All Companies');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [restockItem, setRestockItem] = useState(null);
    const [auditItem, setAuditItem] = useState(null);
    const [restockQty, setRestockQty] = useState('');
    const [restockBuyPrice, setRestockBuyPrice] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '', price: '', doctor_price: '', buy_price: '', stock: '', unit: 'Units', category: 'Medicine', min_stock: '5', expiry: '', tax_percent: '0', barcode: '', critical_days: '60', manufacturer: '', batch_no: ''
    });

    const categories = ['Medicine', 'Vaccine', 'Syrup', 'Tablet', 'Injection', 'Surgical', 'Pet Food', 'Accessories', 'Feed', 'Other'];

    const manufacturers = React.useMemo(() => {
        const unique = [...new Set(inventory.map(i => i.manufacturer).filter(Boolean))];
        return unique.sort();
    }, [inventory]);

    const filteredItems = inventory.filter(item => {
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.id && item.id.includes(searchTerm)) ||
            (item.barcode && item.barcode.includes(searchTerm)) ||
            (item.manufacturer && item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.batch_no && item.batch_no.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCat = selectedCategory === 'All Categories' || item.category === selectedCategory;
        const matchesMan = selectedManufacturer === 'All Companies' || item.manufacturer === selectedManufacturer;
        return matchesSearch && matchesCat && matchesMan;
    });

    // GHOST AUTOCOMPLETE FOR ENROLLMENT
    React.useEffect(() => {
        if (isModalOpen && formData.name && formData.name.length >= 2) {
            const match = inventory.find(i => i.name.toLowerCase().startsWith(formData.name.toLowerCase()));
            if (match) setNameSuggestion(match.name);
            else setNameSuggestion('');
        } else {
            setNameSuggestion('');
        }
    }, [formData.name, inventory, isModalOpen]);

    React.useEffect(() => {
        if (isModalOpen && formData.manufacturer && formData.manufacturer.length >= 2) {
            const mfrs = [...new Set(inventory.map(i => i.manufacturer).filter(Boolean))];
            const match = mfrs.find(m => m.toLowerCase().startsWith(formData.manufacturer.toLowerCase()));
            if (match) setMfrSuggestion(match);
            else setMfrSuggestion('');
        } else {
            setMfrSuggestion('');
        }
    }, [formData.manufacturer, inventory, isModalOpen]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);

        const initialStockValue = parseInt(formData.stock);
        const data = {
            name: formData.name,
            category: formData.category,
            unit: formData.unit,
            barcode: formData.barcode || null,
            price: parseFloat(formData.price),
            doctor_price: parseFloat(formData.doctor_price || formData.price),
            buy_price: parseFloat(formData.buy_price || 0),
            stock: initialStockValue,
            min_stock: parseInt(formData.min_stock || 5),
            expiry: formData.expiry || null,
            critical_days: parseInt(formData.critical_days || 60),
            manufacturer: formData.manufacturer || '',
            batch_no: formData.batch_no || '',
            initial_stock: editingItem ? editingItem.initial_stock : initialStockValue,
            total_sold: editingItem ? editingItem.total_sold : 0
        };

        const tempId = editingItem ? editingItem.id : Date.now().toString();
        const optimisticData = { ...data, id: tempId };

        try {
            if (editingItem) {
                dispatch(editItem(optimisticData));
                const { error } = await supabase.from('inventory').update(data).eq('id', editingItem.id);
                if (error) addToSyncQueue('inventory', 'update', data, editingItem.id);
                else toast.success('Synced to Cloud');
            } else {
                // Show the item instantly with a temp id...
                dispatch(addItem(optimisticData));
                // ...then replace it with the REAL row from the DB (which has the
                // real UUID). Without this the new item kept a fake Date.now() id,
                // so editing/deleting/restocking it before a reload would fail.
                const { data: saved, error } = await supabase
                    .from('inventory')
                    .insert([data])
                    .select()
                    .single();
                if (error) {
                    addToSyncQueue('inventory', 'insert', data);
                } else {
                    dispatch(deleteItem(tempId));   // remove the temp entry
                    dispatch(addItem(saved));       // add the real one
                    toast.success('Synced to Cloud');
                }
            }

            playDone();
            setIsModalOpen(false);
            setEditingItem(null);
            setFormData({ name: '', price: '', doctor_price: '', buy_price: '', stock: '', unit: 'Units', category: 'Medicine', min_stock: '5', expiry: '', tax_percent: '0', barcode: '', critical_days: '60', manufacturer: '', batch_no: '' });
        } catch (err) {
            console.error(err);
            toast.success("Saved Locally (Offline Mode)");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!isAdmin) {
            toast.error("Only Admins can move products to Trash.");
            return;
        }
        if (window.confirm('Move this product to Trash? It will be permanently deleted after 30 days.')) {
            try {
                const { error } = await supabase.from('inventory').update({ deleted_at: new Date().toISOString() }).eq('id', id);
                if (error) throw error;
                dispatch(deleteItem(id));
                toast.success('Product moved to Trash');
            } catch (err) {
                toast.error("Cloud Move to Trash Failed.");
            }
        }
    };

    const openEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name, price: item.price, doctor_price: item.doctor_price || item.price || '',
            buy_price: item.buy_price || '', stock: item.stock, unit: item.unit || 'Units',
            category: item.category || 'Medicine', min_stock: item.min_stock || 5,
            expiry: item.expiry || '', tax_percent: item.tax_percent || 0,
            barcode: item.barcode || '', critical_days: item.critical_days || 60,
            manufacturer: item.manufacturer || '', batch_no: item.batch_no || ''
        });
        setIsModalOpen(true);
    };

    const handleRestock = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        const incomingQty = parseFloat(restockQty);
        const incomingBuyPrice = parseFloat(restockBuyPrice);

        if (isNaN(incomingQty) || isNaN(incomingBuyPrice)) {
            toast.error("Please enter valid numbers");
            setIsSaving(false);
            return;
        }

        const currentStock = parseFloat(restockItem.stock || 0);
        const currentBuyPrice = parseFloat(restockItem.buy_price || 0);
        const totalStock = currentStock + incomingQty;
        const averageBuyPrice = ((currentStock * currentBuyPrice) + (incomingQty * incomingBuyPrice)) / totalStock;

        const newHistoryEntry = {
            date: new Date().toISOString(),
            quantity: incomingQty,
            prev_stock: currentStock,
            new_stock: totalStock,
            buy_price: incomingBuyPrice
        };

        const updatedHistory = [newHistoryEntry, ...(restockItem.restock_history || [])];

        const updatedData = {
            stock: totalStock,
            buy_price: parseFloat(averageBuyPrice.toFixed(2)),
            restock_history: updatedHistory
        };

        dispatch(editItem({ ...restockItem, ...updatedData }));
        try {
            const { error } = await supabase.from('inventory').update(updatedData).eq('id', restockItem.id);
            if (error) throw error;
            playDone();
            toast.success(`Restocked! New Avg Cost: Rs ${averageBuyPrice.toFixed(2)}`);
        } catch (err) {
            addToSyncQueue('inventory', 'update', updatedData, restockItem.id);
            toast.success("Saved Locally (Restock)");
        } finally {
            setIsSaving(false);
            setIsRestockModalOpen(false);
            setRestockQty('');
            setRestockBuyPrice('');
        }
    };

    const openRestock = (item) => {
        setRestockItem(item);
        setRestockBuyPrice(item.buy_price || '');
        setIsRestockModalOpen(true);
    };

    const openAudit = (item) => {
        setAuditItem(item);
        setIsAuditModalOpen(true);
    };

    const handleExport = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pharmacy Inventory');

        worksheet.columns = [
            { header: 'Medicine Name', key: 'name', width: 35 },
            { header: 'Manufacturer', key: 'manufacturer', width: 25 },
            { header: 'Batch No', key: 'batch_no', width: 15 },
            { header: 'Category', key: 'category', width: 20 },
            { header: 'Unit', key: 'unit', width: 12 },
            { header: 'Retail Price', key: 'price', width: 15 },
            { header: 'Doctor Price', key: 'doctor_price', width: 15 },
            { header: 'Purchase Price', key: 'buy_price', width: 15 },
            { header: 'Stock', key: 'stock', width: 12 },
            { header: 'Min Alert Qty', key: 'min_stock', width: 15 },
            { header: 'Expiry', key: 'expiry', width: 20 },
            { header: 'Barcode', key: 'barcode', width: 20 },
            { header: 'Total Value (AUTO)', key: 'total_value', width: 20 }
        ];

        const headerColors = {
            'name': 'FF059669', 'manufacturer': 'FF059669', 'batch_no': 'FF059669',
            'category': 'FF0369A1', 'unit': 'FF0369A1',
            'price': 'FF0D9488', 'doctor_price': 'FF4F46E5', 'buy_price': 'FFBE123C',
            'stock': 'FF1E293B', 'min_stock': 'FF1E293B', 'expiry': 'FF1E293B',
            'barcode': 'FF1E293B', 'total_value': 'FFD97706'
        };

        const headerRow = worksheet.getRow(1);
        headerRow.height = 35;
        headerRow.eachCell((cell, colNumber) => {
            const key = worksheet.columns[colNumber - 1].key;
            cell.font = { name: 'Segoe UI', color: { argb: 'FFFFFFFF' }, size: 10, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColors[key] || 'FF64748B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        inventory.forEach((item, idx) => {
            const rowIndex = idx + 2;
            const row = worksheet.addRow({
                name: item.name,
                manufacturer: item.manufacturer || '-',
                batch_no: item.batch_no || '-',
                category: item.category?.toUpperCase(),
                unit: item.unit,
                price: item.price,
                doctor_price: item.doctor_price || item.price,
                buy_price: item.buy_price || 0,
                stock: item.stock,
                min_stock: item.min_stock || 5,
                expiry: item.expiry || '-',
                barcode: item.barcode || '-'
            });
            
            // Add formula for each row
            worksheet.getCell(`O${rowIndex}`).value = { formula: `I${rowIndex}*H${rowIndex}` };
            worksheet.getCell(`O${rowIndex}`).numFmt = '"Rs "#,##0.00';
            worksheet.getCell(`O${rowIndex}`).font = { bold: true, color: { argb: 'FFB45309' } };
            
            row.height = 25;
            row.eachCell((cell) => {
                cell.font = { name: 'Segoe UI', size: 10 };
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Bilal_Vet_Full_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        toast.success("Premium Inventory Exported!");
    };

    const downloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventory Template');

        // 1. Define Columns with proper widths
        worksheet.columns = [
            { header: 'Medicine Name', key: 'name', width: 35 },
            { header: 'Manufacturer', key: 'manufacturer', width: 25 },
            { header: 'Batch No', key: 'batch_no', width: 15 },
            { header: 'Category (Select from Dropdown)', key: 'category', width: 25 },
            { header: 'Unit', key: 'unit', width: 12 },
            { header: 'Retail Price', key: 'price', width: 15 },
            { header: 'Doctor Price', key: 'doctor_price', width: 15 },
            { header: 'Purchase Price', key: 'buy_price', width: 15 },
            { header: 'Stock', key: 'stock', width: 12 },
            { header: 'Min Alert Qty', key: 'min_stock', width: 15 },
            { header: 'Expiry (YYYY-MM-DD)', key: 'expiry', width: 20 },
            { header: 'Barcode', key: 'barcode', width: 20 },
            { header: 'Total Value (AUTO)', key: 'total_value', width: 20 }
        ];

        // 2. Style Header Row (Multi-Color Branding)
        const headerRow = worksheet.getRow(1);
        headerRow.height = 35;
        
        const headerColors = {
            'name': 'FF059669', 'manufacturer': 'FF059669', 'batch_no': 'FF059669',
            'category': 'FF0369A1', 'unit': 'FF0369A1',
            'price': 'FF0D9488', 'doctor_price': 'FF4F46E5', 'buy_price': 'FFBE123C',
            'stock': 'FF1E293B', 'min_stock': 'FF1E293B', 'expiry': 'FF1E293B',
            'barcode': 'FF1E293B', 'total_value': 'FFD97706'
        };

        headerRow.eachCell((cell, colNumber) => {
            const key = worksheet.columns[colNumber - 1].key;
            cell.font = { name: 'Segoe UI', color: { argb: 'FFFFFFFF' }, size: 10, bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: headerColors[key] || 'FF64748B' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 3. Add Data Validation (Dropdowns)
        const categoryOptions = ['Medicine', 'Vaccine', 'Syrup', 'Tablet', 'Injection', 'Surgical', 'Pet Food', 'Accessories', 'Feed', 'Other'];
        const unitOptions = ['PCS', 'Strip', 'Pack', 'Vial', 'Injection', 'Bottle', 'Box', 'Kg', 'Gram', 'ML'];
        
        for (let i = 2; i <= 500; i++) {
            // Category Dropdown
            worksheet.getCell(`D${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${categoryOptions.join(',')}"`]
            };

            // Unit Dropdown
            worksheet.getCell(`E${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${unitOptions.join(',')}"`]
            };
            
            // Add Formula for Total Value
            worksheet.getCell(`O${i}`).value = { formula: `I${i}*H${i}` };
            worksheet.getCell(`O${i}`).numFmt = '"Rs "#,##0.00';
            worksheet.getCell(`O${i}`).font = { bold: true, color: { argb: 'FFB45309' } };
        }

        // 4. Add Sample Rows with formatting
        const sampleRows = [
            {
                name: 'Augmentin 625mg',
                manufacturer: 'GSK',
                batch_no: 'AUG-786',
                category: 'Tablet',
                unit: 'Pack',
                price: 1200,
                doctor_price: 1100,
                buy_price: 950,
                stock: 50,
                min_stock: 5,
                expiry: '2026-10-15',
                barcode: '501234567890'
            },
            {
                name: 'Vancept Vaccine',
                manufacturer: 'Zoetis',
                batch_no: 'VAC-22',
                category: 'Vaccine',
                unit: 'Vial',
                price: 3500,
                doctor_price: 3200,
                buy_price: 2800,
                stock: 20,
                min_stock: 2,
                expiry: '2025-05-20',
                barcode: '998877665544'
            }
        ];

        sampleRows.forEach((row, idx) => {
            const addedRow = worksheet.addRow(row);
            addedRow.height = 25;
            addedRow.eachCell((cell) => {
                cell.font = { name: 'Segoe UI', size: 10 };
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            });
        });

        // 5. Generate & Download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Bilal_Vet_Inventory_Template.xlsx';
        anchor.click();
        window.URL.revokeObjectURL(url);

        toast.success("Premium Excel Template Downloaded!");
    };

    const handleImportFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const dataArray = new Uint8Array(evt.target.result);
                const wb = XLSX.read(dataArray, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' });

                // Filter out empty rows (where name is missing or blank)
                const data = rawData.filter(row => row['Medicine Name'] && row['Medicine Name'].toString().trim().length > 0);

                if (data.length === 0) {
                    toast.error("File is empty!");
                    return;
                }

                setIsSaving(true);
                const importToast = toast.loading(`Analyzing ${data.length} products...`);

                const formattedData = data.map(row => {
                    let rawExpiry = row['Expiry (YYYY-MM-DD)'];
                    let finalExpiry = null;
                    
                    if (rawExpiry) {
                        const dateObj = new Date(rawExpiry);
                        if (!isNaN(dateObj.getTime())) {
                            finalExpiry = dateObj.toISOString().split('T')[0];
                        }
                    }

                    return {
                        name: row['Medicine Name'] || 'Unknown Product',
                        manufacturer: row['Manufacturer'] || '',
                        batch_no: row['Batch No'] || '',
                        category: row['Category (Select from Dropdown)'] || row['Category'] || 'Medicine',
                        unit: row['Unit'] || 'Units',
                        price: parseFloat(row['Retail Price'] || 0),
                        doctor_price: parseFloat(row['Doctor Price'] || row['Retail Price'] || 0),
                        buy_price: parseFloat(row['Purchase Price'] || 0),
                        stock: parseInt(row['Stock'] || 0),
                        min_stock: parseInt(row['Min Alert Qty'] || 5),
                        expiry: finalExpiry,
                        barcode: row['Barcode']?.toString() || null,
                        initial_stock: parseInt(row['Stock'] || 0),
                        total_sold: 0
                    };
                });

                // Smart Upsert Logic: Match by Name and Batch No
                const { data: existingItems } = await supabase.from('inventory').select('id, name, batch_no, initial_stock, total_sold');
                
                const finalUpsertData = formattedData.map(newItem => {
                    const match = existingItems?.find(old => 
                        old.name.trim().toLowerCase() === newItem.name.trim().toLowerCase() && 
                        (old.batch_no || '').trim().toLowerCase() === (newItem.batch_no || '').trim().toLowerCase()
                    );
                    
                    if (match) {
                        return { 
                            ...newItem, 
                            id: match.id,
                            initial_stock: match.initial_stock || newItem.initial_stock, // Keep old if exists
                            total_sold: match.total_sold || 0 // Preserve sales history
                        };
                    }
                    return newItem; // Insert new
                });

                // Hybrid Bulk Smart Save (Bulk with Individual Fallback)
                let successCount = 0;
                let failCount = 0;
                const chunkSize = 50;

                for (let i = 0; i < finalUpsertData.length; i += chunkSize) {
                    const chunk = finalUpsertData.slice(i, i + chunkSize);
                    toast.loading(`Importing: ${i} / ${data.length} products...`, { id: importToast });
                    
                    // 1. Try Bulk Upsert (Fastest)
                    const { error: bulkError } = await supabase.from('inventory').upsert(chunk);
                    
                    if (!bulkError) {
                        successCount += chunk.length;
                    } else {
                        // 2. Fallback to Individual (Robust) if bulk fails
                        console.warn("Bulk chunk failed, falling back to individual processing for this chunk...", bulkError);
                        for (const item of chunk) {
                            try {
                                if (item.id) {
                                    const { error: upError } = await supabase.from('inventory').update(item).eq('id', item.id);
                                    if (upError) throw upError;
                                } else {
                                    const { error: inError } = await supabase.from('inventory').insert([item]);
                                    if (inError) throw inError;
                                }
                                successCount++;
                            } catch (err) {
                                console.error(`Individual save failed for: ${item.name}`, err);
                                failCount++;
                            }
                        }
                    }
                }

                toast.dismiss(importToast);
                if (failCount === 0) {
                    toast.success(`Success! ${successCount} products imported.`);
                } else {
                    toast.success(`${successCount} imported, ${failCount} failed. Check console for details.`);
                }
                
                setIsImportModalOpen(false);
                window.location.reload(); 
            } catch (err) {
                console.error("Critical Import Error:", err);
                toast.error("Critical Error during import processing.");
            } finally {
                setIsSaving(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            gap: window.innerWidth <= 480 ? '10px' : '15px', 
            overflow: 'hidden', 
            backgroundColor: '#f0f4f8',
            padding: window.innerWidth <= 480 ? '10px' : '0'
        }}>

            {/* 1. PROFESSIONAL HEADER */}
            <header style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth <= 768 ? 'stretch' : 'center', 
                background: 'white', 
                padding: window.innerWidth <= 480 ? '15px' : '15px 20px', 
                borderBottom: '3px solid #059669', 
                borderRadius: '12px', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                gap: '15px'
            }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.1rem' : '1.4rem', fontWeight: 900, color: '#065f46', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Box size={window.innerWidth <= 480 ? 20 : 24} color="#10b981" /> PHARMACY INVENTORY
                    </h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Real-time stock monitoring & control.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setIsImportModalOpen(true)} className="btn-erp" style={{ flex: 1, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <ArrowUpCircle size={14} /> IMPORT
                    </button>
                    <button onClick={handleExport} className="btn-erp" style={{ flex: 1, background: '#f8fafc', color: '#64748b', padding: '10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <Download size={14} /> EXPORT
                    </button>
                    <button className="btn-erp" onClick={() => { setEditingItem(null); setIsModalOpen(true); }} style={{ flex: 2, background: '#10b981', color: 'white', padding: '10px 15px', fontWeight: 800, fontSize: '0.75rem' }}><Plus size={16} /> ADD MEDICINE</button>
                </div>
            </header>

            {/* 2. SEARCH & FILTER BAR */}
            <div style={{ 
                background: 'white', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px', 
                padding: '12px', 
                display: 'flex', 
                flexDirection: window.innerWidth <= 1024 ? 'column' : 'row',
                gap: '12px', 
                alignItems: window.innerWidth <= 1024 ? 'stretch' : 'center' 
            }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                    <input 
                        type="text" 
                        placeholder="Search by Name, Formula, or SKU..." 
                        style={{ width: '100%', padding: '10px 15px 10px 40px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }} 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <select style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: '#f8fafc' }} value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option>All Categories</option>
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <select style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: '#f0f9ff', color: '#0369a1' }} value={selectedManufacturer} onChange={e => setSelectedManufacturer(e.target.value)}>
                        <option>All Companies</option>
                        {manufacturers.map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* 3. INVENTORY DISPLAY */}
            <div style={{ 
                flex: 1,
                background: window.innerWidth <= 768 ? 'transparent' : 'white', 
                border: window.innerWidth <= 768 ? 'none' : '1px solid #e2e8f0', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                boxShadow: window.innerWidth <= 768 ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.1)' 
            }}>
                <div style={{ overflowY: 'auto', height: '100%', paddingBottom: window.innerWidth <= 768 ? '20px' : '0' }}>
                    {window.innerWidth > 768 ? (
                        <table className="erp-table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#065f46', color: 'white' }}>
                                <tr>
                                    <th style={{ padding: '15px 20px' }}>BARCODE</th>
                                    <th style={{ padding: '15px 20px' }}>DESCRIPTION</th>
                                    <th style={{ padding: '15px 20px' }}>CATEGORY</th>
                                    <th style={{ padding: '15px 20px' }}>STOCK</th>
                                    {isAdmin && <th style={{ padding: '15px 20px' }}>PURCHASE</th>}
                                    <th style={{ padding: '15px 20px' }}>RETAIL</th>
                                    {isAdmin && <th style={{ padding: '15px 20px' }}>DOCTOR</th>}
                                    <th style={{ padding: '15px 20px' }}>EXPIRY</th>
                                    <th style={{ padding: '15px 20px', textAlign: 'right' }}>ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '15px 20px' }}>
                                            {item.barcode ? <Barcode value={item.barcode} height={30} width={1.2} fontSize={10} background="transparent" /> : <span style={{ fontSize: '0.6rem', color: '#cbd5e1' }}>NO BARCODE</span>}
                                        </td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                                                <span>Unit: {item.unit}</span>
                                                {item.batch_no && <span style={{ color: '#ef4444', fontWeight: 900 }}>• BATCH: {item.batch_no}</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '15px 20px' }}><span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '4px 8px', background: '#ecfdf5', borderRadius: '4px', color: '#047857' }}>{item.category?.toUpperCase()}</span></td>
                                        <td style={{ padding: '15px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 950, color: item.stock <= (item.min_stock || 5) ? '#ef4444' : '#1e293b' }}>{item.stock}</span>
                                                {item.stock <= (item.min_stock || 5) && <AlertCircle size={14} color="#ef4444" />}
                                            </div>
                                        </td>
                                        {isAdmin && <td style={{ padding: '15px 20px', fontWeight: 800, color: '#64748b' }}>Rs {item.buy_price || 0}</td>}
                                        <td style={{ padding: '15px 20px', fontWeight: 900, color: '#059669', fontSize: '1.1rem' }}>Rs {item.price.toLocaleString()}</td>
                                        {isAdmin && <td style={{ padding: '15px 20px', fontWeight: 800, color: '#6366f1' }}>Rs {(item.doctor_price || item.price).toLocaleString()}</td>}
                                        <td style={{ padding: '15px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{item.expiry || '-'}</td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => openAudit(item)} title="Stock Audit & History" style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#7c3aed' }}><History size={16} /></button>
                                                {isAdmin && <button onClick={() => openRestock(item)} title="Restock" style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#059669' }}><RefreshCw size={16} /></button>}
                                                <button onClick={() => openEdit(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#64748b' }}><Edit3 size={16} /></button>
                                                {isAdmin && <button onClick={() => handleDelete(item.id)} style={{ background: '#fff1f1', border: '1px solid #fee2e2', padding: '8px', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {filteredItems.map(item => {
                                const isLowStock = item.stock <= (item.min_stock || 5);
                                return (
                                    <motion.div 
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{ 
                                            background: 'white', 
                                            borderRadius: '16px', 
                                            padding: '15px', 
                                            border: isLowStock ? '1px solid #fecaca' : '1px solid #e2e8f0',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>{item.name}</div>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '3px 8px', background: '#f1f5f9', borderRadius: '4px', color: '#475569' }}>{item.category?.toUpperCase()}</span>
                                                    {item.batch_no && <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#ef4444' }}>BATCH: {item.batch_no}</span>}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 950, color: isLowStock ? '#ef4444' : '#065f46' }}>{item.stock}</div>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8' }}>{item.unit.toUpperCase()}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>RETAIL PRICE</p>
                                                <p style={{ fontSize: '0.9rem', fontWeight: 950, color: '#059669' }}>Rs {item.price.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>EXPIRY</p>
                                                <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{item.expiry || '-'}</p>
                                            </div>
                                            {isAdmin && (
                                                <>
                                                    <div>
                                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>PURCHASE</p>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>Rs {item.buy_price || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>DOCTOR</p>
                                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6366f1' }}>Rs {(item.doctor_price || item.price).toLocaleString()}</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => openAudit(item)} style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '10px', borderRadius: '8px', color: '#7c3aed' }}><History size={18} /></button>
                                                {isAdmin && <button onClick={() => openRestock(item)} style={{ background: '#ecfdf5', border: '1px solid #10b981', padding: '10px', borderRadius: '8px', color: '#059669' }}><RefreshCw size={18} /></button>}
                                                <button onClick={() => openEdit(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px', color: '#64748b' }}><Edit3 size={18} /></button>
                                            </div>
                                            {isAdmin && <button onClick={() => handleDelete(item.id)} style={{ background: '#fff1f1', border: '1px solid #fee2e2', padding: '10px', borderRadius: '8px', color: '#ef4444' }}><Trash2 size={18} /></button>}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* AUDIT MODAL */}
            <AnimatePresence>
                {isAuditModalOpen && auditItem && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '15px' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: '#7c3aed', padding: window.innerWidth <= 480 ? '15px 20px' : '25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 950, display: 'flex', alignItems: 'center', gap: '10px' }}><History size={20} /> AUDIT TRAIL</h3>
                                    <p style={{ fontSize: '0.7rem', opacity: 0.9, fontWeight: 700 }}>{auditItem.name}</p>
                                </div>
                                <button onClick={() => setIsAuditModalOpen(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                            </div>

                            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ background: '#f5f3ff', padding: '12px', borderRadius: '12px', border: '1px solid #ddd6fe' }}>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#7c3aed', marginBottom: '4px' }}>OPENING</p>
                                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#4c1d95' }}>{auditItem.initial_stock || 0}</h4>
                                    </div>
                                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '12px', border: '1px solid #d1fae5' }}>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#059669', marginBottom: '4px' }}>RESTOCKED</p>
                                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#064e3b' }}>{(auditItem.restock_history || []).reduce((acc, h) => acc + h.quantity, 0)}</h4>
                                    </div>
                                    <div style={{ background: '#fff1f2', padding: '12px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 900, color: '#e11d48', marginBottom: '4px' }}>SOLD</p>
                                        <h4 style={{ fontSize: '1.2rem', fontWeight: 950, color: '#881337' }}>{auditItem.total_sold || 0}</h4>
                                    </div>
                                </div>

                                <h5 style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', marginBottom: '12px' }}>RESTOCK LOGS</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(auditItem.restock_history || []).length > 0 ? (
                                        auditItem.restock_history.map((log, idx) => (
                                            <div key={idx} style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e293b' }}>+{log.quantity} Units</p>
                                                    <p style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 700 }}>{new Date(log.date).toLocaleDateString()}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669' }}>Cost: Rs {log.buy_price}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #f1f5f9', borderRadius: '16px' }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700 }}>No history found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
                                <button onClick={() => setIsAuditModalOpen(false)} style={{ width: window.innerWidth <= 480 ? '100%' : 'auto', padding: '12px 25px', background: '#f1f5f9', border: 'none', borderRadius: '10px', color: '#475569', fontWeight: 800 }}>CLOSE</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ENROLL MODAL */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: window.innerWidth <= 480 ? '0' : '20px', backdropFilter: 'blur(4px)' }}>
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} style={{ background: 'white', width: '100%', maxWidth: '700px', borderRadius: window.innerWidth <= 480 ? '0' : '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', maxHeight: '100vh', display: 'flex', flexDirection: 'column', height: window.innerWidth <= 480 ? '100%' : 'auto' }}>
                        <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)', padding: '18px 25px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}><Plus size={20} /> {editingItem ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1.5fr 1fr', gap: '15px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '6px' }}>MEDICINE NAME</label>
                                    <input required placeholder="Name & Strength" style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', fontWeight: 700 }} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    {nameSuggestion && formData.name && nameSuggestion.toLowerCase() !== formData.name.toLowerCase() && (
                                        <div style={{ position: 'absolute', left: '12px', top: '34px', color: '#cbd5e1', pointerEvents: 'none', fontSize: '1rem', fontWeight: 700 }}>
                                            {formData.name}<span style={{ color: '#94a3b8' }}>{nameSuggestion.slice(formData.name.length)}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444', display: 'block', marginBottom: '6px' }}>BATCH NO</label>
                                    <input placeholder="B-204" style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '1rem', fontWeight: 700 }} value={formData.batch_no} onChange={e => setFormData({ ...formData, batch_no: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr 1fr' : '1fr 1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>CATEGORY</label>
                                    <select style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem' }} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                        {categories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>UNIT</label>
                                    <input placeholder="Strip/Vial" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem' }} value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                </div>
                                <div style={{ gridColumn: window.innerWidth <= 480 ? 'span 2' : 'span 1' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>MANUFACTURER</label>
                                    <input placeholder="Company" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem' }} value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                                {isAdmin && (
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>PURCHASE PRICE</label>
                                        <input type="number" required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.buy_price} onChange={e => setFormData({ ...formData, buy_price: e.target.value })} />
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#059669', display: 'block', marginBottom: '4px' }}>RETAIL PRICE</label>
                                    <input type="number" required style={{ width: '100%', padding: '10px', border: '1px solid #059669', borderRadius: '8px', fontWeight: 800 }} value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#6366f1', display: 'block', marginBottom: '4px' }}>DOCTOR PRICE</label>
                                    <input type="number" style={{ width: '100%', padding: '10px', border: '1px solid #6366f1', borderRadius: '8px', fontWeight: 800 }} value={formData.doctor_price} onChange={e => setFormData({ ...formData, doctor_price: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>STOCK</label>
                                    <input type="number" required style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#ef4444', display: 'block', marginBottom: '4px' }}>MIN ALERT</label>
                                    <input type="number" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>EXPIRY</label>
                                    <input type="date" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.expiry} onChange={e => setFormData({ ...formData, expiry: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>CRITICAL DAYS</label>
                                    <input type="number" style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 800 }} value={formData.critical_days} onChange={e => setFormData({ ...formData, critical_days: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '12px' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', display: 'block', marginBottom: '4px' }}>BARCODE / SKU</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input placeholder="Scan barcode" style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem' }} value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} />
                                    <button type="button" onClick={() => setFormData({ ...formData, barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString() })} style={{ padding: '10px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem' }}>GENERATE</button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingBottom: window.innerWidth <= 480 ? '10px' : '0' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 800 }}>CANCEL</button>
                                <button type="submit" disabled={isSaving} style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', fontWeight: 900, opacity: isSaving ? 0.7 : 1 }}>
                                    {isSaving ? 'SAVING...' : (editingItem ? 'UPDATE' : 'ENROLL')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* RESTOCK MODAL */}
            {isRestockModalOpen && restockItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ background: '#10b981', padding: '20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 950 }}><Layers size={20} /> RESTOCK</h3>
                            <button onClick={() => setIsRestockModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleRestock} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>QTY TO ADD</label>
                                <input type="number" required placeholder="100" style={{ width: '100%', padding: '12px', border: '2px solid #10b981', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 950 }} value={restockQty} onChange={e => setRestockQty(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b' }}>COST PER UNIT</label>
                                <input type="number" required placeholder="Cost" style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 950 }} value={restockBuyPrice} onChange={e => setRestockBuyPrice(e.target.value)} />
                            </div>
                            <button type="submit" disabled={isSaving} style={{ width: '100%', padding: '15px', background: '#10b981', color: 'white', borderRadius: '10px', fontWeight: 950, opacity: isSaving ? 0.7 : 1 }}>CONFIRM</button>
                        </form>
                    </motion.div>
                </div>
            )}
            {/* IMPORT MODAL */}
            <AnimatePresence>
                {isImportModalOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(10px)' }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div style={{ background: '#0369a1', padding: '25px', color: 'white', textAlign: 'center' }}>
                                <ArrowUpCircle size={40} style={{ marginBottom: '15px' }} />
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 950 }}>Bulk Import Inventory</h3>
                                <p style={{ fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>Quickly add hundreds of products via Excel</p>
                            </div>
                            
                            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: '#f0f9ff', border: '2px dashed #0ea5e9', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1', marginBottom: '12px' }}>Step 1: Download Format</p>
                                    <button 
                                        onClick={downloadTemplate}
                                        style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                                    >
                                        DOWNLOAD TEMPLATE
                                    </button>
                                </div>

                                <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '12px' }}>Step 2: Upload Filled File</p>
                                    <input 
                                        type="file" 
                                        accept=".xlsx, .xls" 
                                        onChange={handleImportFile}
                                        style={{ display: 'none' }} 
                                        id="import-file-input" 
                                    />
                                    <label 
                                        htmlFor="import-file-input"
                                        style={{ display: 'inline-block', background: '#10b981', color: 'white', padding: '12px 25px', borderRadius: '8px', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer' }}
                                    >
                                        SELECT EXCEL FILE
                                    </label>
                                </div>

                                <button 
                                    onClick={() => setIsImportModalOpen(false)}
                                    style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}
                                >
                                    CANCEL
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Inventory;
