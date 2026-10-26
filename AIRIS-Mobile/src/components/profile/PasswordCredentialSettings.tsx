import React from 'react';
import { Text } from '../ui/AppText';

export function PasswordCredentialSettings({ providers, children }: {
  providers?: readonly { providerId: string }[];
  children: React.ReactNode;
}) {
  if (providers?.some(provider => provider.providerId === 'password')) return <>{children}</>;
  return <Text className="text-sm text-[#4F6B82] leading-6">
    {providers?.some(provider => provider.providerId === 'google.com')
      ? 'You sign in with Google. Manage your Google password in your Google account. AIRIS does not need your Google password.'
      : 'Password settings are unavailable for this sign-in method.'}
  </Text>;
}
