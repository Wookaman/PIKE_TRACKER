import { create } from 'zustand';
import {
  AccountRecord,
  hasAccount,
  isSignedIn,
  loadAccount,
  saveAccount,
  setSignedIn,
} from '../auth/account';
import { hashSecret, makeSalt } from '../auth/crypto';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

const norm = (s: string) => s.trim().toLowerCase();

interface AuthState {
  status: AuthStatus;
  accountExists: boolean;
  refresh: () => Promise<void>;
  signUp: (
    username: string,
    password: string,
    securityQuestion: string,
    securityAnswer: string,
  ) => Promise<void>;
  logIn: (username: string, password: string) => Promise<boolean>;
  resetPassword: (answer: string, newPassword: string) => Promise<boolean>;
  logOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  accountExists: false,

  refresh: async () => {
    const exists = await hasAccount();
    const signed = exists && (await isSignedIn());
    set({ accountExists: exists, status: signed ? 'signedIn' : 'signedOut' });
  },

  signUp: async (username, password, securityQuestion, securityAnswer) => {
    const salt = await makeSalt();
    const record: AccountRecord = {
      username: username.trim(),
      salt,
      passwordHash: await hashSecret(password, salt),
      securityQuestion: securityQuestion.trim(),
      securityAnswerHash: await hashSecret(norm(securityAnswer), salt),
    };
    await saveAccount(record);
    await setSignedIn(true);
    set({ accountExists: true, status: 'signedIn' });
  },

  logIn: async (username, password) => {
    const acc = await loadAccount();
    if (!acc) return false;
    const ok =
      acc.username.toLowerCase() === norm(username) &&
      (await hashSecret(password, acc.salt)) === acc.passwordHash;
    if (!ok) return false;
    await setSignedIn(true);
    set({ status: 'signedIn' });
    return true;
  },

  resetPassword: async (answer, newPassword) => {
    const acc = await loadAccount();
    if (!acc) return false;
    if ((await hashSecret(norm(answer), acc.salt)) !== acc.securityAnswerHash) return false;
    await saveAccount({ ...acc, passwordHash: await hashSecret(newPassword, acc.salt) });
    await setSignedIn(true);
    set({ status: 'signedIn' });
    return true;
  },

  logOut: async () => {
    await setSignedIn(false);
    set({ status: 'signedOut' });
  },
}));
