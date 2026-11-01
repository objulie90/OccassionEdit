import React, { useState, useEffect } from 'react';
import { LEGAL_DOCUMENTS } from '../data/legalDocuments.js';

/**
 * Clean Multi-Document Legal Modal with Dynamic Studio Hydration
 */
export function LegalDocumentsModal({ isOpen, onClose, initialDocId = 'terms-and-conditions', studioSettings = {} }) {
  const [activeDocId, setActiveDocId] = useState(initialDocId);

  useEffect(() => {
    if (initialDocId) setActiveDocId(initialDocId);
  }, [initialDocId]);

  if (!isOpen) return null;

  const currentDoc = LEGAL_DOCUMENTS.find(d => d.id === activeDocId) || LEGAL_DOCUMENTS[0];

  // Dynamic Studio Hydration (replaces placeholders with Laura's live studio settings)
  const hydrateText = (text) => {
    if (!text) return '';
    return text
      .replace(/\[INSERT ADDRESS\]/g, studioSettings.studioAddress || 'Bottesford, Leicestershire, NG13')
      .replace(/\[INSERT EMAIL\]/g, studioSettings.studioEmail || 'hello@theoccasionedit.co.uk')
      .replace(/\[INSERT PRIVACY EMAIL\]/g, studioSettings.studioEmail || 'hello@theoccasionedit.co.uk')
      .replace(/\[INSERT PHONE\]/g, studioSettings.studioPhone || '07498 223594')
      .replace(/\[INSERT LEGAL NAME\]/g, studioSettings.businessTradingName || 'THE Occasion Edit')
      .replace(/\[INSERT WEBSITE ADDRESS\]/g, 'theoccasionedit.co.uk')
      .replace(/\[INSERT DATE\]/g, '1 November 2026');
  };

  return (
    <div className="oe-legal-modal-backdrop" onClick={onClose}>
      <div className="oe-legal-modal-panel" onClick={e => e.stopPropagation()}>
        <div className="oe-legal-modal-header">
          <div>
            <span className="oe-dock-col-label">LEGAL &amp; COMPLIANCE</span>
            <h3 style={{ margin: '0.2rem 0', fontSize: '1.25rem', fontFamily: 'Cormorant Garamond, serif', color: '#1C1E1B' }}>
              THE Occasion Edit — Client Agreements &amp; Policies
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="oe-mini-admin-btn"
              title="Print document"
            >
              🖨️ Print
            </button>
            <button type="button" onClick={onClose} className="oe-master-close-pill">
              ✕ Close
            </button>
          </div>
        </div>

        {/* Legal Document Navigation Tabs */}
        <div className="oe-legal-tabs-bar" role="tablist">
          {LEGAL_DOCUMENTS.map(doc => (
            <button
              key={doc.id}
              type="button"
              role="tab"
              aria-selected={activeDocId === doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`oe-legal-tab-btn ${activeDocId === doc.id ? 'active' : ''}`}
            >
              {doc.title}
            </button>
          ))}
        </div>

        {/* Document Content Body */}
        <div className="oe-legal-document-body">
          <div className="oe-legal-doc-banner">
            <div>
              <h2 className="oe-legal-doc-title">{currentDoc.title}</h2>
              <p className="oe-legal-doc-sub">{currentDoc.subtitle}</p>
            </div>
            <span className="oe-legal-doc-badge">{currentDoc.badge} · v{currentDoc.version}</span>
          </div>

          <div className="oe-legal-paragraphs-container">
            {currentDoc.paragraphs.map((para, pIdx) => {
              const hydrated = hydrateText(para);
              const isNumberedHeading = /^\d+\.\s+[A-Z]/.test(hydrated) || /^[A-Z]\.\s+[A-Z]/.test(hydrated);
              const isMainTitle = pIdx === 0 || pIdx === 1;

              if (isMainTitle) {
                return (
                  <h4 key={pIdx} className="oe-legal-heading-main">
                    {hydrated}
                  </h4>
                );
              }
              if (isNumberedHeading) {
                return (
                  <h3 key={pIdx} className="oe-legal-heading-section">
                    {hydrated}
                  </h3>
                );
              }
              return (
                <p key={pIdx} className="oe-legal-paragraph">
                  {hydrated}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
