/**
 * useModalManager.ts
 * Enterprise custom hook for UI modal states, contact search modals, and route navigation.
 * Commandment #2: Separate business logic from UI components.
 * Commandment #8: Proper state management.
 */
import { useCallback, useState } from 'react';
import { useUIStore } from '../stores';

export function useModalManager() {
  const uiStore = useUIStore();

  const [showContactSelectModal, setShowContactSelectModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const resetNewContactForm = useCallback(() => {
    setNewContactName('');
    setNewContactPhone('');
    setShowNewContactModal(false);
  }, []);

  const closeContactSelectModal = useCallback(() => {
    setShowContactSelectModal(false);
    setContactSearchQuery('');
  }, []);

  return {
    ...uiStore,
    showContactSelectModal,
    setShowContactSelectModal,
    showNewContactModal,
    setShowNewContactModal,
    contactSearchQuery,
    setContactSearchQuery,
    newContactName,
    setNewContactName,
    newContactPhone,
    setNewContactPhone,
    resetNewContactForm,
    closeContactSelectModal,
  };
}
