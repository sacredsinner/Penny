import { Capacitor } from '@capacitor/core';
import { api } from './api';

export const isNative = Capacitor.isNativePlatform();

export const smsService = {
  isAvailable: () => isNative && Boolean(Capacitor.Plugins.SmsReader),

  readInbox: async (limit = 100) => {
    if (!smsService.isAvailable()) {
      throw new Error('Native SMS reader is only available when running as an Android APK.');
    }
    const result = await Capacitor.Plugins.SmsReader.readInboxSms({ limit });
    return result.messages || [];
  },

  syncSmsMessages: async (messages) => {
    // Send to backend API for rule-based parsing and persistent storage
    const token = localStorage.getItem('penny_token');
    const res = await fetch('/api/sms/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ messages })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sync SMS transactions');
    }
    return data;
  },

  listenForIncoming: (onMessage) => {
    if (!smsService.isAvailable()) return () => {};
    const listener = Capacitor.Plugins.SmsReader.addListener('smsReceived', onMessage);
    return () => {
      listener.remove();
    };
  }
};
