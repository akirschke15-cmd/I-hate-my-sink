import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getConflicts, removeConflict, addPendingSync, generateLocalId } from '../lib/offline-store';
import type { Conflict } from '@ihms/shared';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}

export function ConflictResolutionModal({ isOpen, onClose, onResolved }: ConflictResolutionModalProps) {
  const [conflicts, setConflicts] = useState<Conflict<any>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConflicts();
    }
  }, [isOpen]);

  const loadConflicts = async () => {
    const allConflicts = await getConflicts();
    setConflicts(allConflicts);
    setCurrentIndex(0);
  };

  const currentConflict = conflicts[currentIndex];

  const handleResolve = async (resolution: 'keep_local' | 'keep_server') => {
    if (!currentConflict) return;

    setResolving(true);
    try {
      const dataToSync = resolution === 'keep_local' ? currentConflict.localData : currentConflict.serverData;

      // Add resolved data back to sync queue with updated version
      await addPendingSync({
        id: generateLocalId(),
        type: 'update',
        entity: currentConflict.type,
        data: {
          ...dataToSync,
          version: currentConflict.serverData?.version, // Use server version to avoid conflict
        },
        createdAt: new Date(),
      });

      // Remove conflict
      await removeConflict(currentConflict.id);

      // Move to next conflict or close
      if (currentIndex < conflicts.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onResolved();
        onClose();
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setResolving(false);
    }
  };

  const renderField = (label: string, value: any) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div key={label} className="mb-2">
          <div className="text-sm font-medium text-neutral-700">{label}:</div>
          <div className="ml-4">
            {Object.entries(value).map(([key, val]) => renderField(key, val))}
          </div>
        </div>
      );
    }
    return (
      <div key={label} className="mb-2">
        <span className="text-sm font-medium text-neutral-700">{label}: </span>
        <span className="text-sm text-neutral-900">{String(value)}</span>
      </div>
    );
  };

  const renderData = (data: any) => {
    if (!data) return <div className="text-sm text-neutral-500">No data</div>;

    const fieldsToShow = Object.entries(data).filter(
      ([key]) => !['id', 'companyId', 'createdAt', 'updatedAt', 'syncedAt', 'localId', 'version'].includes(key)
    );

    return (
      <div className="space-y-1">
        {fieldsToShow.map(([key, value]) => renderField(key, value))}
      </div>
    );
  };

  if (!isOpen || conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              Sync Conflict Detected ({currentIndex + 1} of {conflicts.length})
            </h2>
            <p className="text-sm text-neutral-600 mt-1">
              This {currentConflict?.type} was modified by another user while you were offline.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Local Changes */}
            <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Your Changes
              </h3>
              <div className="text-sm">
                {renderData(currentConflict?.localData)}
              </div>
            </div>

            {/* Server Changes */}
            <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Server Changes
              </h3>
              <div className="text-sm">
                {renderData(currentConflict?.serverData)}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-neutral-200 p-6 bg-neutral-50">
          <p className="text-sm text-neutral-600 mb-4">
            Choose which version to keep. Your choice will be synced to the server.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleResolve('keep_local')}
              disabled={resolving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Keep My Changes
            </button>
            <button
              onClick={() => handleResolve('keep_server')}
              disabled={resolving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Keep Server Changes
            </button>
            <button
              onClick={onClose}
              disabled={resolving}
              className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Resolve Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
