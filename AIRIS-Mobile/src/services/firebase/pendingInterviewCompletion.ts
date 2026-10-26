import AsyncStorage from '@react-native-async-storage/async-storage';

const prefix = (uid: string) => `airis:pending-interview-completion:${encodeURIComponent(uid)}:`;

export async function rememberInterviewCompletion(uid: string, sessionId: string): Promise<void> {
  if (!uid || !/^[a-f0-9]{32}$/.test(sessionId)) throw new Error('A signed-in interview session is required.');
  await AsyncStorage.setItem(prefix(uid) + sessionId, 'pending');
}

export async function pendingInterviewCompletion(uid: string): Promise<string | null> {
  if (!uid) return null;
  const ownerPrefix = prefix(uid);
  const keys = await AsyncStorage.getAllKeys();
  const key = keys.find(key => key.startsWith(ownerPrefix) && /^[a-f0-9]{32}$/.test(key.slice(ownerPrefix.length)));
  return key ? key.slice(ownerPrefix.length) : null;
}

export async function forgetInterviewCompletion(uid: string, sessionId: string): Promise<void> {
  if (uid && /^[a-f0-9]{32}$/.test(sessionId)) await AsyncStorage.removeItem(prefix(uid) + sessionId);
}
