import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import UpdateChecker from '../components/UpdateChecker';
import { supabase } from '../supabase';
import { Settings as SettingsIcon, Lock, ShieldCheck, Key, AlertCircle, Loader2, FileText, Database, History, Globe, RefreshCw, Download, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user } = useSelector(state => state.auth);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [terminalPin, setTerminalPin] = useState(localStorage.getItem('bilal_vet_terminal_pin') || '1234');
    const [activeTab, setActiveTab] = useState('security');
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match!");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) throw error;

            toast.success("Password updated successfully in Supabase!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Failed to update password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePin = (e) => {
        e.preventDefault();
        if (terminalPin.length !== 4) {
            toast.error("PIN must be exactly 4 digits!");
            return;
        }
        localStorage.setItem('bilal_vet_terminal_pin', terminalPin);
        toast.success("Terminal Security PIN updated!");
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: window.innerWidth <= 768 ? '10px' : '20px', overflowY: 'auto' }}>
            <header style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div>
                    <h2 style={{ fontSize: window.innerWidth <= 480 ? '1.2rem' : '1.8rem', fontWeight: 950, color: '#1e293b' }}>SYSTEM SETUP</h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Manage security, terminal locks, and view software documentation.</p>
                </div>
                <div style={{ background: '#0f172a', color: 'white', padding: '12px', borderRadius: '12px' }}>
                    <SettingsIcon size={28} />
                </div>
            </header>

            <div style={{
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                gap: '20px',
                flex: 1
            }}>
                {/* Side Navigation */}
                <div style={{
                    padding: '15px',
                    minWidth: window.innerWidth <= 768 ? '100%' : '280px',
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    height: 'fit-content',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <button
                        onClick={() => setActiveTab('security')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'security' ? '#eff6ff' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'security' ? '#2563eb' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Lock size={18} />
                        Security Settings
                    </button>
                    <button
                        onClick={() => setActiveTab('backup')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'backup' ? '#f0fdf4' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'backup' ? '#16a34a' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <Database size={18} />
                        Cloud Registry Backup
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'audit' ? '#fff7ed' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'audit' ? '#ea580c' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <History size={18} />
                        System Activity Log
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        style={{ width: '100%', padding: '14px', background: activeTab === 'docs' ? '#f5f3ff' : 'transparent', border: 'none', borderRadius: '10px', color: activeTab === 'docs' ? '#7c3aed' : '#64748b', fontWeight: 800, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: '0.2s' }}
                    >
                        <ShieldCheck size={18} />
                        Software Documentation
                    </button>

                    <div style={{ marginTop: '30px' }}>
                        <UpdateChecker />
                    </div>
                </div>

                {/* Main Content */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    flex: 1,
                    padding: window.innerWidth <= 480 ? '20px' : '40px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)'
                }}>
                    {activeTab === 'security' ? (
                        <>
                            <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', marginBottom: '8px' }}>Change Access Password</h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Update your terminal login credentials. Re-authentication will be required.</p>
                            </div>

                            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>Current Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Key size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="••••••••"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr',
                                    gap: '20px'
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>New Password</label>
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="Min 6 chars"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>Confirm New Password</label>
                                        <input
                                            type="password"
                                            required
                                            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', fontWeight: 600, outline: 'none' }}
                                            placeholder="Re-type new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <AlertCircle size={22} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6, fontWeight: 600 }}>
                                        <strong>Security Note:</strong> Changing your password will synchronize across all active sessions. Ensure you update it on all terminal devices.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{ padding: '18px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                >
                                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : "UPDATE SECURITY CREDENTIALS"}
                                </button>
                            </form>

                            <div style={{ marginTop: '50px', paddingTop: '40px', borderTop: '2px dashed #f1f5f9' }}>
                                <div style={{ marginBottom: '25px' }}>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4338ca', marginBottom: '8px' }}>Terminal Safety PIN</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>This PIN is required to leave the Sale Terminal and access the administrative Dashboard.</p>
                                </div>

                                <form onSubmit={handleUpdatePin} style={{
                                    display: 'flex',
                                    flexDirection: window.innerWidth <= 480 ? 'column' : 'row',
                                    alignItems: window.innerWidth <= 480 ? 'stretch' : 'flex-end',
                                    gap: '20px'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '10px' }}>New 4-Digit Security PIN</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#4338ca' }} />
                                            <input
                                                type="password"
                                                maxLength={4}
                                                style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '8px', outline: 'none' }}
                                                placeholder="1234"
                                                value={terminalPin}
                                                onChange={(e) => setTerminalPin(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" style={{ padding: '18px 35px', background: '#4338ca', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer', fontSize: '0.95rem' }}>
                                        SAVE PIN
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            {/* DEVELOPED BY SECTION */}
                            <div style={{ textAlign: 'center', marginBottom: '40px', padding: '35px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderRadius: '24px', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ width: '70px', height: '70px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.2)' }}>
                                        <ShieldCheck size={38} color='#10b981' />
                                    </div>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '3px', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase' }}>OFFICIAL SOFTWARE LICENSE</h4>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 950, marginBottom: '5px' }}>Asper InfoTech <span style={{ color: '#38bdf8' }}>Private Limited</span></h2>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>SECP Registered | PSEB Certified Enterprise Solutions</p>
                                </div>
                                <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.05 }}>
                                    <ShieldCheck size={200} />
                                </div>
                            </div>

                            {/* LEGAL DOCUMENT VIEWER */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
                                <div style={{ background: 'white', padding: '15px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <FileText size={18} color='#64748b' />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#475569' }}>EULA DOCUMENT: AINF-EULA-MED-POS-2026-001</span>
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px' }}>v1.0.2 STABLE</span>
                                </div>

                                <div style={{ maxHeight: '700px', overflowY: 'auto', padding: '40px', color: '#1e293b', background: '#ffffff', fontFamily: '"Courier New", monospace', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                                    {EULA_CONTENT}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;

const EULA_CONTENT = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END-USER SOFTWARE LICENSE AGREEMENT (EULA)
MEDICAL POS: PHARMACY EDITION
ENGINEERED & DEVELOPED BY ASPER INFOTECH PRIVATE LIMITED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Document Reference  : AINF-EULA-MED-POS-2026-001
Version             : 1.0.2 Stable | Build #20260507
Effective Date      : 7th May, 2026
Jurisdiction        : Islamic Republic of Pakistan
Governing Law       : Pakistan Electronic Crimes Act 2016 (PECA),
                      Prevention of Electronic Crimes Act, Companies Act 2017,
                      Drug Regulatory Authority of Pakistan (DRAP) Regulations,
                      and applicable provincial pharmacy legislation.
Issuing Authority   : Asper InfoTech Private Limited
SECP Registered | PSEB Certified
Enterprise Software Solutions & Digital Ecosystems
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PLEASE READ THIS END-USER LICENSE AGREEMENT ("AGREEMENT" OR "EULA")
CAREFULLY BEFORE INSTALLING, ACCESSING, OR USING THE SOFTWARE PRODUCT
IDENTIFIED HEREIN. BY CLICKING "I ACCEPT," BY INSTALLING THE SOFTWARE,
OR BY USING ANY PORTION OF THE SOFTWARE, YOU ("LICENSEE" OR "CLIENT")
ACKNOWLEDGE THAT YOU HAVE READ THIS AGREEMENT, UNDERSTAND IT, AND AGREE
TO BE BOUND BY ITS TERMS AND CONDITIONS.

IF YOU DO NOT AGREE TO THE TERMS OF THIS AGREEMENT, DO NOT INSTALL,
ACCESS, OR USE THE SOFTWARE. YOUR USE OF THE SOFTWARE IS EXPRESSLY
CONDITIONED UPON YOUR ACCEPTANCE OF THESE TERMS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


═══════════════════════════════════════════════════════════════════════════════
TABLE OF CONTENTS
═══════════════════════════════════════════════════════════════════════════════

PART I    — PREAMBLE & INTRODUCTION
PART II   — DEFINITIONS & INTERPRETATIONS
PART III  — GRANT OF LICENSE
PART IV   — LICENSE RESTRICTIONS & PROHIBITED USES
PART V    — INTELLECTUAL PROPERTY RIGHTS
PART VI   — INSTALLATION & ACTIVATION
PART VII  — SOFTWARE UPDATES & VERSIONING POLICY
PART VIII — TECHNICAL SUPPORT & MAINTENANCE OBLIGATIONS
PART IX   — CLIENT RESPONSIBILITIES & OBLIGATIONS
PART X    — PRIVACY POLICY & DATA PROTECTION
PART XI   — DATA SECURITY & ENCRYPTION STANDARDS
PART XII  — CLOUD INFRASTRUCTURE & DATABASE POLICY
PART XIII — PAYMENT, SUBSCRIPTION & BILLING TERMS
PART XIV  — WARRANTY DISCLAIMER
PART XV   — LIMITATION OF LIABILITY
PART XVI  — INDEMNIFICATION
PART XVII — PHARMACEUTICAL & REGULATORY COMPLIANCE
PART XVIII— TERMINATION OF AGREEMENT
PART XIX  — CONFIDENTIALITY
PART XX   — FORCE MAJEURE
PART XXI  — GOVERNING LAW & DISPUTE RESOLUTION
PART XXII — MISCELLANEOUS PROVISIONS
PART XXIII— CONTACT & NOTICE INFORMATION
PART XXIV — SCHEDULE A: PERMITTED HARDWARE ENVIRONMENT
PART XXV  — SCHEDULE B: SERVICE LEVEL DEFINITIONS
PART XXVI — SCHEDULE C: EXCLUDED COMPONENTS
APPENDIX  — ACKNOWLEDGEMENT & ACCEPTANCE CERTIFICATE


═══════════════════════════════════════════════════════════════════════════════
PART I — PREAMBLE & INTRODUCTION
═══════════════════════════════════════════════════════════════════════════════

1.1  ABOUT ASPER INFOTECH PRIVATE LIMITED
─────────────────────────────────────────
Asper InfoTech Private Limited (hereinafter referred to as "Asper InfoTech,"
"the Company," "the Developer," or "Licensor") is a duly incorporated private
limited company registered under the Companies Act, 2017, with the Securities
and Exchange Commission of Pakistan (SECP), and is certified by the Pakistan
Software Export Board (PSEB).

Asper InfoTech specializes in the development of bespoke enterprise software
solutions, including but not limited to Enterprise Resource Planning (ERP)
systems, Point of Sale (POS) systems, mobile applications, artificial
intelligence-powered digital ecosystems, and web-based platforms. The Company
maintains its primary operations in Pakistan and serves clients across
domestic and international markets.

Asper InfoTech's mission is to bridge the gap between complex business logic
and intuitive user experiences, delivering high-integrity digital
infrastructure to industries including healthcare, pharmacy, retail, logistics,
and finance.

1.2  ABOUT THE LICENSED SOFTWARE
─────────────────────────────────
Medical POS: Pharmacy Edition (hereinafter referred to as "the Software,"
"the System," or "the Application") is a proprietary Point of Sale and
inventory management system specifically engineered for use in licensed
pharmacies, medical stores, drug dispensaries, and allied healthcare retail
establishments.

The Software is designed to facilitate:
(a) Retail pharmaceutical sales and invoice generation;
(b) Medicine inventory tracking and stock management;
(c) Expiry date monitoring and near-expiry alerts;
(d) Patient/customer profile management;
(e) Supplier and purchase order management;
(f) Financial reporting, daily closing, and audit trails;
(g) Multi-user role-based access control;
(h) Real-time cloud synchronization via Supabase infrastructure;
(i) Barcode and QR-based product identification;
(j) Profit, loss, and margin analysis dashboards.

1.3  PURPOSE OF THIS AGREEMENT
────────────────────────────────
This End-User License Agreement establishes the legal framework under which
the Software is licensed — not sold — to the Licensee. This Agreement governs
all aspects of the Licensee's interaction with the Software, including
installation, operation, data handling, support entitlements, and obligations
of both parties. This Agreement supersedes all prior oral or written
understandings between the parties regarding the Software, unless separately
executed in writing by authorized representatives of both parties.

1.4  PARTIES TO THIS AGREEMENT
───────────────────────────────
LICENSOR:  Asper InfoTech Private Limited
Enterprise Software Solutions & Digital Ecosystems
SECP Registered | PSEB Certified
Pakistan

LICENSEE:  The individual, pharmacy, medical store, clinic, or business
entity that has purchased, subscribed to, or activated the
Software for use at a defined business premises.

Both parties agree that this Agreement shall be legally binding upon
execution, activation, or first use of the Software, whichever occurs first.


═══════════════════════════════════════════════════════════════════════════════
PART II — DEFINITIONS & INTERPRETATIONS
═══════════════════════════════════════════════════════════════════════════════

2.1  DEFINED TERMS
────────────────────
For the purposes of this Agreement, the following terms shall have the
meanings ascribed to them below:

"Activation Key" means a unique alphanumeric string issued by Asper InfoTech
upon purchase of a license, required to unlock the full functionality of the
Software on an authorized device or premises.

"Authorized Premises" means the single physical business location — pharmacy,
medical store, clinic, or healthcare retail outlet — at which the Software is
licensed for use, as specified in the purchase agreement or activation record.

"Authorized User" means any employee, partner, owner, or representative of
the Licensee who has been granted access credentials to the Software by the
Licensee administrator.

"Background IP" means all intellectual property, including source code,
algorithms, frameworks, database schemas, and design patterns, that existed
prior to the commencement of this Agreement and is owned by Asper InfoTech.

"Build" means a specific compiled version of the Software identified by a
unique build number (e.g., Build #20260507).

"Business Data" means all information entered into or generated by the
Software in connection with the Licensee's business operations, including
transaction records, customer profiles, inventory data, supplier details,
and financial reports.

"Cloud Infrastructure" means the server-side architecture, database services,
storage, and real-time synchronization systems hosted and maintained by
Asper InfoTech or its designated cloud service providers, including Supabase.

"Confidential Information" means any information disclosed by either party
to the other that is marked as confidential or that, by its nature, would
reasonably be understood to be confidential, including but not limited to
software source code, pricing, business processes, and customer data.

"Data Breach" means unauthorized access, disclosure, acquisition, alteration,
loss, or destruction of Business Data or Personal Data stored within the
Software or Cloud Infrastructure.

"Database Schema" means the structural design of the Software's database,
including table definitions, relationships, indices, constraints, and stored
procedures maintained by Asper InfoTech.

"Documentation" means all user manuals, technical guides, API references,
help files, and any other written or digital materials provided by Asper
InfoTech pertaining to the Software.

"DRAP" means the Drug Regulatory Authority of Pakistan, the federal body
responsible for regulating the manufacture, import, export, storage,
distribution, and sale of pharmaceutical products in Pakistan.

"Effective Date" means the date on which this Agreement becomes binding,
which is the earliest of: (a) the date the Licensee clicks "I Accept";
(b) the date of first Software installation; or (c) the date of Software
activation.

"Encryption" means the process of encoding Business Data and Personal Data
in a manner that prevents unauthorized access, using industry-standard
cryptographic protocols.

"EULA" means this End-User License Agreement in its entirety, including all
Schedules and Appendices.

"Force Majeure Event" means any event beyond the reasonable control of a
party, including acts of God, war, terrorism, natural disasters, government
actions, power failures, internet outages, or pandemic conditions.

"Intellectual Property Rights" means all patents, trademarks, service marks,
trade secrets, copyrights, design rights, database rights, and any other
proprietary rights in the Software and Documentation.

"License Fee" means the amount payable by the Licensee to Asper InfoTech
for the grant of a license to use the Software, as agreed in the purchase
or subscription agreement.

"License Term" means the duration for which the Software is licensed to the
Licensee, which may be perpetual (lifetime), annual, or monthly, as specified
in the purchase agreement.

"Licensee Data" — see "Business Data."

"Maintenance Release" means a Software update issued primarily to correct
defects, bugs, or security vulnerabilities, typically identified by a change
in the third decimal of the version number (e.g., v1.0.1 → v1.0.2).

"Major Release" means a Software update that introduces significant new
features or architectural changes, typically identified by a change in the
first or second decimal of the version number (e.g., v1.0.x → v2.0.x).

"Modification" means any alteration, adaptation, translation, reverse
engineering, decompilation, or disassembly of the Software or any part
thereof.

"Personal Data" means any information relating to an identifiable individual
stored within the Software, including patient names, contact numbers,
addresses, and purchase histories.

"PECA" means the Prevention of Electronic Crimes Act, 2016, of Pakistan.

"Permitted Use" means the use of the Software solely for the Licensee's
internal business operations at the Authorized Premises, in accordance with
this Agreement.

"Scheduled Maintenance" means planned downtime or service interruptions
conducted by Asper InfoTech to perform upgrades, patches, or infrastructure
improvements, for which advance notice is provided.

"SECP" means the Securities and Exchange Commission of Pakistan.

"Software" means Medical POS: Pharmacy Edition, including all its modules,
components, updates, patches, and associated Documentation.

"Supabase" means the open-source backend-as-a-service platform utilized by
Asper InfoTech as part of the Cloud Infrastructure for database hosting,
real-time data synchronization, and authentication services.

"Third-Party Components" means software libraries, frameworks, APIs, or
services developed by third parties that are incorporated into the Software.

"Unauthorized Use" means any use of the Software that is not expressly
permitted under this Agreement, including but not limited to use at unlicensed
premises, by unauthorized users, or for purposes other than the Permitted Use.

"Unscheduled Downtime" means service interruptions not planned by Asper
InfoTech, caused by technical failures, third-party outages, or unforeseen
circumstances.

2.2  INTERPRETATION RULES
──────────────────────────
(a) Words in the singular include the plural and vice versa.
(b) References to a "party" include that party's successors and assigns.
(c) Headings are for reference only and do not affect interpretation.
(d) The word "including" means "including without limitation."
(e) References to laws include amendments and successor legislation.
(f) If any clause conflicts with applicable law, that clause shall be
interpreted as narrowly as necessary to comply, without invalidating
the remainder of this Agreement.


═══════════════════════════════════════════════════════════════════════════════
PART III — GRANT OF LICENSE
═══════════════════════════════════════════════════════════════════════════════

3.1  LICENSE GRANT
────────────────────
Subject to the terms and conditions of this Agreement and upon payment of all
applicable License Fees, Asper InfoTech hereby grants the Licensee a limited,
non-exclusive, non-transferable, non-sublicensable, revocable license to:

(a) Install and use the Software on hardware located at the Authorized
Premises only;

(b) Allow Authorized Users to access and operate the Software for the
Permitted Use;

(c) Access the Cloud Infrastructure provided by Asper InfoTech for the
purpose of data synchronization, backup, and reporting;

(d) Download and install Maintenance Releases and patches issued by
Asper InfoTech during the active License Term;

(e) Use the Documentation solely in connection with the Licensee's
authorized use of the Software;

(f) Generate, print, and export reports, invoices, and records produced
by the Software for the Licensee's internal business use.

3.2  SINGLE-PREMISES LICENSE
─────────────────────────────
Unless a multi-site or enterprise license has been separately negotiated and
documented in a written agreement signed by an authorized representative of
Asper InfoTech, this license grants the right to operate the Software at one
(1) Authorized Premises only. Installation or use at additional locations,
branches, franchises, or separate business entities requires the purchase of
additional licenses.

3.3  CONCURRENT USER LIMITATIONS
──────────────────────────────────
The number of concurrent Authorized Users permitted to access the Software
simultaneously is determined by the license tier purchased by the Licensee,
as described in the applicable product documentation or purchase agreement.
Exceeding the permitted number of concurrent users without upgrading the
license constitutes a material breach of this Agreement.

3.4  DEMO & TRIAL LICENSE
──────────────────────────
If the Software is being used under a trial, demo, or evaluation license,
the Licensee acknowledges that:

(a) The trial license is valid for a period not exceeding thirty (30)
calendar days unless otherwise specified;

(b) Certain features of the Software may be disabled or limited during
the trial period;

(c) Business Data entered during the trial period may not be carried
forward upon expiry unless a full license is purchased;

(d) Asper InfoTech reserves the right to terminate a trial license at
any time without notice.

3.5  OWNERSHIP
──────────────
This Agreement does not constitute a sale of the Software. The Licensee
acquires only the right to use the Software as specified herein. Asper
InfoTech retains all right, title, and interest in and to the Software,
Documentation, and all copies thereof, including all Intellectual Property
Rights therein.


═══════════════════════════════════════════════════════════════════════════════
PART IV — LICENSE RESTRICTIONS & PROHIBITED USES
═══════════════════════════════════════════════════════════════════════════════

4.1  GENERAL RESTRICTIONS
──────────────────────────
The Licensee shall NOT, directly or indirectly:

(a) Copy, reproduce, or duplicate the Software or Documentation except
as expressly permitted under this Agreement;

(b) Sell, resell, rent, lease, lend, sublicense, assign, distribute,
or otherwise transfer the Software or any license rights to any
third party;

(c) Modify, adapt, translate, or create derivative works based on the
Software or any part thereof;

(d) Reverse engineer, decompile, disassemble, or attempt to derive the
source code of the Software by any means;

(e) Remove, alter, or obscure any proprietary notices, labels, copyright
notices, trademarks, or watermarks on the Software or Documentation;

(f) Use the Software to build a competing product or service, or to
benchmark the Software for competitive intelligence purposes;

(g) Install or use the Software on hardware located outside the
Authorized Premises without prior written consent from Asper InfoTech;

(h) Share access credentials with unauthorized persons or allow
simultaneous logins by the same user from multiple devices, unless
explicitly permitted by the license tier;

(i) Circumvent, disable, or interfere with any security features,
authentication mechanisms, activation systems, or access controls
within the Software;

(j) Introduce, upload, or transmit any malicious code, viruses, worms,
spyware, ransomware, or harmful data into the Software or Cloud
Infrastructure;

(k) Use the Software in any manner that violates applicable local,
national, or international laws, regulations, or professional
standards, including DRAP pharmaceutical regulations;

(l) Attempt to gain unauthorized access to any part of the Cloud
Infrastructure, database, or other systems associated with the
Software;

(m) Use automated scripts, bots, or other automated means to interact
with the Software, unless expressly authorized by Asper InfoTech;

(n) Publish, disclose, or share any portion of the Software's internal
logic, database schema, or API endpoints with any third party without
prior written authorization;

(o) Use the Software to process data belonging to persons or entities
not associated with the Licensee's own business operations;

(p) Attempt to override, manipulate, or falsify any pricing, tax,
discount, or inventory records in a manner intended to defraud
customers, suppliers, or tax authorities.

4.2  PHARMACEUTICAL RESTRICTIONS
──────────────────────────────────
In addition to the general restrictions above, the Licensee shall NOT use
the Software to:

(a) Record, dispense, or facilitate the sale of controlled substances
in violation of applicable narcotic and drug control laws of Pakistan;

(b) Generate forged or fabricated prescriptions, patient records, or
purchase receipts;

(c) Circumvent DRAP-mandated record-keeping requirements for scheduled
drugs, narcotics, or psychotropic substances;

(d) Operate the Software at a premises that is not a duly licensed
pharmacy, medical store, or healthcare facility under applicable
provincial or federal law.

4.3  CONSEQUENCES OF BREACH
────────────────────────────
Any breach of the restrictions set forth in this Part IV shall result in:

(a) Immediate suspension or termination of the license, at Asper
InfoTech's sole discretion;

(b) Forfeiture of all License Fees paid, without right of refund;

(c) Asper InfoTech's right to pursue all available legal remedies,
including injunctive relief and monetary damages;

(d) Potential reporting to PECA enforcement authorities in cases
involving cybercrime, data theft, or unauthorized system access.


═══════════════════════════════════════════════════════════════════════════════
PART V — INTELLECTUAL PROPERTY RIGHTS
═══════════════════════════════════════════════════════════════════════════════

5.1  OWNERSHIP OF SOFTWARE
───────────────────────────
The Software, including its source code, object code, interfaces, algorithms,
database structures, visual design elements, Documentation, and all
subsequent updates, modifications, and derivative works thereof, constitutes
proprietary and confidential information of Asper InfoTech and is protected
under:

(a) The Copyright Ordinance, 1962 (Pakistan);
(b) The Prevention of Electronic Crimes Act, 2016 (PECA);
(c) The Trade Marks Ordinance, 2001 (Pakistan);
(d) Applicable international intellectual property conventions to which
Pakistan is a signatory, including the Berne Convention.

Asper InfoTech retains all right, title, and interest — including all
Intellectual Property Rights — in and to the Software. Nothing in this
Agreement shall be construed as transferring any ownership rights to the
Licensee.

5.2  LICENSEE'S BUSINESS DATA
──────────────────────────────
All Business Data entered by the Licensee into the Software shall remain the
property of the Licensee. Asper InfoTech claims no ownership over the
Licensee's Business Data. However, Asper InfoTech retains the right to access
Business Data for the purposes of:

(a) Providing technical support, maintenance, and troubleshooting;
(b) Diagnosing system errors, data integrity issues, or security incidents;
(c) Complying with lawful court orders or regulatory requirements.

5.3  FEEDBACK & SUGGESTIONS
────────────────────────────
If the Licensee provides Asper InfoTech with feedback, suggestions,
recommendations, or feature requests relating to the Software ("Feedback"),
the Licensee hereby grants Asper InfoTech a perpetual, irrevocable, worldwide,
royalty-free license to use, reproduce, modify, incorporate, and commercialize
such Feedback without any obligation of confidentiality or compensation to
the Licensee.

5.4  THIRD-PARTY COMPONENTS
────────────────────────────
The Software may incorporate Third-Party Components, including open-source
libraries and frameworks. Such Third-Party Components are subject to their
respective license terms, which the Licensee acknowledges and agrees to
comply with. A list of major Third-Party Components and their applicable
licenses is available upon written request to Asper InfoTech's technical
support team.

5.5  TRADEMARKS
───────────────
"Asper InfoTech," "Medical POS: Pharmacy Edition," and associated logos and
brand identifiers are trademarks or registered trademarks of Asper InfoTech
Private Limited. The Licensee is not permitted to use these trademarks in any
manner without prior written authorization from Asper InfoTech.


═══════════════════════════════════════════════════════════════════════════════
PART VI — INSTALLATION & ACTIVATION
═══════════════════════════════════════════════════════════════════════════════

6.1  SYSTEM REQUIREMENTS
─────────────────────────
The Licensee is responsible for ensuring that the hardware and operating
environment at the Authorized Premises meets the minimum system requirements
specified in the Software Documentation or as communicated by Asper InfoTech's
technical team. Asper InfoTech makes no warranty that the Software will
function on hardware or operating systems that do not meet these requirements.

6.2  INSTALLATION RESPONSIBILITY
──────────────────────────────────
The installation of the Software shall be performed either by an authorized
representative of Asper InfoTech or by the Licensee following the official
Installation Guide provided. Asper InfoTech shall not be responsible for any
damage, data loss, or malfunction resulting from installation performed in a
manner that deviates from the official Installation Guide.

6.3  ACTIVATION
────────────────
Each valid license includes one (1) Activation Key, which is required to
unlock the full functionality of the Software. The Activation Key:

(a) Is tied to the Authorized Premises and may be linked to specific
hardware identifiers;

(b) May not be transferred, shared, or used to activate the Software
at any location other than the Authorized Premises;

(c) Shall be deactivated automatically upon expiry of the License Term
(for subscription-based licenses);

(d) May be deactivated by Asper InfoTech in the event of a material
breach of this Agreement.

6.4  RE-INSTALLATION
──────────────────────
In the event of a hardware failure, operating system reinstallation, or
device replacement, the Licensee may request re-activation of the Software
by contacting Asper InfoTech's technical support. Asper InfoTech reserves
the right to limit the number of re-activations permitted within a given
period, to prevent unauthorized duplication.

6.5  INITIAL DATA SETUP
─────────────────────────
The Licensee is solely responsible for the accuracy of all initial setup data
entered into the Software, including but not limited to:

(a) Medicine and product catalogue entries;
(b) Opening stock quantities and valuations;
(c) Supplier and customer master records;
(d) User accounts and access permissions;
(e) Pricing structures, discount policies, and tax configurations.

Asper InfoTech's technical team may provide onboarding assistance as part of
an agreed-upon implementation package; however, the ultimate accuracy of
setup data remains the Licensee's responsibility.


═══════════════════════════════════════════════════════════════════════════════
PART VII — SOFTWARE UPDATES & VERSIONING POLICY
═══════════════════════════════════════════════════════════════════════════════

7.1  TYPES OF UPDATES
──────────────────────
Asper InfoTech may release the following categories of Software updates:

(a) Maintenance Releases: Bug fixes, security patches, and minor
performance improvements. These are typically released on a rolling
basis and are automatically applied to cloud-connected installations.

(b) Minor Releases: New features, UI enhancements, and module additions
that do not break backward compatibility with existing data structures.

(c) Major Releases: Significant architectural changes, new major modules,
or platform migrations. Major Releases may require re-installation
or data migration procedures.

7.2  UPDATE ENTITLEMENT
─────────────────────────
(a) Licensees holding an active subscription license are entitled to all
Maintenance Releases and Minor Releases at no additional charge.

(b) Entitlement to Major Releases is subject to the terms of the
applicable subscription or support plan.

(c) Licensees holding a perpetual (lifetime) license are entitled to
Maintenance Releases for the version purchased. Entitlement to
Minor or Major Releases may require the purchase of an upgrade.

7.3  UPDATE PROCESS
────────────────────
Asper InfoTech shall notify the Licensee of available updates through in-app
notifications, email, or other communication channels. It is the Licensee's
responsibility to:

(a) Ensure the Software remains connected to the internet to receive
automatic updates, where applicable;

(b) Not delay the installation of security-critical patches, as failure
to do so may expose the Licensee's data to security risks;

(c) Report any issues encountered following an update to Asper InfoTech's
support team promptly.

7.4  COMPATIBILITY
───────────────────
Asper InfoTech endeavors to maintain backward compatibility of Business Data
across versions. However, in cases where a Major Release necessitates data
migration, Asper InfoTech will provide:

(a) Advance notice of at least fifteen (15) business days prior to a
mandatory migration;

(b) A migration tool or guided procedure to transfer existing data;

(c) Technical support during the migration process, subject to the
applicable support plan.

7.5  DISCONTINUED VERSIONS
────────────────────────────
Asper InfoTech may, at its discretion, discontinue support for older versions
of the Software. The Licensee will be notified no less than sixty (60)
calendar days before a version is officially discontinued. After the end-of-
life date of a version, Asper InfoTech will no longer issue security patches
or provide technical support for that version.


═══════════════════════════════════════════════════════════════════════════════
PART VIII — TECHNICAL SUPPORT & MAINTENANCE OBLIGATIONS
═══════════════════════════════════════════════════════════════════════════════

8.1  ASPER INFOTECH'S SUPPORT OBLIGATIONS
──────────────────────────────────────────
Asper InfoTech commits to providing the following support services to
Licensees holding an active license and/or support plan:

(a) CLOUD INFRASTRUCTURE MAINTENANCE
Asper InfoTech shall maintain the availability, security, and
performance of the Cloud Infrastructure used by the Software,
including Supabase database services, real-time synchronization
endpoints, and authentication systems.

(b) DEPLOYMENT OF SOFTWARE PATCHES
Asper InfoTech shall promptly develop and deploy patches to address
critical security vulnerabilities discovered in the Software or its
underlying dependencies. The target response time for critical
patches is within seventy-two (72) hours of confirmed vulnerability
identification.

(c) DATABASE SCHEMA INTEGRITY
Asper InfoTech shall maintain the structural integrity of the
Software's database schema, ensuring that data remains consistent,
retrievable, and protected against corruption arising from Software
defects or platform updates.

(d) AUTHENTICATION LAYER SECURITY
Asper InfoTech shall monitor and maintain the security of user
authentication mechanisms, including session management, password
hashing standards, and role-based access controls.

(e) BUG REPORTING & RESOLUTION
Asper InfoTech shall provide a mechanism for the Licensee to report
Software defects. Upon receipt of a verified bug report, Asper
InfoTech shall acknowledge the report within three (3) business days
and provide a resolution timeline based on the severity of the defect.

8.2  SUPPORT TIERS
────────────────────
Support services are provided based on the following tier classifications:

TIER 1 — BASIC SUPPORT
┌─────────────────────────────────────────────────────────────────────┐
│ • Email support during business hours (Monday–Saturday, 9AM–6PM)   │
│ • Response time: Within 48 business hours                          │
│ • Coverage: General usage queries, configuration guidance          │
│ • Excludes: On-site visits, custom development, data recovery      │
└─────────────────────────────────────────────────────────────────────┘

TIER 2 — STANDARD SUPPORT
┌─────────────────────────────────────────────────────────────────────┐
│ • Email + WhatsApp support (Monday–Saturday, 9AM–8PM)              │
│ • Response time: Within 24 business hours                          │
│ • Coverage: Bug resolution, system configuration, report queries   │
│ • Includes: Remote desktop assistance (scheduled)                  │
└─────────────────────────────────────────────────────────────────────┘

TIER 3 — PREMIUM SUPPORT
┌─────────────────────────────────────────────────────────────────────┐
│ • Email + WhatsApp + Phone (6 days a week, extended hours)         │
│ • Response time: Within 8 business hours for critical issues       │
│ • Coverage: Full technical support, data queries, custom reports   │
│ • Includes: Quarterly system health check, priority bug fixes      │
└─────────────────────────────────────────────────────────────────────┘

8.3  SCHEDULED MAINTENANCE WINDOWS
────────────────────────────────────
Asper InfoTech reserves the right to conduct Scheduled Maintenance on the
Cloud Infrastructure. The Licensee shall be notified of Scheduled Maintenance
at least twenty-four (24) hours in advance via in-app notification or email.
During Scheduled Maintenance:

(a) Cloud-dependent features, including real-time synchronization and
remote reporting, may be temporarily unavailable;

(b) Offline-capable features of the Software shall continue to function
normally;

(c) No data loss shall occur as a result of properly executed Scheduled
Maintenance.

8.4  EXCLUSIONS FROM SUPPORT
──────────────────────────────
The following are expressly excluded from all support tiers:

(a) Issues arising from unauthorized modifications to the Software;
(b) Hardware failures, local network problems, or ISP-related outages;
(c) Data loss caused by incorrect data entry or user errors;
(d) Problems arising from use of the Software on hardware that does not
meet the minimum system requirements;
(e) Support for third-party software, operating systems, or hardware
not supplied by Asper InfoTech;
(f) Recovery of data deleted by the Licensee or Authorized Users;
(g) Support for expired or inactive licenses.


═══════════════════════════════════════════════════════════════════════════════
PART IX — CLIENT RESPONSIBILITIES & OBLIGATIONS
═══════════════════════════════════════════════════════════════════════════════

9.1  GENERAL OBLIGATIONS
──────────────────────────
The Licensee shall:

(a) Ensure that all Authorized Users receive adequate training on the
correct operation of the Software prior to live use;

(b) Designate at least one individual as the primary system administrator
responsible for managing user accounts, permissions, and system settings;

(c) Maintain the confidentiality of all user login credentials and
prevent their disclosure to unauthorized persons;

(d) Promptly notify Asper InfoTech of any suspected unauthorized access,
security breach, or unusual system behavior;

(e) Maintain current contact information (email address, phone number)
on file with Asper InfoTech for the receipt of support communications
and update notifications;

(f) Comply with all applicable laws and regulations governing the
operation of a pharmacy or medical store.

9.2  DATA ENTRY ACCURACY
─────────────────────────
The Licensee acknowledges and accepts full responsibility for:

(a) The accuracy, completeness, and integrity of all data entered into
the Software by the Licensee or any Authorized User;

(b) Correct configuration of product codes, pricing, tax rates, and
discount structures;

(c) Timely and accurate recording of purchases, sales, returns, and
adjustments;

(d) Verification of stock counts entered into the system against physical
inventory;

(e) Proper recording of medicine expiry dates and batch numbers as
required by DRAP regulations.

Asper InfoTech disclaims all liability for financial losses, compliance
violations, or operational disruptions arising from inaccurate or incomplete
data entry by the Licensee or its Authorized Users.

9.3  HARDWARE & LOCAL INFRASTRUCTURE
──────────────────────────────────────
The Licensee is solely responsible for:

(a) Procuring, maintaining, and replacing hardware (computers, printers,
barcode scanners, cash drawers, receipt printers) required to operate
the Software;

(b) Maintaining a stable local area network (LAN) and internet connection
sufficient for the Software's cloud synchronization requirements;

(c) Protecting hardware from physical theft, damage, power surges, and
environmental hazards;

(d) Maintaining adequate power supply, including uninterruptible power
supply (UPS) units, to prevent data corruption during power outages;

(e) Keeping the operating system and antivirus software on all devices
running the Software current and updated.

9.4  INTERNET CONNECTIVITY
────────────────────────────
Certain features of the Software require an active internet connection to
function. The Licensee acknowledges that:

(a) Asper InfoTech is not responsible for the availability or quality
of the Licensee's internet service;

(b) Disruptions to cloud-based features caused by internet outages are
excluded from Asper InfoTech's support obligations;

(c) The Licensee should establish a contingency plan (e.g., a mobile
data backup connection) for business continuity during internet
outages.

9.5  DATA BACKUP RESPONSIBILITIES
───────────────────────────────────
While Asper InfoTech maintains cloud-based backups of Business Data as part
of its infrastructure obligations, the Licensee is strongly advised to:

(a) Perform regular local exports of critical Business Data as an
additional precaution;

(b) Verify the integrity of cloud backups periodically by consulting
Asper InfoTech's support team;

(c) Not rely solely on a single backup mechanism for critical business
and compliance data.

9.6  PHYSICAL SECURITY
───────────────────────
The Licensee is responsible for maintaining appropriate physical security
at the Authorized Premises to prevent unauthorized access to devices running
the Software. This includes:

(a) Restricting physical access to POS terminals to Authorized Users only;
(b) Logging off or locking the system when terminals are unattended;
(c) Reporting the theft or loss of any device running the Software to
Asper InfoTech immediately so that remote deactivation can be initiated.


═══════════════════════════════════════════════════════════════════════════════
PART X — PRIVACY POLICY & DATA PROTECTION
═══════════════════════════════════════════════════════════════════════════════

10.1  COMMITMENT TO PRIVACY
────────────────────────────
Asper InfoTech is committed to protecting the privacy and confidentiality of
all Business Data and Personal Data processed through the Software. This
Privacy Policy describes how data is collected, stored, used, and protected
in connection with the Software.

10.2  DATA COLLECTED BY THE SOFTWARE
──────────────────────────────────────
The Software may collect and store the following categories of data:

(a) BUSINESS OPERATIONAL DATA
• Product and medicine inventory records
• Purchase orders and supplier invoices
• Sales transactions and receipts
• Return and refund records
• Daily, monthly, and annual financial summaries
• Stock adjustment logs and audit trails

(b) CUSTOMER / PATIENT DATA
• Customer names and contact information
• Purchase history and prescription records
• Loyalty or account balances (where applicable)
• Payment method preferences

(c) SYSTEM & USER DATA
• Authorized User login records and session timestamps
• User activity logs for audit purposes
• Software configuration settings
• Device identifiers (for license validation)

(d) CLOUD SYNCHRONIZATION DATA
• Encrypted snapshots of all the above categories, transmitted
to and stored within the Supabase Cloud Infrastructure for
backup, synchronization, and remote access purposes.

10.3  HOW ASPER INFOTECH USES DATA
────────────────────────────────────
Asper InfoTech may access Business Data solely for the following purposes:

(a) Delivering and maintaining the Software and Cloud Infrastructure;
(b) Diagnosing and resolving technical issues reported by the Licensee;
(c) Ensuring the security and integrity of the Cloud Infrastructure;
(d) Complying with lawful judicial, regulatory, or governmental orders;
(e) Generating anonymized, aggregated statistical data for internal
product development purposes (such data shall contain no personally
identifiable information).

10.4  DATA ASPER INFOTECH WILL NEVER DO
────────────────────────────────────────
Asper InfoTech expressly commits that it shall NEVER:

(a) Sell, rent, trade, or otherwise transfer the Licensee's Business
Data or Personal Data to any third party for commercial purposes;

(b) Use the Licensee's Business Data for targeted advertising or
third-party marketing campaigns;

(c) Disclose the Licensee's Business Data to competitors, market
research firms, or any unauthorized party;

(d) Analyze the Licensee's transaction data to gain intelligence
about the Licensee's customers for any purpose other than
providing support services.

10.5  DATA RETENTION
──────────────────────
(a) Business Data stored in the Cloud Infrastructure is retained for
the duration of the active License Term plus an additional period
of ninety (90) days following license expiry, to allow the Licensee
to export data before permanent deletion.

(b) Upon formal written request from the Licensee, and following
license termination, Asper InfoTech will delete all Business Data
from its Cloud Infrastructure within thirty (30) business days,
subject to any legal retention obligations.

(c) System logs and audit trails may be retained for a longer period
as required by applicable law or for security investigation purposes.

10.6  THIRD-PARTY PROCESSORS
──────────────────────────────
Asper InfoTech utilizes Supabase as its primary cloud database and
infrastructure provider. Supabase processes data on behalf of Asper InfoTech
under data processing agreements that ensure appropriate data protection
standards. The Licensee acknowledges that data stored in the Cloud
Infrastructure is subject to Supabase's infrastructure security standards.
Asper InfoTech shall not be responsible for data breaches originating from
Supabase's own infrastructure failures, beyond Asper InfoTech's reasonable
control.

10.7  DATA SUBJECT RIGHTS
───────────────────────────
To the extent required by applicable law, individuals whose Personal Data
is stored within the Software (including patients and customers) have the
right to:

(a) Request access to their Personal Data stored in the system;
(b) Request correction of inaccurate Personal Data;
(c) Request deletion of their Personal Data, subject to legal retention
requirements.

The Licensee, as the data controller for Personal Data of its customers and
patients, is responsible for managing and responding to such requests.
Asper InfoTech will provide reasonable technical assistance to the Licensee
in fulfilling such requests, upon written notice.


═══════════════════════════════════════════════════════════════════════════════
PART XI — DATA SECURITY & ENCRYPTION STANDARDS
═══════════════════════════════════════════════════════════════════════════════

11.1  ENCRYPTION IN TRANSIT
────────────────────────────
All data transmitted between the Software and the Cloud Infrastructure is
encrypted in transit using industry-standard Transport Layer Security (TLS)
protocols. Asper InfoTech shall maintain encryption certificates and update
them as required to prevent expiry or vulnerability.

11.2  ENCRYPTION AT REST
─────────────────────────
Business Data stored within the Supabase Cloud Infrastructure is encrypted
at rest using AES-256 encryption or equivalent standards employed by the
infrastructure provider. This ensures that even in the event of unauthorized
physical access to storage media, the data remains unreadable without
the appropriate decryption keys.

11.3  AUTHENTICATION SECURITY
──────────────────────────────
The Software employs the following authentication security measures:

(a) Password hashing using bcrypt or equivalent secure hashing algorithms;
(b) Role-based access control (RBAC) ensuring users can only access
functions appropriate to their designated role;
(c) Session timeout mechanisms to prevent unauthorized access on
unattended terminals;
(d) Optional two-factor authentication (2FA) for administrative accounts,
subject to system configuration.

11.4  AUDIT LOGGING
────────────────────
The Software maintains tamper-resistant audit logs that record:

(a) All user login and logout events;
(b) Modifications to pricing, discounts, or inventory data;
(c) Deletions of transactions or customer records;
(d) Changes to user accounts or access permissions;
(e) System configuration changes.

These audit logs are accessible to the Licensee's system administrator and
may be used for internal compliance reviews or investigations.

11.5  VULNERABILITY MANAGEMENT
──────────────────────────────
Asper InfoTech shall:

(a) Conduct periodic security reviews of the Software and Cloud
Infrastructure;
(b) Monitor for known vulnerabilities in Third-Party Components
incorporated into the Software;
(c) Issue security patches in a timely manner upon discovery of
critical vulnerabilities;
(d) Notify the Licensee of any confirmed Data Breach that may affect
the Licensee's Business Data within seventy-two (72) hours of
Asper InfoTech becoming aware of such breach.

11.6  LICENSEE SECURITY RESPONSIBILITIES
─────────────────────────────────────────
Notwithstanding Asper InfoTech's security obligations, the Licensee remains
responsible for maintaining the security of:

(a) User login credentials — the Licensee must enforce strong password
policies and change passwords periodically;
(b) Physical access to terminals on which the Software is installed;
(c) The local network and Wi-Fi security at the Authorized Premises;
(d) Endpoint security, including antivirus and firewall protections,
on all devices running the Software.


═══════════════════════════════════════════════════════════════════════════════
PART XII — CLOUD INFRASTRUCTURE & DATABASE POLICY
═══════════════════════════════════════════════════════════════════════════════

12.1  CLOUD SERVICE DESCRIPTION
─────────────────────────────────
The Software leverages Supabase, an open-source Backend-as-a-Service (BaaS)
platform, for the following functions:

(a) Real-time database synchronization between the local installation
and the cloud backend;
(b) Secure cloud storage of all Business Data;
(c) User authentication and session management;
(d) Automated database backups;
(e) Remote access to reports and dashboards via authorized channels.

12.2  DATABASE SCHEMA OWNERSHIP
─────────────────────────────────
The database schema — including all table structures, relationships,
triggers, functions, and stored procedures — is the exclusive intellectual
property of Asper InfoTech. The Licensee shall not:

(a) Attempt to access or modify the database schema directly;
(b) Connect unauthorized third-party applications directly to the
database;
(c) Extract raw database dumps without prior written authorization
from Asper InfoTech.

12.3  DATA PORTABILITY
───────────────────────
Asper InfoTech shall provide the Licensee with the ability to export Business
Data in structured formats (e.g., CSV, PDF, or Excel) through the Software's
built-in reporting and export functions. This ensures the Licensee is not
locked in and retains access to their own data.

12.4  SERVICE AVAILABILITY TARGET
───────────────────────────────────
Asper InfoTech targets a Cloud Infrastructure availability of ninety-nine
percent (99%) measured on a monthly basis, excluding:

(a) Scheduled Maintenance windows (with advance notice);
(b) Force Majeure Events;
(c) Outages attributable to Supabase or its upstream providers;
(d) Outages caused by the Licensee's actions or by unauthorized access.

12.5  DATA BACKUP POLICY
──────────────────────────
Asper InfoTech maintains automated cloud backups of Business Data with the
following retention schedule:

• Daily backups: Retained for 7 days
• Weekly backups: Retained for 4 weeks
• Monthly backups: Retained for 3 months

In the event of a data loss incident caused by a proven Software defect,
Asper InfoTech will restore Business Data from the most recent available
backup. Restoration timelines depend on the volume of data and complexity
of the incident.


═══════════════════════════════════════════════════════════════════════════════
PART XIII — PAYMENT, SUBSCRIPTION & BILLING TERMS
═══════════════════════════════════════════════════════════════════════════════

13.1  LICENSE FEES
────────────────────
License Fees are as specified in the applicable quotation, purchase order, or
subscription plan agreed between Asper InfoTech and the Licensee. All fees are:

(a) Quoted in Pakistani Rupees (PKR) unless otherwise agreed;
(b) Exclusive of applicable taxes (including sales tax and withholding tax)
unless explicitly stated;
(c) Non-refundable once the Software has been activated, except as
provided in Section 13.5.

13.2  PAYMENT TERMS
────────────────────
(a) Payment is due in accordance with the payment schedule set out in
the purchase agreement;
(b) Invoices are due within fifteen (15) days of issuance unless
otherwise agreed;
(c) Late payment may result in suspension of Cloud Infrastructure access
until outstanding amounts are settled;
(d) Asper InfoTech reserves the right to charge a late payment surcharge
of two percent (2%) per month on overdue amounts.

13.3  SUBSCRIPTION RENEWAL
────────────────────────────
For subscription-based licenses:

(a) The subscription auto-renews at the end of each billing cycle unless
the Licensee provides written notice of cancellation at least fifteen
(15) days before the renewal date;
(b) Asper InfoTech will notify the Licensee of the upcoming renewal and
the applicable renewal fee at least thirty (30) days in advance;
(c) If a renewal payment is not received within ten (10) days of the
renewal date, Asper InfoTech may suspend access to Cloud features
pending payment.

13.4  PRICE ADJUSTMENTS
─────────────────────────
Asper InfoTech reserves the right to adjust License Fees with at least sixty
(60) days' advance notice for existing subscribers. Price adjustments will
not apply mid-term for annual subscribers; they will take effect from the
next renewal date.

13.5  REFUND POLICY
────────────────────
(a) License Fees are non-refundable once the Software has been activated
and the Licensee has begun entering Business Data.

(b) If the Software fails to function materially as described in the
Documentation, and Asper InfoTech is unable to resolve the issue
within a reasonable period, the Licensee may request a pro-rated
refund of the unused portion of a prepaid annual subscription.

(c) No refunds are issued for:
• Change of mind after activation
• Hardware incompatibility on the Licensee's side
• Discontinuation of business by the Licensee
• Failure to utilize the Software


═══════════════════════════════════════════════════════════════════════════════
PART XIV — WARRANTY DISCLAIMER
═══════════════════════════════════════════════════════════════════════════════

14.1  LIMITED WARRANTY
───────────────────────
Asper InfoTech warrants that:

(a) The Software, when used in accordance with this Agreement and the
Documentation, will perform materially as described for a period of
ninety (90) days from the Effective Date ("Warranty Period");

(b) Asper InfoTech has the right to grant the licenses set forth in
this Agreement.

14.2  WARRANTY REMEDY
──────────────────────
In the event of a breach of the warranty in Section 14.1(a) during the
Warranty Period, Asper InfoTech's sole obligation and the Licensee's exclusive
remedy shall be, at Asper InfoTech's election:

(a) To repair or replace the defective Software; or
(b) To refund the License Fee paid for the defective component.

14.3  DISCLAIMER OF WARRANTIES
──────────────────────────────
EXCEPT FOR THE LIMITED WARRANTY IN SECTION 14.1, THE SOFTWARE IS PROVIDED
"AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW,
ASPER INFOTECH EXPRESSLY DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED,
STATUTORY, OR OTHERWISE, INCLUDING:

(a) ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A
PARTICULAR PURPOSE;
(b) WARRANTIES OF UNINTERRUPTED OR ERROR-FREE OPERATION;
(c) WARRANTIES THAT THE SOFTWARE WILL MEET THE LICENSEE'S SPECIFIC
BUSINESS REQUIREMENTS;
(d) WARRANTIES RELATING TO THE ACCURACY OR COMPLETENESS OF INFORMATION
GENERATED BY THE SOFTWARE;
(e) WARRANTIES THAT DEFECTS WILL BE CORRECTED WITHIN ANY SPECIFIC
TIMEFRAME.

THE LICENSEE ASSUMES FULL RESPONSIBILITY FOR SELECTING THE SOFTWARE TO
ACHIEVE ITS INTENDED RESULTS AND FOR THE INSTALLATION, USE, AND RESULTS
OBTAINED FROM THE SOFTWARE.


═══════════════════════════════════════════════════════════════════════════════
PART XV — LIMITATION OF LIABILITY
═══════════════════════════════════════════════════════════════════════════════

15.1  CAP ON LIABILITY
───────────────────────
TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ASPER INFOTECH'S TOTAL
CUMULATIVE LIABILITY TO THE LICENSEE, ARISING OUT OF OR IN CONNECTION WITH
THIS AGREEMENT OR THE SOFTWARE — REGARDLESS OF THE FORM OF ACTION (CONTRACT,
TORT, NEGLIGENCE, OR OTHERWISE) — SHALL NOT EXCEED THE TOTAL LICENSE FEES
PAID BY THE LICENSEE TO ASPER INFOTECH IN THE TWELVE (12) MONTHS IMMEDIATELY
PRECEDING THE EVENT GIVING RISE TO THE CLAIM.

15.2  EXCLUSION OF CONSEQUENTIAL DAMAGES
─────────────────────────────────────────
IN NO EVENT SHALL ASPER INFOTECH BE LIABLE FOR:

(a) LOSS OF PROFITS, REVENUE, BUSINESS, OR GOODWILL;
(b) LOSS OF DATA OR DATA CORRUPTION (EXCEPT WHERE CAUSED BY PROVEN
GROSS NEGLIGENCE OF ASPER INFOTECH);
(c) INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES
OF ANY KIND;
(d) COSTS OF PROCUREMENT OF SUBSTITUTE SOFTWARE OR SERVICES;
(e) REGULATORY FINES, PENALTIES, OR SANCTIONS IMPOSED ON THE LICENSEE
DUE TO THE LICENSEE'S FAILURE TO COMPLY WITH APPLICABLE LAWS;
(f) FINANCIAL LOSSES ARISING FROM PRICING ERRORS, MANUAL OVERRIDES,
INCORRECT DISCOUNT CONFIGURATIONS, OR OTHER USER-INPUT MISTAKES;
(g) LOSSES ARISING FROM HARDWARE FAILURES, POWER OUTAGES, LOCAL
NETWORK FAILURES, OR INTERNET SERVICE DISRUPTIONS.

15.3  ESSENTIAL BASIS
──────────────────────
THE LIMITATIONS OF LIABILITY IN THIS PART XV REFLECT AN ALLOCATION OF RISK
BETWEEN ASPER INFOTECH AND THE LICENSEE AND FORM AN ESSENTIAL BASIS OF THE
BARGAIN BETWEEN THE PARTIES. ASPER INFOTECH WOULD NOT HAVE PROVIDED THE
SOFTWARE ON THE TERMS SET OUT IN THIS AGREEMENT WITHOUT THESE LIMITATIONS.


═══════════════════════════════════════════════════════════════════════════════
PART XVI — INDEMNIFICATION
═══════════════════════════════════════════════════════════════════════════════

16.1  LICENSEE INDEMNIFICATION
────────────────────────────────
The Licensee shall indemnify, defend, and hold harmless Asper InfoTech, its
directors, officers, employees, agents, and service providers from and against
any and all claims, demands, losses, liabilities, damages, fines, penalties,
costs, and expenses (including reasonable legal fees) arising out of or
relating to:

(a) The Licensee's breach of any provision of this Agreement;
(b) The Licensee's violation of any applicable law or regulation,
including pharmacy laws and DRAP regulations;
(c) Inaccurate data entry or misuse of the Software by the Licensee
or any Authorized User;
(d) Unauthorized use or distribution of the Software;
(e) Claims brought by third parties — including customers, patients,
suppliers, employees, or regulatory authorities — arising from the
Licensee's operation of its pharmacy or medical store;
(f) The Licensee's failure to maintain adequate physical and network
security at the Authorized Premises.

16.2  ASPER INFOTECH INDEMNIFICATION
──────────────────────────────────────
Asper InfoTech shall indemnify the Licensee against any third-party claim
alleging that the Software, as delivered by Asper InfoTech and used in
accordance with this Agreement, infringes a validly registered intellectual
property right in Pakistan. This indemnification shall not apply if the
alleged infringement arises from:

(a) Modification of the Software by the Licensee;
(b) Combination of the Software with third-party software not provided
by Asper InfoTech;
(c) Use of the Software in a manner not authorized by this Agreement.


═══════════════════════════════════════════════════════════════════════════════
PART XVII — PHARMACEUTICAL & REGULATORY COMPLIANCE
═══════════════════════════════════════════════════════════════════════════════

17.1  LICENSEE'S COMPLIANCE RESPONSIBILITY
────────────────────────────────────────────
The Software is provided as a business management tool. It is NOT a substitute
for professional pharmaceutical expertise or compliance advisory services.
The Licensee is solely and exclusively responsible for:

(a) Ensuring that the pharmacy or medical store is duly licensed under
applicable provincial health department regulations;

(b) Ensuring that all medicines and pharmaceutical products recorded in
the Software are procured from licensed wholesalers and manufacturers
as required by DRAP;

(c) Maintaining physically signed prescriptions for all Schedule H,
Schedule G, and narcotic substances as required by the Drugs Act,
1976, and subsequent DRAP regulations;

(d) Accurate maintenance of DRAP-mandated purchase and sale registers
for controlled substances, either within the Software or in parallel
physical registers;

(e) Ensuring that the recorded expiry dates and batch numbers of all
pharmaceutical products are accurate and are not misrepresented
in the system;

(f) Removing expired or DRAP-recalled products from both physical
inventory and Software records promptly;

(g) Complying with all provincial and federal price control notifications
issued by DRAP regarding Maximum Retail Prices (MRP) of medicines.

17.2  SOFTWARE AS A COMPLIANCE TOOL
──────────────────────────────────
The Software may include features designed to assist with regulatory
compliance, including:

(a) Expiry date tracking and near-expiry alerts;
(b) Batch number recording;
(c) Controlled substance registers.

The Licensee acknowledges that these features are provided as operational
aids only. The ultimate accuracy, completeness, and legal sufficiency of
compliance records is the sole responsibility of the Licensee and its
qualified pharmacist staff.

17.3  REGULATORY CHANGES
─────────────────────────
The pharmaceutical regulatory environment is subject to ongoing change.
Asper InfoTech shall endeavor to update the Software to accommodate major
regulatory changes issued by DRAP or relevant authorities. However, Asper
InfoTech makes no warranty that the Software will at all times be fully
compliant with every regulatory requirement applicable to the Licensee's
specific operations.


═══════════════════════════════════════════════════════════════════════════════
PART XVIII — TERMINATION OF AGREEMENT
═══════════════════════════════════════════════════════════════════════════════

18.1  TERMINATION BY LICENSEE
──────────────────────────────
The Licensee may terminate this Agreement by:

(a) Providing written notice to Asper InfoTech of intention to
discontinue use of the Software;
(b) Ceasing all use of the Software and destroying all local copies;
(c) Settling all outstanding License Fees owed to Asper InfoTech.

Termination by the Licensee does not entitle the Licensee to a refund of
any prepaid License Fees, except as provided in Section 13.5.

18.2  TERMINATION BY ASPER INFOTECH
────────────────────────────────────
Asper InfoTech may terminate this Agreement immediately upon written notice
in any of the following circumstances:

(a) The Licensee fails to pay any License Fee within fifteen (15) days
of the due date, and such failure is not cured within ten (10) days
of a written payment demand;

(b) The Licensee commits a material breach of any provision of this
Agreement and fails to remedy the breach within fifteen (15) days
of receiving written notice thereof;

(c) The Licensee becomes insolvent, is declared bankrupt, enters into
administration, or ceases to carry on business;

(d) The Licensee uses the Software for any illegal purpose;

(e) The Licensee engages in reverse engineering, unauthorized copying,
or distribution of the Software;

(f) The Licensee's pharmacy license is revoked, suspended, or lapses.

18.3  EFFECT OF TERMINATION
─────────────────────────────
Upon termination of this Agreement for any reason:

(a) All license rights granted to the Licensee shall immediately cease;
(b) The Licensee must cease all use of the Software and uninstall it
from all devices at the Authorized Premises;
(c) The Licensee's access to the Cloud Infrastructure will be disabled;
(d) Asper InfoTech will make Business Data available for export for a
period of thirty (30) days following termination, after which it
will be permanently deleted;
(e) Any accrued payment obligations of the Licensee shall survive
termination.

18.4  SURVIVAL
──────────────
The following provisions shall survive termination of this Agreement:
Part II (Definitions), Part V (Intellectual Property Rights), Part XIV
(Warranty Disclaimer), Part XV (Limitation of Liability), Part XVI
(Indemnification), Part XIX (Confidentiality), and Part XXI (Governing Law
& Dispute Resolution).


═══════════════════════════════════════════════════════════════════════════════
PART XIX — CONFIDENTIALITY
═══════════════════════════════════════════════════════════════════════════════

19.1  OBLIGATIONS OF CONFIDENTIALITY
──────────────────────────────────────
Each party agrees to:

(a) Keep confidential all Confidential Information received from the
other party;
(b) Use Confidential Information solely for the purposes of performing
obligations or exercising rights under this Agreement;
(c) Disclose Confidential Information only to its employees, contractors,
or advisors who have a genuine need to know and who are bound by
confidentiality obligations at least as protective as those in this
Agreement;
(d) Notify the other party promptly upon becoming aware of any
unauthorized disclosure or use of Confidential Information.

19.2  EXCLUSIONS
─────────────────
The confidentiality obligations in Section 19.1 shall not apply to information
that:

(a) Is or becomes publicly available through no fault of the receiving
party;
(b) Was known to the receiving party prior to disclosure;
(c) Is lawfully received from a third party without restriction;
(d) Is required to be disclosed by law, court order, or regulatory
authority — in which case the disclosing party shall provide as
much advance notice as practicable.

19.3  DURATION OF CONFIDENTIALITY
───────────────────────────────────
The obligations of confidentiality shall remain in effect for a period of
five (5) years following the termination or expiry of this Agreement.


═══════════════════════════════════════════════════════════════════════════════
PART XX — FORCE MAJEURE
═══════════════════════════════════════════════════════════════════════════════

20.1  FORCE MAJEURE EVENTS
───────────────────────────
Neither party shall be liable for any delay or failure in performance of its
obligations under this Agreement (other than payment obligations) to the
extent such failure is caused by a Force Majeure Event, including:

(a) Acts of God, earthquakes, floods, fires, storms, or other natural
disasters;
(b) Acts of war, terrorism, civil unrest, or government actions;
(c) National or regional internet blackouts or telecommunications
infrastructure failures;
(d) Actions of third-party service providers, including cloud
infrastructure providers, beyond Asper InfoTech's reasonable control;
(e) Epidemic, pandemic, or public health emergency declarations;
(f) Nationwide or regional power grid failures.

20.2  NOTIFICATION
────────────────────
The party affected by a Force Majeure Event shall:

(a) Notify the other party within five (5) business days of the
commencement of the Force Majeure Event;
(b) Use reasonable efforts to mitigate the impact of the Force Majeure
Event;
(c) Resume performance as soon as reasonably practicable following
the cessation of the Force Majeure Event.

20.3  EXTENDED FORCE MAJEURE
──────────────────────────────
If a Force Majeure Event continues for more than sixty (60) consecutive days,
either party may terminate this Agreement by providing thirty (30) days'
written notice, without liability, subject to the Licensee's right to export
Business Data as described in Section 18.3(d).


═══════════════════════════════════════════════════════════════════════════════
PART XXI — GOVERNING LAW & DISPUTE RESOLUTION
═══════════════════════════════════════════════════════════════════════════════

21.1  GOVERNING LAW
────────────────────
This Agreement shall be governed by and construed in accordance with the laws
of the Islamic Republic of Pakistan, without regard to its conflict of laws
principles.

21.2  INFORMAL DISPUTE RESOLUTION
───────────────────────────────────
In the event of any dispute, controversy, or claim arising out of or relating
to this Agreement ("Dispute"), the parties shall first attempt to resolve the
Dispute through good-faith negotiation. Either party may initiate the informal
resolution process by providing written notice of the Dispute to the other
party. The parties shall have thirty (30) days from the date of such notice
to resolve the Dispute informally.

21.3  ARBITRATION
──────────────────
If the Dispute is not resolved within the period specified in Section 21.2,
either party may refer the Dispute to binding arbitration in accordance with
the Arbitration Act, 1940 (Pakistan), as amended. The arbitration shall be:

(a) Conducted by a single arbitrator agreed upon by both parties, or
in the absence of agreement, appointed by the relevant authority;
(b) Conducted in the English language;
(c) Held at a location mutually agreed upon by the parties;
(d) Subject to the confidentiality obligations of this Agreement.

The arbitrator's award shall be final and binding, and judgment upon the
award may be entered in any court of competent jurisdiction.

21.4  INJUNCTIVE RELIEF
─────────────────────────
Notwithstanding the arbitration clause, either party may seek emergency
injunctive or other equitable relief from a court of competent jurisdiction
to prevent irreparable harm — particularly in cases of intellectual property
infringement, unauthorized Software distribution, or Data Breach.

21.5  JURISDICTION
────────────────────
Subject to the arbitration clause, both parties consent to the non-exclusive
jurisdiction of the courts of Pakistan for any matters that require judicial
intervention.


═══════════════════════════════════════════════════════════════════════════════
PART XXII — MISCELLANEOUS PROVISIONS
═══════════════════════════════════════════════════════════════════════════════

22.1  ENTIRE AGREEMENT
───────────────────────
This Agreement, together with any applicable purchase order, subscription
agreement, or Statement of Work, constitutes the entire agreement between
the parties with respect to the Software and supersedes all prior and
contemporaneous agreements, understandings, negotiations, and representations,
whether oral or written, relating to its subject matter.

22.2  AMENDMENTS
─────────────────
Asper InfoTech reserves the right to amend this Agreement from time to time.
Amendments will be communicated to the Licensee via in-app notification or
email at least thirty (30) days prior to taking effect. The Licensee's
continued use of the Software after the effective date of an amendment
constitutes acceptance of the amended terms. If the Licensee does not
agree to the amended terms, the Licensee may terminate this Agreement by
ceasing use of the Software and notifying Asper InfoTech in writing.

22.3  SEVERABILITY
────────────────────
If any provision of this Agreement is held to be illegal, invalid, or
unenforceable under applicable law, such provision shall be modified to
the minimum extent necessary to make it enforceable. The remaining
provisions of this Agreement shall remain in full force and effect.

22.4  WAIVER
──────────────
Failure by either party to enforce any provision of this Agreement shall not
constitute a waiver of that party's right to enforce such provision at any
future time, nor shall it constitute a waiver of any other provision.

22.5  ASSIGNMENT
─────────────────
The Licensee may not assign, transfer, or delegate any rights or obligations
under this Agreement to any third party without the prior written consent of
Asper InfoTech. Asper InfoTech may assign this Agreement or any rights
hereunder to an affiliate or successor entity without the Licensee's consent,
provided the assignee assumes all obligations under this Agreement.

22.6  NOTICES
──────────────
All notices, demands, or communications required or permitted under this
Agreement shall be in writing and delivered by:

(a) Email to the address provided by each party, with confirmation
of receipt; or
(b) Registered post or courier to the party's registered address.

Notices are effective upon confirmed receipt.

22.7  RELATIONSHIP OF PARTIES
───────────────────────────────
The relationship between the parties under this Agreement is that of
independent contractors. Nothing in this Agreement creates a partnership,
joint venture, employment, agency, or franchise relationship between the
parties.

22.8  LANGUAGE
──────────────
This Agreement is executed in the English language. In the event of any
conflict between this Agreement and a translated version, the English
language version shall prevail.

22.9  ELECTRONIC ACCEPTANCE
────────────────────────────
The parties agree that electronic acceptance of this Agreement (by clicking
"I Accept" within the Software) constitutes a valid and binding signature
for the purposes of this Agreement, with the same legal force as a handwritten
signature, in accordance with PECA and applicable electronic commerce laws
of Pakistan.


═══════════════════════════════════════════════════════════════════════════════
PART XXIII — CONTACT & NOTICE INFORMATION
═══════════════════════════════════════════════════════════════════════════════

LICENSOR:
┌─────────────────────────────────────────────────────────────────────────────
│  Asper InfoTech Private Limited
│  Enterprise Software Solutions & Digital Ecosystems
│  SECP Registered | PSEB Certified | Pakistan
│
│  Technical Support    :  support@asperinfotech.com
│  Legal & Compliance   :  legal@asperinfotech.com
│  General Inquiries    :  info@asperinfotech.com
│  Website              :  www.asperinfotech.com
└─────────────────────────────────────────────────────────────────────────────

For urgent technical issues relating to the Software or Cloud Infrastructure,
the Licensee should contact the appropriate support channel based on the
active support tier.


═══════════════════════════════════════════════════════════════════════════════
PART XXIV — SCHEDULE A: PERMITTED HARDWARE ENVIRONMENT
═══════════════════════════════════════════════════════════════════════════════

The following hardware environment is recommended for optimal performance
of Medical POS: Pharmacy Edition:

MINIMUM REQUIREMENTS:
Processor    : Intel Core i3 (7th Gen) or equivalent
RAM          : 4 GB DDR4
Storage      : 128 GB SSD (minimum 20 GB free)
Display      : 1366 × 768 resolution or higher
OS           : Windows 10 (64-bit) or later
Internet     : Broadband connection, minimum 5 Mbps

RECOMMENDED SPECIFICATIONS:
Processor    : Intel Core i5 (10th Gen) or equivalent
RAM          : 8 GB DDR4 or higher
Storage      : 256 GB SSD
Display      : 1920 × 1080 Full HD
OS           : Windows 10 / Windows 11 (64-bit)
Internet     : Broadband connection, minimum 10 Mbps

PERIPHERAL COMPATIBILITY:
Receipt Printer  : ESC/POS-compatible thermal printer (58mm or 80mm)
Barcode Scanner  : USB HID-compatible (1D / 2D)
Cash Drawer      : RJ11 interface, connected via receipt printer
Label Printer    : ZPL or EPL-compatible (optional)

Asper InfoTech does not warrant compatibility with hardware configurations
that deviate significantly from the above specifications.


═══════════════════════════════════════════════════════════════════════════════
PART XXV — SCHEDULE B: SERVICE LEVEL DEFINITIONS
═══════════════════════════════════════════════════════════════════════════════

ISSUE SEVERITY CLASSIFICATION:

SEV-1 — CRITICAL
┌─────────────────────────────────────────────────────────────────────┐
│ Definition : System is completely down; no transactions possible.  │
│ Response   : Within 4 business hours (Tier 3) / 24 hrs (Tier 1-2) │
│ Resolution : Best effort within 24–72 hours                        │
└─────────────────────────────────────────────────────────────────────┘

SEV-2 — HIGH
┌─────────────────────────────────────────────────────────────────────┐
│ Definition : Major feature non-functional; significant impact.     │
│ Response   : Within 1 business day                                 │
│ Resolution : Best effort within 3–5 business days                  │
└─────────────────────────────────────────────────────────────────────┘

SEV-3 — MEDIUM
┌─────────────────────────────────────────────────────────────────────┐
│ Definition : Minor feature issue; workaround exists.              │
│ Response   : Within 2–3 business days                              │
│ Resolution : Addressed in next Maintenance Release                 │
└─────────────────────────────────────────────────────────────────────┘

SEV-4 — LOW
┌─────────────────────────────────────────────────────────────────────┐
│ Definition : Cosmetic issue or enhancement request.                │
│ Response   : Within 5 business days                                │
│ Resolution : Considered for future Minor or Major Release          │
└─────────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════
PART XXVI — SCHEDULE C: EXCLUDED COMPONENTS
═══════════════════════════════════════════════════════════════════════════════

The following are explicitly NOT included in the standard license and must
be purchased or contracted separately:

(a) Custom module development or bespoke feature development;
(b) On-site installation or training visits by Asper InfoTech staff;
(c) Data migration from a previous POS or accounting system;
(d) Integration with third-party accounting software (e.g., QuickBooks,
Sage, or custom ERP systems);
(e) Custom report design or dashboard development;
(f) Hardware procurement (computers, printers, scanners, etc.);
(g) Network setup, local area network configuration, or Wi-Fi setup;
(h) DRAP compliance consulting or legal pharmacy advisory services;
(i) Printing of official DRAP registers in legally prescribed formats
(unless included in a specific product package);
(j) Multi-branch or enterprise network setup beyond the single-premises
license scope.


═══════════════════════════════════════════════════════════════════════════════
APPENDIX — ACKNOWLEDGEMENT & ACCEPTANCE CERTIFICATE
═══════════════════════════════════════════════════════════════════════════════

By installing, activating, or using Medical POS: Pharmacy Edition, the
Licensee acknowledges and certifies that:

☐  I have read and fully understood this End-User License Agreement
in its entirety.

☐  I accept and agree to be legally bound by all terms and conditions
set forth in this Agreement.

☐  I acknowledge that this Software is licensed — not sold — to me, and
that Asper InfoTech retains full intellectual property ownership.

☐  I acknowledge my responsibility for the accuracy of all data entered
into the Software and for compliance with applicable pharmacy laws.

☐  I acknowledge that Asper InfoTech is not liable for losses arising from
hardware failures, network outages, incorrect data entry, or user errors.

☐  I understand that my Business Data is stored in encrypted cloud
infrastructure and that Asper InfoTech will not sell or share this data.

☐  I accept the limitation of liability and indemnification provisions
as set out in Parts XV and XVI of this Agreement.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LICENSEE (AUTHORIZED SIGNATORY):

Business / Pharmacy Name  : ___________________________________________

Authorized Representative : ___________________________________________

Designation               : ___________________________________________

CNIC No.                  : ___________________________________________

Pharmacy License No.      : ___________________________________________

Date of Acceptance        : ___________________________________________

Signature                 : ___________________________________________


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LICENSOR (ASPER INFOTECH PRIVATE LIMITED):

Authorized Representative : ___________________________________________

Designation               : ___________________________________________

Date                      : ___________________________________________

Company Seal / Stamp      : [SEAL]


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
© 2026 ASPER INFOTECH PRIVATE LIMITED
ALL RIGHTS RESERVED | REGISTERED IN PAKISTAN
v1.0.2 Stable | Build #20260507 | Document Ref: AINF-EULA-MED-POS-2026-001
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

