import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_DELIVERY_CONFIG } from '../data/catalogData.js';
import { OrdersTab } from './OrdersTab';
import { CalendarTab } from './CalendarTab';
import { InventoryTab } from './InventoryTab';
import { BundlesTab } from './BundlesTab';
import { DeliverySettings } from './DeliverySettings';
import { saleState } from '../lib/sale';
import { BusinessDetailsTab } from './BusinessDetailsTab';
import { PaperworkTab } from './PaperworkTab';
import { statusInfo } from './studioFormat';
import { StaffSwitch } from './StaffSwitch';
import './studio.css';

// Daily jobs first; on a phone the last three sit under "More"
const TABS = [
  { id: 'orders', label: 'Orders' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'bundles', label: 'Bundles', more: true },
  { id: 'paperwork', label: 'Paperwork', more: true },
  { id: 'business', label: 'Settings', more: true }
];

export function MasterOrdersDashboard({
  isOpen,
  onClose,
  staffMode = 'studio',
  onStaffModeChange,
  onLogOut,
  quotes = [],
  onUpdateOrder,
  onAddBooking,
  onDeleteQuote,
  catalog = [],
  steps = [],
  digitOptions = [],
  balloonColours = [],
  curatedPalettes = [],
  onSaveCuratedPalettes,
  onSaveInventoryItem,
  onAddInventoryItem,
  onRemoveInventoryItem,
  onRestoreInventory,
  inspirationSlides = [],
  onSaveBundles,
  sale = null,
  onSaveSale,
  onSaveDeliveryConfig,
  onSaveColours,
  onUploadPhoto,
  deliveryConfig = INITIAL_DELIVERY_CONFIG,
  studioSettings = {},
  onSaveStudioSettings,
  onFetchDriveLinks,
  flashToast
}) {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const needsReply = useMemo(
    () => quotes.filter(q => statusInfo(q.status).tone === 'new').length,
    [quotes]
  );

  if (!isOpen) return null;

  const openOrder = (id) => {
    setSelectedOrderId(id);
    setActiveTab('orders');
  };

  return (
    <div className="st-root" role="dialog" aria-modal="true" aria-label="Studio">
      <header className="st-topbar">
        <div className="st-topbar-row">
          {onStaffModeChange
            ? <StaffSwitch mode={staffMode} onChange={onStaffModeChange} />
            : <h2 className="st-wordmark">Studio</h2>}
          {onLogOut
            ? <button type="button" className="st-close st-logout" onClick={onLogOut}>Log out</button>
            : <button type="button" className="st-close" onClick={onClose}>Close</button>}
        </div>
        <nav className="st-tabs" aria-label="Studio sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`st-tab ${tab.more ? 'is-more' : ''}`}
              onClick={() => { setActiveTab(tab.id); setMoreOpen(false); }}
            >
              {tab.label}
              {tab.id === 'orders' && needsReply > 0 && (
                <span className="st-tab-count" aria-label={`${needsReply} need a reply`}>{needsReply}</span>
              )}
            </button>
          ))}
          <button
            type="button"
            className={`st-tab st-tab-more ${moreOpen ? 'is-open' : ''}`}
            aria-expanded={moreOpen}
            aria-current={TABS.find(t => t.id === activeTab)?.more ? 'page' : undefined}
            onClick={() => setMoreOpen(!moreOpen)}
          >
            More
          </button>
        </nav>
        {moreOpen && (
          <div className="st-more-sheet" role="menu" aria-label="More sections">
            {TABS.filter(t => t.more).map(tab => (
              <button key={tab.id} type="button" role="menuitem" className="st-more-item" onClick={() => { setActiveTab(tab.id); setMoreOpen(false); }}>
                {tab.label}
              </button>
            ))}
            {onLogOut && (
              <button type="button" role="menuitem" className="st-more-item st-more-logout" onClick={onLogOut}>Log out</button>
            )}
          </div>
        )}
      </header>

      <main className="st-body">
        {activeTab === 'orders' && (
          <OrdersTab
            quotes={quotes}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onUpdateOrder={onUpdateOrder}
            onAddBooking={onAddBooking}
            onDeleteQuote={onDeleteQuote}
            studioSettings={studioSettings}
            steps={steps}
            digitOptions={digitOptions}
            balloonColours={balloonColours}
            deliveryConfig={deliveryConfig}
            flashToast={flashToast}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab
            quotes={quotes}
            onSelectOrder={openOrder}
            steps={steps}
            studioSettings={studioSettings}
            onSaveStudioSettings={onSaveStudioSettings}
            onAddBooking={onAddBooking}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab
            steps={steps}
            digitOptions={digitOptions}
            catalog={catalog}
            quotes={quotes}
            balloonColours={balloonColours}
            curatedPalettes={curatedPalettes}
            inspirationSlides={inspirationSlides}
            studioSettings={studioSettings}
            sale={sale}
            saleLive={saleState(sale) === 'live'}
            onSaveInventoryItem={onSaveInventoryItem}
            onAddInventoryItem={onAddInventoryItem}
            onRemoveInventoryItem={onRemoveInventoryItem}
            onRestoreInventory={onRestoreInventory}
            onSaveStudioSettings={onSaveStudioSettings}
            onSaveColours={onSaveColours}
            onSaveCuratedPalettes={onSaveCuratedPalettes}
            onSaveSale={onSaveSale}
            onUploadPhoto={onUploadPhoto}
          />
        )}
        {activeTab === 'bundles' && (
          <BundlesTab
            inspirationSlides={inspirationSlides}
            steps={steps}
            digitOptions={digitOptions}
            balloonColours={balloonColours}
            curatedPalettes={curatedPalettes}
            onSaveBundles={onSaveBundles}
            onUploadPhoto={onUploadPhoto}
          />
        )}
        {activeTab === 'paperwork' && (
          <PaperworkTab
            quotes={quotes}
            studioSettings={studioSettings}
            onSaveStudioSettings={onSaveStudioSettings}
            onFetchDriveLinks={onFetchDriveLinks}
          />
        )}
        {activeTab === 'business' && (
          <>
            <BusinessDetailsTab studioSettings={studioSettings} onSave={onSaveStudioSettings} />
            {onSaveDeliveryConfig && <DeliverySettings deliveryConfig={deliveryConfig} onSave={onSaveDeliveryConfig} />}
          </>
        )}
      </main>
    </div>
  );
}
