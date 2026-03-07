import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase } from '../database/database';
import React from 'react';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
