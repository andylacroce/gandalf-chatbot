import React from "react";

interface ApiUnavailableModalProps {
  show: boolean;
}

const ApiUnavailableModal: React.FC<ApiUnavailableModalProps> = ({ show }) => {
  if (!show) return null;
  return (
    <div className="modal-backdrop" data-testid="modal-backdrop">
      <div className="modal-error" role="alert" data-testid="api-error-message">
        <span className="api-error-title" style={{ color: "var(--color-text)" }}>
          Gandalf is resting his eyes.
        </span>
        <span className="api-error-desc">
          The chat is asleep for now. Please return soon!
        </span>
      </div>
    </div>
  );
};

export default ApiUnavailableModal;
