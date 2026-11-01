import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_DELIVERY_CONFIG } from '../data/catalogData.js';
import { OrdersTab } from './OrdersTab';
import { CalendarTab } from './CalendarTab';
import { ProductsTab, ColoursTab } from './CatalogueTabs';
import { BusinessDetailsTab } from './BusinessDetailsTab';
import { PaperworkTab } from './PaperworkTab';
import { statusInfo } from './studioFormat';
import './studio.css';

const TABS = [
  { id: 'orders', label: 'Orders' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'products', label: 'Products' },
  { id: 'colours', label: 'Colours' },
  { id: 'paperwork', label: 'Paperwork' },
  { id: 'business', label: 'Business details' }
];

export function MasterOrdersDashboard({
  isOpen,
  onClose,
  quotes = [],
  onUpdateQuoteStatus,
  onDeleteQuote,
  catalog = [],
  steps = [],
  digitOptions = [],
  balloonColours = [],
  curatedPalettes = [],
  onSaveCuratedPalettes,
  onSaveHireCounts,
  onSaveProduct,
  onUploadPhoto,
  deliveryConfig = INITIAL_DELIVERY_CONFIG,
  studioSettings = {},
  onSaveStudioSettings,
  onFetchDriveLinks,
  flashToast
}) {
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

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
        <h2 className="st-wordmark">Studio</h2>
        <nav className="st-tabs" role="tablist" aria-label="Studio sections">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className="st-tab"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'orders' && needsReply > 0 && (
                <span className="st-tab-count" aria-label={`${needsReply} need a reply`}>{needsReply}</span>
              )}
            </button>
          ))}
        </nav>
        <button type="button" className="st-close" onClick={onClose}>Close</button>
      </header>

      <main className="st-body">
        {activeTab === 'orders' && (
          <OrdersTab
            quotes={quotes}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onUpdateQuoteStatus={onUpdateQuoteStatus}
            onDeleteQuote={onDeleteQuote}
            steps={steps}
            digitOptions={digitOptions}
            balloonColours={balloonColours}
            deliveryConfig={deliveryConfig}
            flashToast={flashToast}
          />
        )}
        {activeTab === 'calendar' && <CalendarTab quotes={quotes} onSelectOrder={openOrder} />}
        {activeTab === 'products' && <ProductsTab catalog={catalog} steps={steps} digitOptions={digitOptions} onSaveHireCounts={onSaveHireCounts} onSaveProduct={onSaveProduct} onUploadPhoto={onUploadPhoto} />}
        {activeTab === 'colours' && (
          <ColoursTab
            balloonColours={balloonColours}
            curatedPalettes={curatedPalettes}
            onSaveCuratedPalettes={onSaveCuratedPalettes}
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
          <BusinessDetailsTab studioSettings={studioSettings} onSave={onSaveStudioSettings} />
        )}
      </main>
    </div>
  );
}
