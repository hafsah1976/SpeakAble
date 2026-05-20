import "react-native-get-random-values";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Amplify, type ResourcesConfig } from "aws-amplify";
import {
  confirmSignUp,
  fetchAuthSession,
  fetchUserAttributes,
  getCurrentUser,
  signIn,
  signOut,
  signUp
} from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import type { KeyValueStorageInterface } from "aws-amplify/utils";

export interface AuthAccount {
  userId: string;
  email?: string;
}

let configured = false;

const secureStoreIndexKey = "speakable.amplify.secure-store.keys";

class ExpoSecureTokenStorage implements KeyValueStorageInterface {
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
    await this.rememberKey(key);
  }

  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
    const keys = await this.keys();
    await AsyncStorage.setItem(
      secureStoreIndexKey,
      JSON.stringify(keys.filter((storedKey) => storedKey !== key))
    );
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
    await AsyncStorage.removeItem(secureStoreIndexKey);
  }

  private async rememberKey(key: string): Promise<void> {
    const keys = await this.keys();
    if (keys.includes(key)) {
      return;
    }
    await AsyncStorage.setItem(secureStoreIndexKey, JSON.stringify([...keys, key]));
  }

  private async keys(): Promise<string[]> {
    const value = await AsyncStorage.getItem(secureStoreIndexKey);
    if (!value) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
}

export function configureAwsAuth() {
  const region = process.env.EXPO_PUBLIC_AWS_REGION;
  const userPoolId = process.env.EXPO_PUBLIC_AWS_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.EXPO_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID;

  if (!region || !userPoolId || !userPoolClientId) {
    return false;
  }

  if (!configured) {
    const config: ResourcesConfig = {
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          loginWith: { email: true },
          signUpVerificationMethod: "code",
          userAttributes: {
            email: { required: true }
          },
          passwordFormat: {
            minLength: 8,
            requireLowercase: true,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialCharacters: false
          }
        }
      }
    };

    Amplify.configure(config);
    cognitoUserPoolsTokenProvider.setKeyValueStorage(new ExpoSecureTokenStorage());
    configured = true;
  }

  return true;
}

export async function getCurrentAwsAccount(): Promise<AuthAccount | null> {
  if (!configureAwsAuth()) {
    return null;
  }

  try {
    const user = await getCurrentUser();
    const attributes = await fetchUserAttributes();
    return {
      userId: user.userId,
      email: attributes.email
    };
  } catch {
    return null;
  }
}

export async function getAwsAccessToken() {
  if (!configureAwsAuth()) {
    return undefined;
  }

  const session = await fetchAuthSession();
  return session.tokens?.accessToken?.toString();
}

export async function signInWithEmail(email: string, password: string) {
  configureAwsAuth();
  return signIn({ username: email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  configureAwsAuth();
  return signUp({
    username: email,
    password,
    options: {
      userAttributes: { email }
    }
  });
}

export async function confirmEmailSignUp(email: string, code: string) {
  configureAwsAuth();
  return confirmSignUp({ username: email, confirmationCode: code });
}

export async function signOutAws() {
  if (!configureAwsAuth()) {
    return;
  }

  await signOut();
}
