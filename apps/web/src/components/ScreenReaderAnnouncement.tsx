import { useEffect, useRef } from 'react';

/**
 * Screen Reader Announcement Component
 * Provides aria-live regions for dynamic content announcements
 * Meets WCAG 2.1 Level A success criterion 4.1.3 (Status Messages)
 */

interface ScreenReaderAnnouncementProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearAfter?: number;
}

export function ScreenReaderAnnouncement({
  message,
  politeness = 'polite',
  clearAfter = 5000,
}: ScreenReaderAnnouncementProps) {
  const announcementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clearAfter && message) {
      const timer = setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, clearAfter);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, clearAfter]);

  if (!message) return null;

  return (
    <div
      ref={announcementRef}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Hook for announcing messages to screen readers
 */
export function useScreenReaderAnnouncement() {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcement div if it doesn't exist
    if (!announcementRef.current) {
      const div = document.createElement('div');
      div.setAttribute('role', 'status');
      div.setAttribute('aria-live', 'polite');
      div.setAttribute('aria-atomic', 'true');
      div.className = 'sr-only';
      document.body.appendChild(div);
      announcementRef.current = div;
    }

    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
        announcementRef.current = null;
      }
    };
  }, []);

  const announce = (message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;

      // Clear after 5 seconds
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 5000);
    }
  };

  return announce;
}
