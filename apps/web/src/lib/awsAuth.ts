"use client";

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

export interface AuthAccount {
  userId: string;
  email?: string;
}

let configured = false;

export function configureAwsAuth() {
  const region = process.env.NEXT_PUBLIC_AWS_REGION;
  const userPoolId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID;
  const userPoolClientId = process.env.NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID;

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
