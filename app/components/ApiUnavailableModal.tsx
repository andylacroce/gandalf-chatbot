import React from "react";
import styles from "../components/styles/ChatPage.module.css";

interface ApiUnavailableModalProps {
  show: boolean;
}

const ApiUnavailableModal: React.FC<ApiUnavailableModalProps> = ({ show }) => {
  if (!show) return null;
  return (
    <div className={styles.modalBackdrop} data-testid="modal-backdrop">
      <div className={styles.modalError} role="alert" data-testid="api-error-message">
        <span className={styles.apiErrorTitle}>
          Gandalf has vanished from the White Council.
        </span>
        <span className={styles.apiErrorDesc}>
          The Grey Pilgrim is away, perhaps consulting with Elrond or lost in thought atop Orthanc. The chat must wait for his return. Try again soon, for even the smallest hope can bring him back!
        </span>
      </div>
    </div>
  );
};

export default ApiUnavailableModal;
